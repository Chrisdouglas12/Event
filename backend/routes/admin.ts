import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';

import { Order, ManualPayment } from '../schema/orders.ts';
import { Attendee, Group, TicketType } from '../schema/attendees.ts';
import { NotificationJob } from '../schema/jobs.ts';
import { ScanEvent, BookletStock } from '../schema/scans.ts';
import { AuditLog } from '../schema/auth.ts';
import { EventSettings, ProviderRoute } from '../schema/settings.ts';
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

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL PAYMENT APPROVALS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/approvals', authenticateStaff, requireRole('admin', 'finance'), async (_req: Request, res: Response) => {
  try {
    const manuals = await ManualPayment.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    const orders = await Order.find({ _id: { $in: manuals.map((manual: any) => manual.orderId) } }).lean();
    const orderMap = new Map(orders.map((order: any) => [String(order._id), order]));
    const pendingManuals = manuals.map((manual: any) => {
      const order: any = orderMap.get(String(manual.orderId));
      return order ? { manual: { ...manual, id: String(manual._id) }, order: { ...order, id: String(order._id) } } : null;
    }).filter(Boolean);
    return res.json({ pendingManuals });
  } catch (err) {
    console.error('[GET /admin/approvals] error:', err);
    return res.status(500).json({ error: 'Failed to load manual payment approvals' });
  }
});

