import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';

import { Order } from '../schema/orders.ts';
import { Attendee, Group } from '../schema/attendees.ts';
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

function qrTokenFor(attendeeId: unknown): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 16) return "";
  return crypto
    .createHmac('sha256', secret)
    .update(`attendee:${String(attendeeId)}`)
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
      const totalAttendees = await Attendee.countDocuments({ deletedAt: null });
      const confirmedAttendees = await Attendee.countDocuments({ status: 'confirmed', deletedAt: null });
      const checkedInAttendees = await Attendee.countDocuments({ status: 'checked_in', deletedAt: null });

      const totalOrders = await Order.countDocuments({});
      const paidOrders = await Order.countDocuments({ status: 'paid' });
      const pendingOrders = await Order.countDocuments({ status: 'pending_payment' });

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
        totalAttendees,
        confirmedAttendees,
        checkedInAttendees,
        totalOrders,
        paidOrders,
        pendingOrders,
        revenueByCurrency,
      });
    } catch (err) {
      console.error('[GET /admin/dashboard-stats] error:', err);
      return res.status(500).json({ error: 'Failed to load dashboard statistics' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/attendees
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/attendees',
  authenticateStaff,
  requireRole('admin', 'supervisor', 'attendant'),
  async (_req: Request, res: Response) => {
    try {
      const attendees = await Attendee.find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const formatted = attendees.map((att) => ({
        ...att,
        id: att._id.toString(),
      }));

      return res.json({ attendees: formatted });
    } catch (err) {
      console.error('[GET /admin/attendees] error:', err);
      return res.status(500).json({ error: 'Failed to load attendees' });
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
// Fetch all data needed to render the ticket page (Admin View)
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

      const attendees = await Attendee.find({ orderId: order._id, deletedAt: null }).lean();
      const group = order.isGroup ? await Group.findOne({ orderId: order._id }).lean() : null;

      // Format attendees with QR tokens
      const formattedAttendees = attendees.map((att: any) => ({
        id: att._id.toString(),
        refCode: att.refCode,
        name: att.name,
        parish: att.parish,
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
        attendees: formattedAttendees,
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

export default router;