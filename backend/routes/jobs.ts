// routes/jobs.ts
import express from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';

import { NotificationJob } from '../schema/jobs.ts';
import { NOTIFICATION_STATUSES } from '../constants/enums.ts';
import { authenticateStaff, requireRole } from './auth.ts';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AuthRequest extends Request {
  staff?: mongoose.Document & {
    _id: mongoose.Types.ObjectId;
    role: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jobs — paginated list of notification jobs
// ─────────────────────────────────────────────────────────────────────────────
//
// Query: ?status=queued&orderId=...&channel=sms&page=1&limit=50

router.get(
  '/jobs',
  authenticateStaff,
  requireRole('supervisor', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(String(req.query.limit || '50'), 10))
      );

      const filter: Record<string, unknown> = {};
      
      if (req.query.status) {
        if (!NOTIFICATION_STATUSES.includes(String(req.query.status) as any)) {
          return res.status(400).json({
            error: `status must be one of: ${NOTIFICATION_STATUSES.join(', ')}`,
          });
        }
        filter.status = req.query.status;
      }
      
      if (req.query.channel) filter.channel = req.query.channel;
      
      if (req.query.orderId && mongoose.isValidObjectId(req.query.orderId)) {
        filter.orderId = req.query.orderId;
      }

      const [jobs, total] = await Promise.all([
        NotificationJob.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        NotificationJob.countDocuments(filter),
      ]);

      return res.json({
        jobs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('[GET /jobs]', err);
      return res.status(500).json({ error: 'Failed to list jobs' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jobs/stats — queue health
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/jobs/stats',
  authenticateStaff,
  requireRole('supervisor', 'admin'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const byStatus = await NotificationJob.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const stuck = await NotificationJob.countDocuments({
        status: 'processing',
        lockedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }, // 5 min
      });

      return res.json({
        byStatus: byStatus.reduce(
          (acc, row) => ({ ...acc, [row._id]: row.count }),
          {} as Record<string, number>
        ),
        stuck,
      });
    } catch (err) {
      console.error('[GET /jobs/stats]', err);
      return res.status(500).json({ error: 'Failed to load stats' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/:id/retry — reset a failed job to queued
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/jobs/:id/retry',
  authenticateStaff,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid job id' });
      }

      const job = await NotificationJob.findById(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (job.status === 'sent') {
        return res.status(400).json({ error: 'Job already sent' });
      }

      job.status = 'queued';
      job.attempts = 0;
      job.lockedAt = null;
      job.availableAt = new Date();
      job.lastError = undefined; // or null depending on your schema
      await job.save();

      return res.json({ job });
    } catch (err) {
      console.error('[POST /jobs/:id/retry]', err);
      return res.status(500).json({ error: 'Failed to retry job' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/jobs/:id/cancel',
  authenticateStaff,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid job id' });
      }

      const job = await NotificationJob.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'cancelled' } },
        { new: true }
      );

      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json({ job });
    } catch (err) {
      console.error('[POST /jobs/:id/cancel]', err);
      return res.status(500).json({ error: 'Failed to cancel job' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/requeue-stuck — admin bulk action: reset stuck jobs
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/jobs/requeue-stuck',
  authenticateStaff,
  requireRole('admin'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000);
      
      const result = await NotificationJob.updateMany(
        { status: 'processing', lockedAt: { $lt: cutoff } },
        {
          $set: {
            status: 'queued',
            lockedAt: null,
            availableAt: new Date(),
          },
        }
      );
      
      return res.json({ requeued: result.modifiedCount });
    } catch (err) {
      console.error('[POST /jobs/requeue-stuck]', err);
      return res.status(500).json({ error: 'Failed to requeue stuck jobs' });
    }
  }
);

export default router;