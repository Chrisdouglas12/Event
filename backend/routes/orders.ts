// routes/orders.ts
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';

import { Order } from '../schema/orders.ts';
import { CURRENCIES, ORDER_STATUSES, PAYMENT_PROVIDERS } from '../constants/enums.ts';
import { Payment } from '../schema/orders.ts';
import { MANUAL_PAYMENT_STATUSES } from '../constants/enums.ts';
import { Attendee, Group, GroupSeat, TicketType } from '../schema/attendees.ts';
import { AuditLog } from '../schema/auth.ts';

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

type Currency = (typeof CURRENCIES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReference(): string {
  let out = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  return `HGC-${out}`;
}

function toE164(phone: unknown): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function logAudit(entry: {
  staffId: mongoose.Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId: string;
  oldState?: unknown;
  newState?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await AuditLog.create({
      staffId: entry.staffId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldState: entry.oldState ?? null,
      newState: entry.newState ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    console.error('[auditLog]', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHAPERS
// ─────────────────────────────────────────────────────────────────────────────

function shapeOrder(order: any) {
  return {
    id: order._id,
    reference: order.reference,
    status: order.status,
    disputed: order.disputed,
    currency: order.currency,
    totalMinor: order.totalMinor,
    feeMinor: order.feeMinor,
    isGroup: order.isGroup,
    groupName: order.groupName || null,
    expiresAt: order.expiresAt || null,
    createdAt: order.createdAt,
    items: order.items || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders — create a draft order with ticket selections
// ─────────────────────────────────────────────────────────────────────────────

router.post('/orders', async (req: Request, res: Response) => {
  const body = req.body || {};

  try {
    // ── 1. Validate envelope ───────────────────────────────────────────────
    if (!body.idempotencyKey || typeof body.idempotencyKey !== 'string') {
      return res.status(400).json({ error: 'idempotencyKey is required' });
    }

    if (!body.currency || !CURRENCIES.includes(body.currency)) {
      return res
        .status(400)
        .json({ error: `currency must be one of: ${CURRENCIES.join(', ')}` });
    }

    const payer = body.payer || {};
    if (!payer.name || typeof payer.name !== 'string') {
      return res.status(400).json({ error: 'payer.name is required' });
    }
    const payerPhone = toE164(payer.phoneE164);
    if (!payerPhone) {
      return res.status(400).json({ error: 'payer.phoneE164 is invalid' });
    }
    if (payer.email && !EMAIL_RE.test(payer.email)) {
      return res.status(400).json({ error: 'payer.email is invalid' });
    }

    if (!Array.isArray(body.selections) || body.selections.length === 0) {
      return res.status(400).json({ error: 'selections must be a non-empty array' });
    }

    // ── 2. Idempotency: same key → return the existing order ──────────────
    const existing = await Order.findOne({
      idempotencyKey: body.idempotencyKey,
    }).lean();
    if (existing) {
      return res.status(200).json({ order: shapeOrder(existing) });
    }

    // ── 3. Load ticket types, compute the total server-side ───────────────
    const ids = body.selections
      .map((s: any) => s.ticketTypeId)
      .filter((id: any) => mongoose.isValidObjectId(id));

    if (ids.length !== body.selections.length) {
      return res.status(400).json({ error: 'Invalid ticketTypeId in selections' });
    }

    const ticketTypes = await TicketType.find({
      _id: { $in: ids },
      isActive: true,
    }).lean();

    const byId = new Map(ticketTypes.map((t: any) => [String(t._id), t]));

    const items: Array<{
      ticketTypeId: mongoose.Types.ObjectId;
      name: string;
      quantity: number;
      unitMinor: number;
      lineMinor: number;
    }> = [];

    let totalMinor = 0;

    for (const sel of body.selections) {
      const tt = byId.get(String(sel.ticketTypeId));
      if (!tt) {
        return res
          .status(400)
          .json({ error: `Ticket type ${sel.ticketTypeId} is not available` });
      }
      const quantity = Number(sel.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return res
          .status(400)
          .json({ error: 'Each quantity must be an integer 1–100' });
      }
      const price = (tt as any).prices.find((p: any) => p.currency === body.currency);
      if (!price) {
        return res.status(400).json({
          error: `Ticket type "${(tt as any).name}" has no price in ${body.currency}`,
        });
      }

      const lineMinor = price.amountMinor * quantity;
      totalMinor += lineMinor;

      items.push({
        ticketTypeId: tt._id,
        name: (tt as any).name,
        quantity,
        unitMinor: price.amountMinor,
        lineMinor,
      });
    }

    // ── 4. Insert with a unique reference (retry on rare clash) ───────────
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    let order: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = generateReference();
      try {
        order = await Order.create({
          reference,
          status: 'draft',
          disputed: false,
          currency: body.currency as Currency,
          totalMinor,
          feeMinor: 0,
          payerName: String(payer.name).trim(),
          payerPhoneE164: payerPhone,
          payerEmail: payer.email
            ? String(payer.email).trim().toLowerCase()
            : null,
          isGroup: !!body.group?.name,
          groupName: body.group?.name ? String(body.group.name).trim() : null,
          idempotencyKey: body.idempotencyKey,
          expiresAt,
          items, // Ensure `items` is defined in your schema/orders.ts
        });
        break;
      } catch (err: any) {
        if (err?.code === 11000 && err?.keyPattern?.reference) {
          continue; // refCode clash, retry
        }
        if (err?.code === 11000 && err?.keyPattern?.idempotencyKey) {
          const winner = await Order.findOne({
            idempotencyKey: body.idempotencyKey,
          }).lean();
          if (winner) return res.status(200).json({ order: shapeOrder(winner) });
        }
        throw err;
      }
    }

    if (!order) {
      return res.status(500).json({ error: 'Could not allocate a reference' });
    }

    return res.status(201).json({ order: shapeOrder(order.toObject()) });
  } catch (err) {
    console.error('[POST /orders]', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:reference — public lookup
// ─────────────────────────────────────────────────────────────────────────────

router.get('/orders/:reference', async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({
      reference: req.params.reference,
    }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const attendeeCount = await Attendee.countDocuments({ orderId: order._id });
    const group = order.isGroup
      ? await Group.findOne({ orderId: order._id }).lean()
      : null;

    return res.json({
      order: shapeOrder(order),
      attendeeCount,
      group: group
        ? {
            id: group._id,
            churchOrParishName: group.churchOrParishName,
            totalSeats: group.totalSeats,
            claimedSeats: group.claimedSeats,
          }
        : null,
    });
  } catch (err) {
    console.error('[GET /orders/:reference]', err);
    return res.status(500).json({ error: 'Failed to load order' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders — staff list (paginated)
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/orders',
  authenticateStaff,
  requireRole('supervisor', 'finance', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(String(req.query.limit || '50'), 10))
      );

      const filter: Record<string, unknown> = {};
      if (req.query.status) {
        if (!ORDER_STATUSES.includes(String(req.query.status) as any)) {
          return res.status(400).json({
            error: `status must be one of: ${ORDER_STATUSES.join(', ')}`,
          });
        }
        filter.status = req.query.status;
      }
      if (req.query.currency) filter.currency = req.query.currency;
      if (req.query.phone) filter.payerPhoneE164 = req.query.phone;
      if (req.query.email) filter.payerEmail = req.query.email;

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Order.countDocuments(filter),
      ]);

      return res.json({
        orders,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('[GET /orders]', err);
      return res.status(500).json({ error: 'Failed to list orders' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:reference/pay — initiate provider payment
// ─────────────────────────────────────────────────────────────────────────────

router.post('/orders/:reference/pay', async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!['draft', 'pending_payment'].includes(order.status)) {
      return res
        .status(400)
        .json({ error: `Cannot pay an order in status "${order.status}"` });
    }
    if (order.expiresAt && order.expiresAt < new Date()) {
      order.status = 'expired';
      await order.save();
      return res.status(400).json({ error: 'Order has expired' });
    }

    const provider = String(req.body?.provider || '');
    if (!PAYMENT_PROVIDERS.includes(provider as any)) {
      return res
        .status(400)
        .json({ error: `provider must be one of: ${PAYMENT_PROVIDERS.join(', ')}` });
    }

    // ── Manual transfer branch ─────────────────────────────────────────
    if (provider === 'manual_transfer') {
      order.status = 'pending_payment';
      await order.save();
      return res.json({
        provider: 'manual_transfer',
        instructions: {
          note: 'Transfer the exact amount, then submit proof via POST /orders/:reference/manual-payment',
          amountMinor: order.totalMinor,
          currency: order.currency,
          reference: order.reference,
        },
      });
    }

    // ── Online provider branch (stub) ──────────────────────────────────
    const providerRef = `${provider}_${crypto.randomBytes(12).toString('hex')}`;

    const payment = await Payment.create({
      orderId: order._id,
      provider,
      providerRef,
      status: 'initiated',
      currency: order.currency,
      amountMinor: order.totalMinor,
    });

    order.status = 'pending_payment';
    await order.save();

    return res.json({
      provider,
      payment: {
        id: payment._id,
        providerRef,
        checkoutUrl: null,
      },
    });
  } catch (err) {
    console.error('[POST /orders/:reference/pay]', err);
    return res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:reference/manual-payment — buyer submits proof
// ─────────────────────────────────────────────────────────────────────────────

router.post('/orders/:reference/manual-payment', async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending_payment') {
      return res
        .status(400)
        .json({ error: `Order is not awaiting payment (status: ${order.status})` });
    }

    const { bankName, accountName, referenceOrTellerId, amountMinor } = req.body || {};

    if (!bankName || !accountName || !referenceOrTellerId) {
      return res.status(400).json({
        error: 'bankName, accountName and referenceOrTellerId are required',
      });
    }
    const amt = Number(amountMinor);
    if (!Number.isInteger(amt) || amt <= 0) {
      return res.status(400).json({ error: 'amountMinor must be positive' });
    }

    const manual = await Payment.create({
      orderId: order._id,
      bankName: String(bankName).trim(),
      accountName: String(accountName).trim(),
      referenceOrTellerId: String(referenceOrTellerId).trim(),
      amountMinor: amt,
      status: 'pending',
    });

    return res.status(201).json({
      manualPayment: {
        id: manual._id,
        status: manual.status,
        amountMinor: manual.amountMinor,
        createdAt: manual.createdAt,
      },
    });
  } catch (err) {
    console.error('[POST /orders/:reference/manual-payment]', err);
    return res.status(500).json({ error: 'Failed to submit manual payment' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:id/approve-manual — admin approves a manual payment
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/orders/:id/approve-manual',
  authenticateStaff,
  requireRole('finance', 'admin'),
  async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid order id' });
      }
      const { manualPaymentId, adminNotes } = req.body || {};
      if (!manualPaymentId || !mongoose.isValidObjectId(manualPaymentId)) {
        return res.status(400).json({ error: 'manualPaymentId is required' });
      }

      let updatedOrder: any = null;

      session.startTransaction();

      const order = await Order.findById(req.params.id).session(session);
      if (!order) throw new Error('Order not found');

      const manual = await Payment.findById(manualPaymentId).session(session);
      if (!manual || String(manual.orderId) !== String(order._id)) {
        throw new Error('Manual payment not found for this order');
      }
      if (manual.status !== 'pending') {
        throw new Error(`Manual payment is already ${manual.status}`);
      }

      manual.status = 'approved';
      // manual.reviewedByStaffId = req.staff!._id; // Only if your schema has this
      // manual.adminNotes = adminNotes ? String(adminNotes) : undefined;
      await manual.save({ session });

      order.status = 'paid';
      await order.save({ session });

      await Attendee.updateMany(
        { orderId: order._id, status: 'unconfirmed' },
        { $set: { status: 'confirmed' } },
        { session }
      );

      await session.commitTransaction();
      updatedOrder = order;
      session.endSession();

      await logAudit({
        staffId: req.staff!._id,
        action: 'order_manual_payment_approved',
        entityType: 'Order',
        entityId: String(order._id),
        newState: {
          manualPaymentId: String(manual._id),
          amountMinor: manual.amountMinor,
        },
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          null,
        userAgent: req.headers['user-agent'] || null,
      });

      return res.json({ order: shapeOrder(updatedOrder.toObject()) });
    } catch (err: any) {
      try {
        await session.abortTransaction();
      } catch {
        /* noop */
      }
      session.endSession();

      const msg = err?.message || 'Failed to approve manual payment';
      const code = /not found/i.test(msg) ? 404 : 400;
      if (code === 400) {
        console.error('[POST /orders/:id/approve-manual]', err);
        return res.status(500).json({ error: 'Failed to approve' });
      }
      return res.status(code).json({ error: msg });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:id/reject-manual — admin rejects
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/orders/:id/reject-manual',
  authenticateStaff,
  requireRole('finance', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid order id' });
      }
      const { manualPaymentId, adminNotes } = req.body || {};
      if (!manualPaymentId || !mongoose.isValidObjectId(manualPaymentId)) {
        return res.status(400).json({ error: 'manualPaymentId is required' });
      }

      const manual = await Payment.findById(manualPaymentId);
      if (!manual || String(manual.orderId) !== req.params.id) {
        return res.status(404).json({ error: 'Manual payment not found' });
      }
      if (manual.status !== 'pending') {
        return res
          .status(400)
          .json({ error: `Manual payment is already ${manual.status}` });
      }

      manual.status = 'rejected';
      await manual.save();

      await logAudit({
        staffId: req.staff!._id,
        action: 'order_manual_payment_rejected',
        entityType: 'Order',
        entityId: String(manual.orderId),
        newState: { manualPaymentId: String(manual._id) },
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          null,
        userAgent: req.headers['user-agent'] || null,
      });

      return res.json({ manualPayment: { id: manual._id, status: 'rejected' } });
    } catch (err) {
      console.error('[POST /orders/:id/reject-manual]', err);
      return res.status(500).json({ error: 'Failed to reject manual payment' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:id/refund — admin marks refunded (or partially)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/orders/:id/refund',
  authenticateStaff,
  requireRole('finance', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid order id' });
      }
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (!['paid', 'partially_refunded'].includes(order.status)) {
        return res.status(400).json({
          error: `Cannot refund an order in status "${order.status}"`,
        });
      }

      const refund = Number(req.body?.amountMinor ?? order.totalMinor);
      if (!Number.isInteger(refund) || refund <= 0) {
        return res.status(400).json({ error: 'amountMinor must be positive' });
      }
      if (refund > order.totalMinor) {
        return res
          .status(400)
          .json({ error: 'Refund amount exceeds order total' });
      }

      order.status = refund === order.totalMinor ? 'refunded' : 'partially_refunded';
      await order.save();

      await logAudit({
        staffId: req.staff!._id,
        action: 'order_refunded',
        entityType: 'Order',
        entityId: String(order._id),
        newState: { amountMinor: refund, reason: req.body?.reason || null },
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          null,
        userAgent: req.headers['user-agent'] || null,
      });

      return res.json({ order: shapeOrder(order.toObject()) });
    } catch (err) {
      console.error('[POST /orders/:id/refund]', err);
      return res.status(500).json({ error: 'Failed to refund order' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/expire-stale — sweeper (called by cron/admin)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/orders/expire-stale',
  authenticateStaff,
  requireRole('admin'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const result = await Order.updateMany(
        { status: 'pending_payment', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired' } }
      );
      return res.json({ expired: result.modifiedCount });
    } catch (err) {
      console.error('[POST /orders/expire-stale]', err);
      return res.status(500).json({ error: 'Failed to expire stale orders' });
    }
  }
);

export default router;