router.post('/admin/approvals/verify', authenticateStaff, requireRole('admin', 'finance'), async (req: Request & { staff?: any }, res: Response) => {
  try {
    const { manualPaymentId, action } = req.body || {};
    if (!manualPaymentId || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'manualPaymentId and a valid action are required' });
    const manual: any = await ManualPayment.findById(manualPaymentId);
    if (!manual) return res.status(404).json({ error: 'Manual payment not found' });
    if (manual.status !== 'pending') return res.status(409).json({ error: 'This submission has already been reviewed' });
    const order: any = await Order.findById(manual.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (action === 'approve') {
      if (manual.amountMinor !== order.totalMinor) return res.status(400).json({ error: 'Transfer amount does not match the order' });
      if (order.expiresAt && order.expiresAt < new Date()) return res.status(400).json({ error: 'Expired orders cannot be approved' });
      manual.status = 'approved';
      order.status = 'paid';
      order.paidAt = new Date();
      await Promise.all([manual.save(), order.save()]);
    } else {
      manual.status = 'rejected';
      await manual.save();
    }
    manual.reviewedByStaffId = req.staff?._id || null;
    await manual.save();
    await AuditLog.create({ staffId: req.staff?._id || null, action: `manual_payment_${manual.status}`, entityType: 'ManualPayment', entityId: String(manual._id), oldState: { status: 'pending' }, newState: { status: manual.status, orderId: String(order._id) }, ipAddress: req.ip, userAgent: req.get('user-agent') });
    return res.json({ ok: true, status: manual.status });
  } catch (err) {
    console.error('[POST /admin/approvals/verify] error:', err);
    return res.status(500).json({ error: 'Failed to review manual payment' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKLET STOCK
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/booklet-stock', authenticateStaff, requireRole('admin', 'supervisor', 'attendant'), async (_req: Request, res: Response) => {
  try {
    const [allocations, issuedCount] = await Promise.all([
      BookletStock.find().sort({ allocatedDate: 1, standId: 1 }).lean(),
      Attendee.countDocuments({ bookletIssuedAt: { $ne: null }, deletedAt: null }),
    ]);
    return res.json({ issuedCount, allocations: allocations.map((row: any) => ({ ...row, id: String(row._id) })) });
  } catch (err) {
    console.error('[GET /admin/booklet-stock] error:', err);
    return res.status(500).json({ error: 'Failed to load booklet stock' });
  }
});

router.post('/admin/booklet-stock', authenticateStaff, requireRole('admin', 'supervisor'), async (req: Request & { staff?: any }, res: Response) => {
  try {
    const { standId, allocatedDate, allocatedQuantity } = req.body || {};
    if (!standId || !/^\d{4}-\d{2}-\d{2}$/.test(allocatedDate) || !Number.isInteger(allocatedQuantity) || allocatedQuantity < 0) return res.status(400).json({ error: 'Valid standId, allocatedDate and allocatedQuantity are required' });
    const stock: any = await BookletStock.findOneAndUpdate({ standId: String(standId).trim(), allocatedDate }, { $set: { standId: String(standId).trim(), allocatedDate, allocatedQuantity } }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
    await AuditLog.create({ staffId: req.staff?._id || null, action: 'booklet_stock_allocate', entityType: 'BookletStock', entityId: String(stock._id), newState: stock.toObject(), ipAddress: req.ip, userAgent: req.get('user-agent') });
    return res.json({ ok: true, stock: { ...stock.toObject(), id: String(stock._id) } });
  } catch (err) {
    console.error('[POST /admin/booklet-stock] error:', err);
    return res.status(500).json({ error: 'Failed to save booklet stock allocation' });
  }
});

router.patch('/admin/booklet-stock', authenticateStaff, requireRole('admin', 'supervisor'), async (req: Request & { staff?: any }, res: Response) => {
  try {
    const { id, quantity, reason } = req.body || {};
    const stock: any = await BookletStock.findById(id);
    if (!stock) return res.status(404).json({ error: 'Stock allocation not found' });
    const remaining = stock.allocatedQuantity - stock.issuedCount - stock.returnedCount;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > remaining) return res.status(400).json({ error: 'Return quantity is outside the remaining stock' });
    const oldState = stock.toObject();
    stock.returnedCount += quantity;
    await stock.save();
    await AuditLog.create({ staffId: req.staff?._id || null, action: 'booklet_stock_return', entityType: 'BookletStock', entityId: String(stock._id), oldState, newState: { ...stock.toObject(), reason }, ipAddress: req.ip, userAgent: req.get('user-agent') });
    return res.json({ ok: true, stock: { ...stock.toObject(), id: String(stock._id) } });
  } catch (err) {
    console.error('[PATCH /admin/booklet-stock] error:', err);
    return res.status(500).json({ error: 'Failed to record booklet return' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE SYNC CONFLICTS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/conflicts', authenticateStaff, requireRole('admin', 'supervisor', 'attendant'), async (_req: Request, res: Response) => {
  try {
    const scans = await ScanEvent.find({ result: { $in: ['conflict', 'already_checked_in', 'invalid_signature', 'forged'] } }).sort({ serverTimestamp: -1 }).limit(500).lean();
    return res.json({ conflicts: scans.map((scan: any) => ({ ...scan, id: String(scan._id) })) });
  } catch (err) {
    console.error('[GET /admin/conflicts] error:', err);
    return res.status(500).json({ error: 'Failed to load sync conflicts' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGING QUEUE
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/messaging', authenticateStaff, requireRole('admin', 'supervisor'), async (_req: Request, res: Response) => {
  try {
    const jobs = await NotificationJob.find({ status: 'failed' }).sort({ createdAt: -1 }).limit(100).lean();
    const [attendees, orders] = await Promise.all([
      Attendee.find({ _id: { $in: jobs.map((job: any) => job.attendeeId) } }).lean(),
      Order.find({ _id: { $in: jobs.map((job: any) => job.orderId) } }).lean(),
    ]);
    const attendeeMap = new Map(attendees.map((attendee: any) => [String(attendee._id), attendee.name]));
    const orderMap = new Map(orders.map((order: any) => [String(order._id), order.reference]));
    return res.json({ deadJobs: jobs.map((job: any) => ({
      id: String(job._id), channel: job.channel, attempts: job.attempts, lastError: job.lastError,
      createdAt: job.createdAt, attendeeName: attendeeMap.get(String(job.attendeeId)) || 'Unknown attendee',
      reference: orderMap.get(String(job.orderId)) || 'Unknown order',
    })) });
  } catch (err) {
    console.error('[GET /admin/messaging] error:', err);
    return res.status(500).json({ error: 'Failed to load messaging queue' });
  }
});

router.post('/admin/notifications/:id/retry', authenticateStaff, requireRole('admin', 'supervisor'), async (req: Request & { staff?: any }, res: Response) => {
  try {
    const job: any = await NotificationJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Notification job not found' });
    job.status = 'queued';
    job.availableAt = new Date();
    job.lockedAt = null;
    job.lastError = undefined;
    await job.save();
    await AuditLog.create({ staffId: req.staff?._id || null, action: 'notification_retry', entityType: 'NotificationJob', entityId: String(job._id), ipAddress: req.ip, userAgent: req.get('user-agent') });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[POST /admin/notifications/retry] error:', err);
    return res.status(500).json({ error: 'Failed to retry notification' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER AND CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/roster', authenticateStaff, requireRole('admin', 'supervisor', 'attendant'), async (_req: Request, res: Response) => {
  try {
    const paidOrders = await Order.find({ status: 'paid' }).select('_id').lean();
    const paidOrderIds = new Set(paidOrders.map((order: any) => String(order._id)));
    const attendees = await Attendee.find({ deletedAt: null }).sort({ state: 1, name: 1 }).lean();
    const confirmedAttendees = attendees.filter((attendee: any) => paidOrderIds.has(String(attendee.orderId))).map((attendee: any) => ({
      id: String(attendee._id), refCode: attendee.refCode, name: attendee.name, phoneE164: attendee.phoneE164,
      state: attendee.state || 'FCT Abuja', country: attendee.country, parish: attendee.parish,
      isMinor: attendee.isMinor, guardianName: attendee.guardianName, status: attendee.status,
      checkedInAt: attendee.checkedInAt, bookletIssuedAt: attendee.bookletIssuedAt,
    }));
    return res.json({ confirmedAttendees });
  } catch (err) {
    console.error('[GET /admin/roster] error:', err);
    return res.status(500).json({ error: 'Failed to load roster' });
  }
});

router.get('/admin/export', authenticateStaff, requireRole('admin', 'supervisor', 'finance'), async (req: Request & { staff?: any }, res: Response) => {
  try {
    const attendees = await Attendee.find({ deletedAt: null }).sort({ name: 1 }).lean();
    const headers = ['Reference','Name','Phone','State','Country','Parish','Status','Checked In','Booklet Issued','Minor','Guardian'];
    const rows = attendees.map((attendee: any) => [attendee.refCode, attendee.name, attendee.phoneE164, attendee.state || '', attendee.country || '', attendee.parish || '', attendee.status, attendee.checkedInAt ? 'yes' : 'no', attendee.bookletIssuedAt ? 'yes' : 'no', attendee.isMinor ? 'yes' : 'no', attendee.guardianName || '']);
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    await AuditLog.create({ staffId: req.staff?._id || null, action: 'attendee_csv_export', entityType: 'Attendee', entityId: 'all', ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendee-roster.csv"');
    return res.send(`\uFEFF${csv}`);
  } catch (err) {
    console.error('[GET /admin/export] error:', err);
    return res.status(500).json({ error: 'Failed to export attendee roster' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/settings', authenticateStaff, requireRole('admin', 'supervisor'), async (_req: Request, res: Response) => {
  try {
    const [settings, routes, ticketTypes] = await Promise.all([
      EventSettings.findOne({ singleton: 'event' }).lean(),
      ProviderRoute.find().sort({ currency: 1 }).lean(),
      TicketType.find({ isActive: true }).lean(),
    ]);
    const prices = ticketTypes.flatMap((ticket: any) => (ticket.prices || []).map((price: any) => ({ currency: price.currency, amountMinor: price.amountMinor })));
    return res.json({
      settings: settings || {},
      routes: routes.map((route: any) => ({ currency: route.currency, primaryProvider: route.primaryProvider, isEnabled: route.isEnabled, feePolicy: route.feePolicy })),
      prices,
    });
  } catch (err) {
    console.error('[GET /admin/settings] error:', err);
    return res.status(500).json({ error: 'Failed to load settings' });
  }
});

router.put('/admin/settings', authenticateStaff, requireRole('admin'), async (req: Request & { staff?: any }, res: Response) => {
  try {
    const { settings = {}, routes = [], prices = [] } = req.body || {};
    const updated = await EventSettings.findOneAndUpdate({ singleton: 'event' }, { $set: { singleton: 'event', ...settings } }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
    for (const route of routes) {
      await ProviderRoute.findOneAndUpdate({ currency: route.currency }, { $set: route }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
    }
    if (Array.isArray(prices) && prices.length) {
      const ticket = await TicketType.findOne({ isActive: true }).sort({ createdAt: 1 });
      if (ticket) {
        ticket.prices = prices.map((price: any) => ({ currency: price.currency, amountMinor: Number(price.amountMinor) }));
        await ticket.save();
      }
    }
    await AuditLog.create({ staffId: req.staff?._id || null, action: 'settings_updated', entityType: 'EventSettings', entityId: 'event', newState: settings, ipAddress: req.ip, userAgent: req.get('user-agent') });
    return res.json({ ok: true, settings: updated });
  } catch (err) {
    console.error('[PUT /admin/settings] error:', err);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;