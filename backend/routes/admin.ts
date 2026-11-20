import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';

import { Order, ManualPayment } from '../schema/orders.ts';
import { Participant, Group } from '../schema/participants.ts';
import { BookletStock, ScanEvent } from '../schema/scans.ts'; 
import { authenticateStaff, requireRole } from './auth.ts';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function accessTokenFor(orderId: unknown): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 16) return "";
  return crypto
    .createHmac('sha256', secret)
    .update(`order-access:${String(orderId)}`)
    .digest('base64url')
    .slice(0, 32);
}

function qrTokenFor(participantId: unknown): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 16) return "";
  return crypto
    .createHmac('sha256', secret)
    .update(`participant:${String(participantId)}`)
    .digest('base64url')
    .slice(0, 32);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard-stats
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/dashboard-stats',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'finance'),
  async (_req: Request, res: Response) => {
    try {
      const totalParticipants = await Participant.countDocuments({ deletedAt: null });
      const confirmedParticipants = await Participant.countDocuments({ status: 'confirmed', deletedAt: null });
      const checkedInParticipants = await Participant.countDocuments({ status: 'checked_in', deletedAt: null });

      const totalOrders = await Order.countDocuments({});
      const paidOrders = await Order.countDocuments({ status: 'paid' });
      const pendingOrders = await Order.countDocuments({ status: 'pending_payment' });

      const attendanceOrders = await Order.find({ status: { $in: ['paid', 'pending_payment'] } }).lean();

      const attendanceTotals = { physically: 0, online: 0, not_sure: 0 };
      for (const order of attendanceOrders as any[]) {
        if (order.isGroup && order.attendanceCounts) {
          attendanceTotals.physically += Number(order.attendanceCounts.physically) || 0;
          attendanceTotals.online += Number(order.attendanceCounts.online) || 0;
          attendanceTotals.not_sure += Number(order.attendanceCounts.not_sure) || 0;
        } else {
          const mode = ['physically', 'online', 'not_sure'].includes(order.attendanceMode)
            ? order.attendanceMode
            : 'not_sure';
          attendanceTotals[mode as keyof typeof attendanceTotals] += Number(order.seats) || 1;
        }
      }

      const revenueAgg = await Order.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$currency', total: { $sum: '$totalMinor' } } },
      ]);

      const revenueByCurrency = { NGN: 0, USD: 0, EUR: 0, GBP: 0 };
      for (const row of revenueAgg) {
        if (revenueByCurrency[row._id as keyof typeof revenueByCurrency] !== undefined) {
          revenueByCurrency[row._id as keyof typeof revenueByCurrency] = row.total;
        }
      }

      return res.json({
        totalParticipants,
        confirmedParticipants,
        checkedInParticipants,
        totalOrders,
        paidOrders,
        pendingOrders,
        attendanceTotals,
        revenueByCurrency,
      });
    } catch (err) {
      console.error('[GET /admin/dashboard-stats] error:', err);
      return res.status(500).json({ error: 'Failed to load dashboard statistics' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/participants
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/participants',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'attendant'),
  async (_req: Request, res: Response) => {
    try {
      const participants = await Participant.find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const formatted = participants.map((att) => ({
        ...att,
        id: att._id.toString(),
      }));

      return res.json({ participants: formatted });
    } catch (err) {
      console.error('[GET /admin/participants] error:', err);
      return res.status(500).json({ error: 'Failed to load participants' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/orders
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/orders',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'finance'),
  async (_req: Request, res: Response) => {
    try {
      const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const formatted = orders.map((o: any) => ({
        ...o,
        id: o._id.toString(),
        ticketAccess: o.status === 'paid' ? accessTokenFor(o._id) || null : null,
      }));

      return res.json({ orders: formatted });
    } catch (err) {
      console.error('[GET /admin/orders] error:', err);
      return res.status(500).json({ error: 'Failed to load orders' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/tickets/:reference
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/tickets/:reference',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'finance'),
  async (req: Request, res: Response) => {
    try {
      const order: any = await Order.findOne({ reference: req.params.reference }).lean();
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const participants = await Participant.find({ orderId: order._id, deletedAt: null }).lean();
      const group = order.isGroup ? await Group.findOne({ orderId: order._id }).lean() : null;

      const formattedParticipants = participants.map((att: any) => ({
        id: att._id.toString(),
        refCode: att.refCode,
        name: att.name,
        chapterZone: att.chapterZone,
        status: att.status,
        qrToken: qrTokenFor(att._id),
      }));

      return res.json({
        order: {
          id: order._id.toString(),
          reference: order.reference,
          status: order.status,
          isGroup: order.isGroup,
          totalMinor: order.totalMinor,
          currency: order.currency,
        },
        participants: formattedParticipants,
        group: group ? {
          id: group._id.toString(),
          managementToken: (group as any).managementToken,
          totalSeats: (group as any).totalSeats,
          claimedSeats: (group as any).claimedSeats,
        } : null
      });
    } catch (err) {
      console.error('[GET /admin/tickets/:reference] error:', err);
      return res.status(500).json({ error: 'Failed to load ticket data' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/approvals
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/approvals',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'finance'),
  async (_req: Request, res: Response) => {
    try {
      const manuals = await ManualPayment.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const orderIds = manuals.map((m: any) => m.orderId);
      const orders = await Order.find({ _id: { $in: orderIds } }).lean();
      const orderMap = new Map(orders.map((o: any) => [o._id.toString(), o]));

      const pendingManuals = manuals.map((m: any) => {
        const order = orderMap.get(m.orderId.toString()) as any;
        return {
          manual: {
            id: m._id.toString(),
            amountMinor: m.amountMinor,
            bankName: m.bankName,
            accountName: m.accountName,
            referenceOrTellerId: m.referenceOrTellerId,
            createdAt: m.createdAt,
            status: m.status,
          },
          order: order ? {
            id: order._id.toString(),
            reference: order.reference,
            groupName: order.groupName,
            attendanceMode: order.attendanceMode || 'not_sure',
            payerName: order.payerName,
            payerPhoneE164: order.payerPhoneE164,
            totalMinor: order.totalMinor,
            currency: order.currency,
            expiresAt: order.expiresAt,
          } : null,
        };
      }).filter((item: any) => item.order !== null);

      return res.json({ pendingManuals });
    } catch (err) {
      console.error('[GET /admin/approvals] error:', err);
      return res.status(500).json({ error: 'Failed to load approvals' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/approvals/verify
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/admin/approvals/verify',
  authenticateStaff,
  requireRole('admin', 'finance'),
  async (req: Request, res: Response) => {
    try {
      const { manualPaymentId, action } = req.body;
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const manual = await ManualPayment.findById(manualPaymentId);
      if (!manual) return res.status(404).json({ error: 'Manual payment not found' });

      if (action === 'approve') {
        manual.status = 'approved';
        manual.reviewedByStaffId = (req as any).staff._id;
        await manual.save();

        await Order.updateOne(
          { _id: manual.orderId },
          { $set: { status: 'paid', paidAt: new Date() } }
        );
      } else {
        manual.status = 'rejected';
        manual.reviewedByStaffId = (req as any).staff._id;
        await manual.save();
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('[POST /admin/approvals/verify] error:', err);
      return res.status(500).json({ error: 'Failed to verify payment' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/booklet-stock
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/booklet-stock',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'attendant'),
  async (_req: Request, res: Response) => {
    try {
      const currentIssued = await Participant.countDocuments({
        bookletIssuedAt: { $ne: null },
        deletedAt: null,
      });

      const stock = await BookletStock.find({})
        .sort({ allocatedDate: 1, standId: 1 })
        .lean();

      const allocations = stock.map((row: any) => ({
        id: row._id.toString(),
        standId: row.standId,
        allocatedDate: row.allocatedDate,
        allocatedQuantity: row.allocatedQuantity,
        issuedCount: row.issuedCount,
        returnedCount: row.returnedCount,
      }));

      return res.json({ currentIssued, allocations });
    } catch (err) {
      console.error('[GET /admin/booklet-stock] error:', err);
      return res.status(500).json({ error: 'Failed to load booklet stock' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/booklet-stock
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/admin/booklet-stock',
  authenticateStaff,
  requireRole('admin', 'supervisor'),
  async (req: Request, res: Response) => {
    try {
      const { standId, allocatedDate, allocatedQuantity } = req.body;

      if (!standId || !allocatedDate || typeof allocatedQuantity !== 'number') {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const stock = await BookletStock.findOneAndUpdate(
        { standId, allocatedDate },
        {
          $set: {
            allocatedQuantity,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.json({ stock });
    } catch (err) {
      console.error('[POST /admin/booklet-stock] error:', err);
      return res.status(500).json({ error: 'Failed to update stock' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/booklet-stock (Record Returns)
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  '/admin/booklet-stock',
  authenticateStaff,
  requireRole('admin', 'supervisor'),
  async (req: Request, res: Response) => {
    try {
      const { id, quantity, reason } = req.body;

      if (!id || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid return payload' });
      }

      const stock = await BookletStock.findById(id);
      if (!stock) return res.status(404).json({ error: 'Stock record not found' });

      const available = stock.allocatedQuantity - stock.issuedCount - stock.returnedCount;
      if (quantity > available) {
        return res.status(400).json({ error: `Cannot return ${quantity}. Only ${available} available.` });
      }

      stock.returnedCount += quantity;
      await stock.save();

      return res.json({ stock });
    } catch (err) {
      console.error('[PATCH /admin/booklet-stock] error:', err);
      return res.status(500).json({ error: 'Failed to record return' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/scan (QR Scanner)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/admin/scan',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'attendant'),
  async (req: Request, res: Response) => {
    try {
      const { qrToken, action, standId } = req.body;
      const staffId = (req as any).staff._id;

      if (!qrToken || !standId) {
        return res.status(400).json({ error: 'Missing QR token or Stand ID' });
      }

      // 1. Find the participant by their QR hash
      const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');
      const participant = await Participant.findOne({ qrTokenHash: tokenHash, deletedAt: null });

      if (!participant) {
        await ScanEvent.create({
          scanType: action || 'arrival',
          staffId,
          standId,
          clientTimestamp: new Date(),
          idempotencyKey: crypto.randomUUID(),
          result: 'invalid_signature',
          notes: 'Invalid QR Token',
        });
        return res.status(404).json({ error: 'Invalid or forged ticket.' });
      }

      // 2. Prevent duplicate check-ins
      if (action === 'arrival' && participant.checkedInAt) {
        return res.status(409).json({ 
          error: `Already checked in on ${new Date(participant.checkedInAt).toLocaleTimeString()}`,
          participant: { name: participant.name, refCode: participant.refCode }
        });
      }

      if (action === 'booklet' && participant.bookletIssuedAt) {
        return res.status(409).json({ 
          error: 'Booklet already issued.',
          participant: { name: participant.name, refCode: participant.refCode }
        });
      }

      // 3. Perform the action
      if (action === 'arrival') {
        participant.checkedInAt = new Date();
        participant.status = 'checked_in';
      } else if (action === 'booklet') {
        participant.bookletIssuedAt = new Date();
        participant.status = 'booklet_issued';
      }
      await participant.save();

      // 4. Log the success
      await ScanEvent.create({
        participantId: participant._id,
        scanType: action || 'arrival',
        staffId,
        standId,
        clientTimestamp: new Date(),
        idempotencyKey: crypto.randomUUID(),
        result: 'valid',
      });

      return res.json({
        success: true,
        message: action === 'arrival' ? 'Checked in successfully' : 'Booklet issued successfully',
        participant: {
          name: participant.name,
          refCode: participant.refCode,
          chapterZone: participant.chapterZone,
        }
      });

    } catch (err) {
      console.error('[POST /admin/scan] error:', err);
      return res.status(500).json({ error: 'Scan processing failed' });
    }
  }
);

export default router;