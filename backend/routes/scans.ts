// routes/scans.ts
import express from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';

import { Participant } from '../schema/participants.ts';
import { Device } from '../schema/scans.ts';
import { ScanEvent } from '../schema/scans.ts';
import { BookletStock } from '../schema/scans.ts';
import { SCAN_TYPES, SCAN_RESULTS } from '../constants/enums.ts';

// Import shared middleware from auth.ts
import { authenticateStaff, requireRole } from './auth.ts';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ScanType   = (typeof SCAN_TYPES)[number];
type ScanResult = (typeof SCAN_RESULTS)[number];

interface AuthRequest extends Request {
  staff?: mongoose.Document & {
    _id: mongoose.Types.ObjectId;
    role: string;
    isActive: boolean;
  };
}

interface ScanSubmitBody {
  qrToken: string;
  scanType: ScanType;
  standId: string;
  clientTimestamp: string | Date;
  idempotencyKey: string;
  deviceFingerprint?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function hashQrToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Translate the outcome of a participant state transition into the SCAN_RESULTS
 * enum. Kept small and pure so it's easy to test.
 */
function resultForState(
  previousStatus: string,
  scanType: ScanType
): ScanResult | null {
  if (previousStatus === 'unconfirmed') return 'invalid_signature';

  if (scanType === 'arrival' && previousStatus === 'checked_in') {
    return 'already_checked_in';
  }
  if (scanType === 'booklet' && previousStatus === 'booklet_issued') {
    return 'already_checked_in';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/scans — record a scan event
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/scans',
  authenticateStaff,
  async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Partial<ScanSubmitBody>;

      // ── Basic input validation ─────────────────────────────────────────
      if (!body.qrToken || typeof body.qrToken !== 'string') {
        return res.status(400).json({ error: 'qrToken is required' });
      }
      if (!body.scanType || !SCAN_TYPES.includes(body.scanType)) {
        return res
          .status(400)
          .json({ error: `scanType must be one of: ${SCAN_TYPES.join(', ')}` });
      }
      if (!body.standId || typeof body.standId !== 'string') {
        return res.status(400).json({ error: 'standId is required' });
      }
      if (!body.clientTimestamp) {
        return res.status(400).json({ error: 'clientTimestamp is required' });
      }
      if (!body.idempotencyKey || typeof body.idempotencyKey !== 'string') {
        return res.status(400).json({ error: 'idempotencyKey is required' });
      }

      const clientTimestamp = new Date(body.clientTimestamp);
      if (isNaN(clientTimestamp.getTime())) {
        return res
          .status(400)
          .json({ error: 'clientTimestamp must be a valid ISO date' });
      }

      // ── Idempotency ────────────────────────────────────────────────────
      const existing = await ScanEvent.findOne({
        idempotencyKey: body.idempotencyKey,
      }).lean();
      
      if (existing) {
        const participant = await Participant.findById(existing.participantId).lean();
        return res.status(200).json({
          result: existing.result,
          scanEvent: existing,
          participant: participant
            ? {
                id: participant._id,
                name: participant.name,
                refCode: participant.refCode,
                status: participant.status,
              }
            : null,
        });
      }

      // ── Device validation ──────────────────────────────────────────────
      let device: any = null;
      if (body.deviceFingerprint) {
        device = await Device.findOne({
          deviceFingerprint: body.deviceFingerprint,
        }).lean();
        
        if (device && device.isRevoked) {
          await ScanEvent.create({
            participantId: new mongoose.Types.ObjectId(), // ⚠️ See note below
            scanType: body.scanType,
            staffId: req.staff!._id,
            deviceId: device._id,
            standId: body.standId,
            clientTimestamp,
            idempotencyKey: body.idempotencyKey,
            result: 'forged',
            notes: 'Scan attempted from revoked device',
          }).catch(() => { /* swallow duplicate-key */ });

          return res.status(200).json({
            result: 'forged',
            error: 'Device is revoked',
          });
        }
      }

      // ── Look up participant ───────────────────────────────────────────────
      const qrTokenHash = hashQrToken(body.qrToken.trim());
      const participant = await Participant.findOne({
        qrTokenHash,
        deletedAt: null,
      });

      if (!participant) {
        const event = await ScanEvent.create({
          participantId: new mongoose.Types.ObjectId(), // ⚠️ See note below
          scanType: body.scanType,
          staffId: req.staff!._id,
          deviceId: device?._id ?? null,
          standId: body.standId,
          clientTimestamp,
          idempotencyKey: body.idempotencyKey,
          result: 'forged',
          notes: (body.notes || '') + ' (unknown qrToken)',
        });
        return res.status(200).json({
          result: 'forged',
          scanEvent: event,
        });
      }

      // ── State transition ───────────────────────────────────────────────
      const previousStatus = participant.status;
      const rejection = resultForState(previousStatus, body.scanType);

      const session = await mongoose.startSession();

      try {
        session.startTransaction();

        const [scanEvent] = await ScanEvent.create(
          [
            {
              participantId: participant._id,
              scanType: body.scanType,
              staffId: req.staff!._id,
              deviceId: device?._id ?? null,
              standId: body.standId,
              clientTimestamp,
              idempotencyKey: body.idempotencyKey,
              result: rejection ?? 'valid',
              notes: body.notes || null,
            },
          ],
          { session }
        );

        if (!rejection) {
          if (body.scanType === 'arrival' && previousStatus !== 'checked_in') {
            participant.status = 'checked_in';
            participant.checkedInAt = new Date();
          }
          if (body.scanType === 'booklet' && previousStatus !== 'booklet_issued') {
            participant.status = 'booklet_issued';
            participant.bookletIssuedAt = new Date();

            const allocatedDate = new Date().toISOString().slice(0, 10);
            await BookletStock.updateOne(
              { standId: body.standId, allocatedDate },
              { $inc: { issuedCount: 1 } },
              { session }
            );
          }
          await participant.save({ session });
        }

        await session.commitTransaction();

        return res.status(200).json({
          result: scanEvent.result,
          participant: {
            id: participant._id,
            name: participant.name,
            refCode: participant.refCode,
            status: participant.status,
            checkedInAt: participant.checkedInAt,
            bookletIssuedAt: participant.bookletIssuedAt,
          },
          scanEvent,
        });
      } catch (txErr: any) {
        await session.abortTransaction();

        if (txErr?.code === 11000) {
          const winner = await ScanEvent.findOne({
            idempotencyKey: body.idempotencyKey,
          }).lean();
          if (winner) {
            return res.status(200).json({
              result: winner.result,
              scanEvent: winner,
              participant: null,
            });
          }
        }
        throw txErr;
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error('[POST /scans]', err);
      return res.status(500).json({ error: 'Failed to record scan' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/scans/participant/:id
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/scans/participant/:id',
  authenticateStaff,
  requireRole('supervisor', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid participant id' });
      }
      const scans = await ScanEvent.find({ participantId: req.params.id })
        .sort({ clientTimestamp: -1 })
        .limit(50)
        .lean();
      return res.json({ scans });
    } catch (err) {
      console.error('[GET /scans/participant/:id]', err);
      return res.status(500).json({ error: 'Failed to load scans' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/scans/stand/:standId/today
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/scans/stand/:standId/today',
  authenticateStaff,
  requireRole('supervisor', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const scans = await ScanEvent.find({
        standId: req.params.standId,
        clientTimestamp: { $gte: startOfDay },
      })
        .sort({ clientTimestamp: -1 })
        .limit(200)
        .lean();

      return res.json({ scans });
    } catch (err) {
      console.error('[GET /scans/stand/:standId/today]', err);
      return res.status(500).json({ error: 'Failed to load scans' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/scans/conflicts — quarantined scan events for admin review
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/scans/conflicts',
  authenticateStaff,
  requireRole('supervisor', 'admin'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const conflicts = await ScanEvent.find({
        result: { $in: ['conflict', 'already_checked_in', 'invalid_signature', 'forged'] },
      })
        .sort({ serverTimestamp: -1 })
        .limit(100)
        .lean();

      return res.json({
        conflicts: conflicts.map((event: any) => ({
          id: String(event._id),
          result: event.result,
          standId: event.standId,
          clientTimestamp: event.clientTimestamp,
          serverTimestamp: event.serverTimestamp,
          notes: event.notes || null,
        })),
      });
    } catch (err) {
      console.error('[GET /scans/conflicts]', err);
      return res.status(500).json({ error: 'Failed to load scan conflicts' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/scans/stats
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/scans/stats',
  authenticateStaff,
  requireRole('supervisor', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const match: Record<string, unknown> = {};
      if (req.query.standId) match.standId = String(req.query.standId);
      if (req.query.since) {
        const since = new Date(String(req.query.since));
        if (!isNaN(since.getTime())) match.clientTimestamp = { $gte: since };
      }

      const groups = await ScanEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: { scanType: '$scanType', result: '$result' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.scanType': 1, '_id.result': 1 } },
      ]);

      return res.json({ stats: groups });
    } catch (err) {
      console.error('[GET /scans/stats]', err);
      return res.status(500).json({ error: 'Failed to load stats' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/devices/heartbeat
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/devices/heartbeat',
  authenticateStaff,
  async (req: AuthRequest, res: Response) => {
    try {
      const { deviceFingerprint } = req.body || {};
      if (!deviceFingerprint) {
        return res.status(400).json({ error: 'deviceFingerprint is required' });
      }
      const device = await Device.findOneAndUpdate(
        { deviceFingerprint },
        { $set: { lastSyncAt: new Date() } },
        { new: true }
      ).lean();
      
      if (!device) {
        return res.status(404).json({ error: 'Device not registered' });
      }
      return res.json({ device });
    } catch (err) {
      console.error('[POST /devices/heartbeat]', err);
      return res.status(500).json({ error: 'Failed to record heartbeat' });
    }
  }
);

export default router;