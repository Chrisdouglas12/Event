// routes/registration.ts
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';

import { Order, Payment } from '../schema/orders.ts';
import { ATTENDANCE_MODES, ORDER_STATUSES, CURRENCIES } from '../constants/enums.ts';
import { TicketType } from '../schema/participants.ts';
import { Participant } from '../schema/participants.ts';
import { Group, GroupSeat } from '../schema/participants.ts';
import { toE164 } from '../lib/phone.ts';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateRefCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return `HGC-${out}`;
}

function generateToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashQrToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function qrTokenFor(participantId: unknown): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 16) throw new Error('QR_TOKEN_SECRET is not set (min 16 chars)');
  return crypto
    .createHmac('sha256', secret)
    .update(`participant:${String(participantId)}`)
    .digest('base64url')
    .slice(0, 32);
}

function accessTokenFor(orderId: unknown): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 16) throw new Error('QR_TOKEN_SECRET is not set (min 16 chars)');
  return crypto
    .createHmac('sha256', secret)
    .update(`order-access:${String(orderId)}`)
    .digest('base64url')
    .slice(0, 32);
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function phonesMatch(a: unknown, b: unknown): boolean {
  const da = String(a || '').replace(/\D/g, '');
  const db = String(b || '').replace(/\D/g, '');
  return da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10);
}

async function loadTickets(order: any) {
  const participants: any[] = await Participant.find({ orderId: order._id, deletedAt: null }).lean();
  const grp: any = await Group.findOne({ orderId: order._id }).lean();

  return {
    order: {
      reference: order.reference,
      currency: order.currency,
      totalMinor: order.totalMinor,
      isGroup: !!order.isGroup,
      groupName: order.groupName || null,
    },
    participants: participants.map((at) => ({
      id: String(at._id),
      refCode: at.refCode,
      name: at.name,
      status: at.status,
      qrToken: qrTokenFor(at._id),
    })),
    group: grp
      ? {
          id: String(grp._id),
          totalSeats: grp.totalSeats,
          claimedSeats: grp.claimedSeats,
        }
      : null,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function attendanceModeOrFallback(value: unknown): string {
  return typeof value === 'string' && (ATTENDANCE_MODES as readonly string[]).includes(value)
    ? value
    : 'not_sure';
}

function validateParticipant(a: any): { ok: true; value: any } | { ok: false; error: string } {
  if (!a || typeof a !== 'object') return { ok: false, error: 'Participant must be an object' };

  if (!a.name || typeof a.name !== 'string' || !a.name.trim())
    return { ok: false, error: 'Participant name is required' };

  const phoneE164 = toE164(a.phoneE164);
  if (!phoneE164) return { ok: false, error: 'Participant phone is invalid' };

  if (a.email && !EMAIL_RE.test(a.email))
    return { ok: false, error: 'Participant email is invalid' };

  const country = (a.country || 'Nigeria').trim();

  if (country === 'Nigeria' && !a.state)
    return { ok: false, error: 'State is required for Nigeria participants' };

  const isMinor = !!a.isMinor;
  if (isMinor) {
    if (!a.guardianName || !a.guardianName.trim())
      return { ok: false, error: 'Guardian name is required for minors' };
    if (!toE164(a.guardianPhoneE164))
      return { ok: false, error: 'Guardian phone is invalid for minors' };
  }

  if (!a.ticketTypeId || !mongoose.isValidObjectId(a.ticketTypeId))
    return { ok: false, error: 'Participant ticketTypeId is invalid' };

  return {
    ok: true,
    value: {
      ticketTypeId: a.ticketTypeId,
      name: a.name.trim(),
      phoneE164,
      email: a.email ? a.email.trim().toLowerCase() : null,
      country,
      state: a.state ? a.state.trim() : null,
      chapterZone: a.chapterZone ? a.chapterZone.trim() : null,
      attendanceMode: attendanceModeOrFallback(a.attendanceMode),
      isMinor,
      guardianName: isMinor ? a.guardianName.trim() : null,
      guardianPhoneE164: isMinor ? toE164(a.guardianPhoneE164) : null,
    },
  };
}

async function abortWith(session: mongoose.ClientSession, res: Response, status: number, message: string) {
  if (session.inTransaction()) await session.abortTransaction();
  return res.status(status).json({ error: message });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type PaymentProvider = 'paystack' | 'paypal';

const PAID_STATUS = 'paid';
const PENDING_STATUS = (ORDER_STATUSES as readonly string[]).includes('pending_payment')
  ? 'pending_payment'
  : 'draft';

function providerFor(currency: string): PaymentProvider {
  return currency === 'NGN' ? 'paystack' : 'paypal';
}

function providerConfigured(provider: PaymentProvider): boolean {
  if (provider === 'paystack') return !!process.env.PAYSTACK_SECRET_KEY;
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function frontendUrl(): string {
  return (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
}

function minorToDecimal(minor: number): string {
  return (minor / 100).toFixed(2);
}

const MAX_TICKETS = (() => {
  const n = Number(process.env.MAX_TICKETS);
  return Number.isInteger(n) && n > 0 ? n : 20000;
})();

function envTicketPrices(): { currency: string; amountMinor: number }[] {
  const out: { currency: string; amountMinor: number }[] = [];
  for (const c of CURRENCIES as readonly string[]) {
    const raw = process.env[`TICKET_PRICE_${c}`];
    if (!raw) continue;
    const major = Number(raw);
    if (!Number.isFinite(major) || major <= 0) continue;
    out.push({ currency: c, amountMinor: Math.round(major * 100) });
  }
  return out;
}

let ensuringTicketType: Promise<any | null> | null = null;

async function ensureStandardTicketType(): Promise<any | null> {
  const prices = envTicketPrices();
  if (prices.length === 0) return null;

  if (!ensuringTicketType) {
    ensuringTicketType = (async () => {
      try {
        const name = (process.env.TICKET_NAME || '').trim() || 'Participant Pass';
        const doc: any = await TicketType.findOneAndUpdate(
          { name },
          { $setOnInsert: { isActive: true, prices } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return doc && doc.isActive ? doc : null;
      } finally {
        ensuringTicketType = null;
      }
    })();
  }
  return ensuringTicketType;
}

async function getStandardTicketType(): Promise<any | null> {
  const pinned = process.env.STANDARD_TICKET_TYPE_ID;
  const filter: any = { isActive: true };
  if (pinned) filter._id = pinned;

  let found: any[] = await TicketType.find(filter);
  if (found.length === 0 && !pinned) {
    const created = await ensureStandardTicketType();
    if (created) found = [created];
  }
  if (found.length > 1) {
    throw new Error('More than one active ticket type found. Set STANDARD_TICKET_TYPE_ID.');
  }
  return found[0] || null;
}

async function countTicketsTaken(ticketTypeId: any): Promise<number> {
  const rows: any[] = await Order.aggregate([
    {
      $match: {
        ticketTypeId,
        $or: [
          { status: PAID_STATUS },
          { status: PENDING_STATUS, expiresAt: { $gt: new Date() } },
        ],
      },
    },
    { $group: { _id: null, taken: { $sum: { $ifNull: ['$seats', 0] } } } },
  ]);
  return rows[0]?.taken ?? 0;
}

async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || typeof token !== 'string') return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data: any = await r.json().catch(() => ({}));
  return !!data.success;
}

async function initPaystack(order: any) {
  const email =
    order.payerEmail ||
    `${String(order.payerPhoneE164).replace(/\D/g, '')}@${process.env.PAYSTACK_FALLBACK_EMAIL_DOMAIN}`;

  const r = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: order.totalMinor,
      currency: 'NGN',
      reference: order.reference,
      callback_url: `${frontendUrl()}/payment/status?ref=${encodeURIComponent(order.reference)}&access=${accessTokenFor(order._id)}`,
      metadata: { orderId: String(order._id), isGroup: !!order.isGroup },
    }),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(`Paystack initialize failed: ${data.message || r.status}`);
  }
  return {
    provider: 'paystack' as const,
    providerRef: String(data.data.reference || order.reference),
    checkoutUrl: String(data.data.authorization_url),
  };
}

async function verifyPaystack(order: any): Promise<'paid' | 'pending' | 'failed'> {
  const r = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(order.providerRef)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  const data: any = await r.json().catch(() => ({}));

  if (r.status === 404) return 'pending';
  if (!r.ok || !data.status || !data.data) throw new Error(`Paystack verify failed: ${data.message || r.status}`);

  const tx = data.data;
  if (tx.status === 'success') {
    if (tx.currency !== order.currency || Number(tx.amount) !== Number(order.totalMinor)) {
      console.error('[verify] Paystack amount/currency mismatch', {
        reference: order.reference,
        paid: tx.amount,
        expected: order.totalMinor,
      });
      return 'failed';
    }
    return 'paid';
  }
  if (tx.status === 'failed' || tx.status === 'reversed') return 'failed';
  return 'pending';
}

function paypalBase(): string {
  return process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function paypalAccessToken(): Promise<string> {
  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) throw new Error('PayPal auth failed');
  return data.access_token;
}

async function initPaypal(order: any) {
  const accessToken = await paypalAccessToken();
  const ref = encodeURIComponent(order.reference);
  const access = accessTokenFor(order._id);

  const r = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': order.idempotencyKey,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: order.reference,
          custom_id: order.reference,
          amount: {
            currency_code: order.currency,
            value: minorToDecimal(order.totalMinor),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${frontendUrl()}/payment/status?ref=${ref}&access=${access}`,
            cancel_url: `${frontendUrl()}/payment/status?ref=${ref}&access=${access}&cancelled=1`,
          },
        },
      },
    }),
  });
  const data: any = await r.json().catch(() => ({}));
  const link = (data.links || []).find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!r.ok || !data.id || !link) {
    throw new Error(`PayPal create order failed: ${data.message || r.status}`);
  }
  return { provider: 'paypal' as const, providerRef: String(data.id), checkoutUrl: String(link.href) };
}

function judgePaypalOrder(order: any, data: any): 'paid' | 'pending' | 'failed' {
  if (data.status !== 'COMPLETED') return data.status === 'VOIDED' ? 'failed' : 'pending';

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) return 'pending';
  if (capture.status === 'PENDING') return 'pending';
  if (capture.status !== 'COMPLETED') return 'failed';

  if (
    capture.amount?.currency_code !== order.currency ||
    capture.amount?.value !== minorToDecimal(order.totalMinor)
  ) {
    console.error('[verify] PayPal amount/currency mismatch', {
      reference: order.reference,
      paid: capture.amount,
      expected: minorToDecimal(order.totalMinor),
    });
    return 'failed';
  }
  return 'paid';
}

async function capturePaypal(order: any): Promise<'paid' | 'pending' | 'failed'> {
  const accessToken = await paypalAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const r = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(order.providerRef)}/capture`, {
    method: 'POST',
    headers: { ...headers, 'PayPal-Request-Id': `cap_${order.reference}` },
    body: '{}',
  });
  const data: any = await r.json().catch(() => ({}));

  if (r.ok) return judgePaypalOrder(order, data);

  const issues: string[] = (data.details || []).map((d: any) => d.issue);
  if (issues.includes('ORDER_NOT_APPROVED')) return 'pending';

  if (issues.includes('ORDER_ALREADY_CAPTURED')) {
    const g = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(order.providerRef)}`, { headers });
    const current: any = await g.json().catch(() => ({}));
    if (!g.ok) throw new Error('PayPal order lookup failed');
    return judgePaypalOrder(order, current);
  }

  throw new Error(`PayPal capture failed: ${data.message || r.status}`);
}

async function initializeProvider(order: any) {
  return order.currency === 'NGN' ? initPaystack(order) : initPaypal(order);
}

async function saveProviderInfo(
  order: any,
  info: { provider: string; providerRef: string; checkoutUrl: string }
) {
  await Payment.updateOne(
    { orderId: order._id, provider: info.provider },
    {
      $set: {
        providerRef: info.providerRef,
        checkoutUrl: info.checkoutUrl,
        status: 'initiated',
        currency: order.currency,
        amountMinor: order.totalMinor,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/register', async (_req: Request, res: Response) => {
  try {
    const tt = await getStandardTicketType();

    const pricesMinor: Record<string, number> = {};
    const currencyAvailable: Record<string, boolean> = {};
    const providerByCurrency: Record<string, PaymentProvider> = {};

    for (const c of CURRENCIES as readonly string[]) {
      const price = tt?.prices?.find((p: any) => p.currency === c);
      const provider = providerFor(c);
      if (price) pricesMinor[c] = price.amountMinor;
      providerByCurrency[c] = provider;
      currencyAvailable[c] = !!price && providerConfigured(provider);
    }

    const taken = tt ? await countTicketsTaken(tt._id) : 0;
    const remaining = Math.max(0, MAX_TICKETS - taken);
    const soldOut = !!tt && remaining === 0;
    const registrationOpen = !!tt && !soldOut && process.env.REGISTRATION_OPEN !== 'false';

    const payload: any = {
      pricesMinor,
      currencyAvailable,
      providerByCurrency,
      registrationOpen,
      ticketsRemaining: tt ? remaining : null,
    };

    if (!registrationOpen) {
      payload.closedReason = !tt
        ? envTicketPrices().length === 0
          ? 'no_ticket_price_configured'
          : 'no_active_ticket_type'
        : soldOut
          ? 'sold_out'
          : 'closed_by_REGISTRATION_OPEN_env';
    }

    if (process.env.NODE_ENV !== 'production') {
      const nativeDb: any = mongoose.connection.db;
      const names: string[] = nativeDb
        ? (await nativeDb.listCollections().toArray()).map((c: any) => c.name)
        : [];

      const collectionCounts: Record<string, number | string> = {};
      const sampleKeys: Record<string, string[]> = {};
      for (const n of names) {
        try {
          collectionCounts[n] = await nativeDb.collection(n).estimatedDocumentCount();
        } catch {
          collectionCounts[n] = 'n/a';
        }
      }
      for (const n of new Set([TicketType.collection.name, ...names.filter((x) => /ticket/i.test(x))])) {
        try {
          const doc = await nativeDb.collection(n).findOne({});
          sampleKeys[n] = doc ? Object.keys(doc) : [];
        } catch {
          sampleKeys[n] = [];
        }
      }

      payload.debug = {
        database: mongoose.connection.name,
        ticketTypeModelCollection: TicketType.collection.name,
        ticketTypesTotal: await TicketType.countDocuments({}),
        ticketTypesActive: await TicketType.countDocuments({ isActive: true }),
        pinnedTicketTypeId: process.env.STANDARD_TICKET_TYPE_ID || null,
        collectionCounts,
        sampleKeys,
        maxTickets: MAX_TICKETS,
        ticketsTaken: tt ? taken : null,
        paystackKeySet: providerConfigured('paystack'),
        paypalKeysSet: providerConfigured('paypal'),
      };
      console.log('[GET /register] debug', payload.debug, 'closedReason:', payload.closedReason || null);
    }

    res.set('Cache-Control', 'no-store');
    return res.json(payload);
  } catch (err) {
    console.error('[GET /register] error:', err);
    return res.status(500).json({ error: 'Registration configuration is unavailable.' });
  }
});

async function resumeCheckout(order: any, res: Response) {
  if (order.status === PAID_STATUS) {
    return res.status(409).json({ error: 'This order has already been paid.', reference: order.reference });
  }
  const payment: any = await Payment.findOne({ orderId: order._id }).lean();
  if (order.expiresAt && new Date(order.expiresAt).getTime() < Date.now() && !payment?.checkoutUrl) {
    return res.status(410).json({ error: 'This checkout session expired. Please start again.' });
  }

  let checkoutUrl = payment?.checkoutUrl as string | undefined;
  if (!checkoutUrl) {
    const info = await initializeProvider(order);
    await saveProviderInfo(order, info);
    checkoutUrl = info.checkoutUrl;
  }
  return res.json({ reference: order.reference, checkoutUrl });
}

async function createPendingOrder(input: {
  idempotencyKey: string;
  currency: string;
  totalMinor: number;
  ticketTypeId: any;
  payer: { name: string; phoneE164: string; email: string | null };
  seats: number;
  attendanceMode: string;
  attendanceCounts: { physically: number; online: number; not_sure: number } | null;
  participant: any;
  group: { name: string; totalSeats: number } | null;
}) {
  const session = await mongoose.startSession();
  try {
    let order: any = null;

    await session.withTransaction(async () => {
      [order] = await Order.create(
        [
          {
            reference: generateRefCode(),
            idempotencyKey: input.idempotencyKey,
            status: PENDING_STATUS,
            currency: input.currency,
            totalMinor: input.totalMinor,
            feeMinor: 0,
            payerName: input.payer.name,
            payerPhoneE164: input.payer.phoneE164,
            payerEmail: input.payer.email,
            isGroup: !!input.group,
            groupName: input.group?.name || null,
            attendanceMode: input.attendanceMode,
            seats: input.seats,
            ticketTypeId: input.ticketTypeId,
            expiresAt: new Date(Date.now() + 1000 * 60 * 30),
          },
        ],
        { session }
      );

      let createdGroup: any = null;
      if (input.group) {
        [createdGroup] = await Group.create(
          [
            {
              orderId: order._id,
              chapterZoneName: input.group.name,
              leaderName: input.payer.name,
              leaderPhoneE164: input.payer.phoneE164,
              leaderEmail: input.payer.email,
              totalSeats: input.group.totalSeats,
              attendanceCounts: input.attendanceCounts,
              claimedSeats: 1,
              managementToken: generateToken(32),
            },
          ],
          { session }
        );
      }

      const [participant] = await Participant.create(
        [
          {
            orderId: order._id,
            groupId: createdGroup ? createdGroup._id : null,
            ticketTypeId: input.ticketTypeId,
            refCode: generateRefCode(),
            name: input.participant.name,
            phoneE164: input.participant.phoneE164,
            email: input.participant.email,
            country: input.participant.country,
            state: input.participant.state,
            chapterZone: input.participant.chapterZone,
            attendanceMode: input.participant.attendanceMode,
            isMinor: input.participant.isMinor,
            guardianName: input.participant.guardianName,
            guardianPhoneE164: input.participant.guardianPhoneE164,
            status: 'unconfirmed',
            qrTokenHash: hashQrToken(generateToken(24)),
          },
        ],
        { session }
      );

      if (createdGroup) {
        const seats: any[] = [
          {
            groupId: createdGroup._id,
            inviteCode: generateToken(12),
            participantId: participant._id,
            isClaimed: true,
            claimedAt: new Date(),
          },
        ];
        for (let i = 1; i < input.group!.totalSeats; i++) {
          seats.push({
            groupId: createdGroup._id,
            inviteCode: generateToken(12),
            participantId: null,
            isClaimed: false,
          });
        }
        await GroupSeat.insertMany(seats, { session, ordered: true });
      }
    });

    return order;
  } finally {
    session.endSession();
  }
}

router.post('/checkout/initialize', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    const rawKey = req.header('Idempotency-Key') || '';
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(rawKey)) {
      return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
    }
    const idempotencyKey = `chk_${rawKey}`;

    const existing: any = await Order.findOne({ idempotencyKey }).lean();
    if (existing) {
      try {
        return await resumeCheckout(existing, res);
      } catch (err) {
        console.error('[POST /checkout/initialize] resume failed:', err);
        return res.status(502).json({ error: 'Could not start payment. Please try again.' });
      }
    }

    if (!(await verifyTurnstile(body.turnstileToken, req.ip))) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    const { currency, payer, chapterZone, group } = body;
    const isGroup = !!body.isGroup;

    if (!currency || !(CURRENCIES as readonly string[]).includes(currency)) {
      return res.status(400).json({ error: `currency must be one of: ${CURRENCIES.join(', ')}` });
    }
    if (body.consent !== true) {
      return res.status(400).json({ error: 'Consent is required' });
    }

    const attendanceMode = typeof body.attendanceMode === 'string' && (ATTENDANCE_MODES as readonly string[]).includes(body.attendanceMode)
      ? body.attendanceMode
      : null;
    if (!attendanceMode) {
      return res.status(400).json({ error: 'Please select how you will attend: physically, online, or not sure.' });
    }

    const provider = providerFor(currency);
    if (!providerConfigured(provider)) {
      return res.status(503).json({ error: `Checkout is unavailable for ${currency} right now.` });
    }
    if (!frontendUrl()) {
      console.error('[POST /checkout/initialize] FRONTEND_URL is not set');
      return res.status(503).json({ error: 'Checkout is unavailable right now.' });
    }
    if (!process.env.QR_TOKEN_SECRET || process.env.QR_TOKEN_SECRET.length < 16) {
      console.error('[POST /checkout/initialize] QR_TOKEN_SECRET is not set (min 16 chars)');
      return res.status(503).json({ error: 'Checkout is unavailable right now.' });
    }

    const payerName = typeof payer?.name === 'string' ? payer.name.trim() : '';
    if (!payerName) return res.status(400).json({ error: 'Name is required' });

    // Accept both the current `phoneE164` key and the legacy `phone` key so
    // older clients do not fail on a valid number.
    const payerPhone = toE164(payer?.phoneE164 ?? payer?.phone);
    if (!payerPhone) {
      return res.status(400).json({
        error: 'Phone number is invalid. Use a format like +234 801 234 5678 or 08012345678.',
      });
    }

    const payerEmail =
      typeof payer?.email === 'string' && payer.email.trim() ? payer.email.trim().toLowerCase() : null;
    if (!payerEmail || !EMAIL_RE.test(payerEmail)) {
      return res.status(400).json({
        error: 'A valid email address is required to process your payment with Paystack.',
      });
    }

    const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'Nigeria';
    const state = typeof body.state === 'string' && body.state.trim() ? body.state.trim() : null;
    if (country === 'Nigeria' && !state) {
      return res.status(400).json({ error: 'State is required for Nigerian residents' });
    }

    const isMinor = !isGroup && !!body.isMinor;
    let guardianName: string | null = null;
    let guardianPhoneE164: string | null = null;
    if (isMinor) {
      guardianName = typeof body.guardianName === 'string' ? body.guardianName.trim() : '';
      if (!guardianName) return res.status(400).json({ error: 'Guardian name is required for minors' });
      guardianPhoneE164 = toE164(body.guardianPhone);
      if (!guardianPhoneE164) return res.status(400).json({ error: 'Guardian phone is invalid' });
    }

    let seats = 1;
    let groupInput: { name: string; totalSeats: number } | null = null;
    let attendanceCounts: { physically: number; online: number; not_sure: number } | null = null;
    if (isGroup) {
      const name = typeof group?.name === 'string' ? group.name.trim() : '';
      if (!name) return res.status(400).json({ error: 'Chapter / Zone name is required' });
      if (!Number.isInteger(group?.totalSeats) || group.totalSeats < 2 || group.totalSeats > 500) {
        return res.status(400).json({ error: 'totalSeats must be a whole number between 2 and 500' });
      }
      seats = group.totalSeats;
      const rawCounts = body.groupAttendance;
      const physically = Number(rawCounts?.physically);
      const online = Number(rawCounts?.online);
      const notSure = Number(rawCounts?.not_sure);
      if (![physically, online, notSure].every((n) => Number.isInteger(n) && n >= 0) || physically + online + notSure !== seats) {
        return res.status(400).json({ error: `Group attendance counts must be whole numbers that add up to ${seats} participants.` });
      }
      attendanceCounts = { physically, online, not_sure: notSure };
    }

    const tt = await getStandardTicketType();
    if (!tt || process.env.REGISTRATION_OPEN === 'false') {
      return res.status(403).json({ error: 'Online registration is closed.' });
    }
    const price = tt.prices?.find((p: any) => p.currency === currency);
    if (!price || !Number.isInteger(price.amountMinor)) {
      return res.status(400).json({ error: `No price is set for ${currency}` });
    }
    let totalMinor = price.amountMinor * seats;
    if (currency === 'NGN' && body.customAmountMinor !== undefined) {
      const customAmountMinor = Number(body.customAmountMinor);
      const minimumContributionMinor = seats * 200_000;
      if (!Number.isInteger(customAmountMinor) || customAmountMinor < minimumContributionMinor) {
        return res.status(400).json({ error: 'Please enter a valid contribution amount.' });
      }
      totalMinor = customAmountMinor;
    }

    const remaining = MAX_TICKETS - (await countTicketsTaken(tt._id));
    if (remaining <= 0) {
      return res.status(409).json({ error: 'Tickets are sold out.' });
    }
    if (seats > remaining) {
      return res.status(409).json({ error: `Only ${remaining} ticket${remaining === 1 ? '' : 's'} left.` });
    }

    let order: any;
    try {
      order = await createPendingOrder({
        idempotencyKey,
        currency,
        totalMinor,
        ticketTypeId: tt._id,
        payer: { name: payerName, phoneE164: payerPhone, email: payerEmail },
        seats,
        attendanceMode,
        attendanceCounts,
        participant: {
          name: payerName,
          phoneE164: payerPhone,
          email: payerEmail,
          country,
          state: country === 'Nigeria' ? state : null,
          chapterZone: typeof chapterZone === 'string' && chapterZone.trim() ? chapterZone.trim() : null,
          attendanceMode,
          isMinor,
          guardianName,
          guardianPhoneE164,
        },
        group: groupInput,
      });
    } catch (err: any) {
      if (err && err.code === 11000) {
        const raced: any = await Order.findOne({ idempotencyKey }).lean();
        if (raced) return await resumeCheckout(raced, res);
        return res.status(409).json({ error: 'Duplicate value. Please retry.' });
      }
      throw err;
    }

    try {
      const info = await initializeProvider(order);
      await saveProviderInfo(order, info);
      return res.status(201).json({ reference: order.reference, checkoutUrl: info.checkoutUrl });
    } catch (err) {
      console.error('[POST /checkout/initialize] provider error:', err);
      return res.status(502).json({ error: 'Could not start payment. Please try again.' });
    }
  } catch (err) {
    console.error('[POST /checkout/initialize] error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

async function markOrderPaid(order: any): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const won = await Order.findOneAndUpdate(
        { _id: order._id, status: { $ne: PAID_STATUS } },
        { $set: { status: PAID_STATUS, paidAt: new Date() } },
        { session, new: true }
      );
      if (!won) return;

      await Payment.updateOne(
        { orderId: order._id },
        { $set: { status: 'completed', updatedAt: new Date() } },
        { session }
      );

      const participants: any[] = await Participant.find({ orderId: order._id }).session(session);
      for (const at of participants) {
        at.qrTokenHash = hashQrToken(qrTokenFor(at._id));
        at.status = 'confirmed';
        await at.save({ session });
      }
    });
  } finally {
    session.endSession();
  }
}

router.post('/checkout/verify', async (req: Request, res: Response) => {
  try {
    const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    if (!reference) return res.status(400).json({ error: 'reference is required' });

    const order: any = await Order.findOne({ reference }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== PAID_STATUS) {
      const payment: any = await Payment.findOne({ orderId: order._id }).lean();
      if (!payment) return res.json({ status: 'pending', reference });

      const target = { ...order, provider: payment.provider, providerRef: payment.providerRef };
      const outcome = payment.provider === 'paystack' ? await verifyPaystack(target) : await capturePaypal(target);
      if (outcome !== 'paid') return res.json({ status: outcome, reference });

      await markOrderPaid(order);
    }

    const access = typeof req.body?.access === 'string' ? req.body.access : '';
    const allowed =
      (!!access && safeEqual(access, accessTokenFor(order._id))) ||
      phonesMatch(req.body?.phone, order.payerPhoneE164);

    return res.json({
      status: 'paid',
      reference,
      tickets: allowed ? await loadTickets(order) : null,
    });
  } catch (err) {
    console.error('[POST /checkout/verify] error:', err);
    return res.status(502).json({ error: 'Could not confirm payment yet. Please retry.' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { currency, buyer, participants, group } = req.body || {};

    // 👇 FIXED TYPESCRIPT ERROR HERE
    if (!currency || !(CURRENCIES as readonly string[]).includes(currency)) {
      return await abortWith(session, res, 400, `currency must be one of: ${CURRENCIES.join(', ')}`);
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return await abortWith(session, res, 400, 'At least one participant is required');
    }

    if (participants.length > 100) {
      return await abortWith(session, res, 400, 'Max 100 participants per order');
    }

    const validated = [];
    for (let i = 0; i < participants.length; i++) {
      const v = validateParticipant(participants[i]);
      if (v.ok === false) return await abortWith(session, res, 400, `Participants[${i}]: ${v.error}`);
      validated.push(v.value);
    }

    let validLeaderPhone = null;
    if (group) {
      if (!group.chapterZoneName || !group.leaderName || !group.leaderPhoneE164) {
        return await abortWith(session, res, 400, 'group requires chapterZoneName, leaderName, leaderPhoneE164');
      }

      validLeaderPhone = toE164(group.leaderPhoneE164);
      if (!validLeaderPhone) {
        return await abortWith(session, res, 400, 'group.leaderPhoneE164 is invalid');
      }

      if (!Number.isInteger(group.totalSeats) || group.totalSeats < validated.length) {
        return await abortWith(session, res, 400, 'group.totalSeats must be >= number of participants');
      }

      if (group.totalSeats !== validated.length) {
        return await abortWith(session, res, 400, 'group.totalSeats must equal participants.length in this version');
      }
    }

    const ticketTypeIds = [...new Set(validated.map((a) => a.ticketTypeId))];

    const ticketTypes = await TicketType.find({
      _id: { $in: ticketTypeIds },
      isActive: true,
    }).session(session);

    const byId = new Map(ticketTypes.map((t: any) => [t._id.toString(), t]));

    let totalMinor = 0;

    for (const a of validated) {
      const tt = byId.get(a.ticketTypeId.toString());
      if (!tt) {
        return await abortWith(session, res, 400, `Ticket type ${a.ticketTypeId} is not available`);
      }

      const price = tt.prices.find((p: any) => p.currency === currency);
      if (!price) {
        return await abortWith(session, res, 400, `Ticket type ${a.ticketTypeId} has no price in ${currency}`);
      }

      totalMinor += price.amountMinor;
    }

    const [order] = await Order.create(
      [
        {
          reference: generateRefCode(),
          idempotencyKey: `reg_${crypto.randomBytes(16).toString('hex')}`,
          status: 'draft',
          currency,
          totalMinor,
          feeMinor: 0,
          payerName: buyer?.name || validated[0].name,
          payerPhoneE164: buyer?.phone ? toE164(buyer.phone) : validated[0].phoneE164,
          payerEmail: buyer?.email ? String(buyer.email).trim().toLowerCase() : null,
          isGroup: !!group,
          groupName: group?.chapterZoneName || null,
          attendanceMode: validated[0].attendanceMode,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        },
      ],
      { session }
    );

    let createdGroup = null;
    if (group) {
      const managementToken = generateToken(32);

      [createdGroup] = await Group.create(
        [
          {
            orderId: order._id,
            chapterZoneName: group.chapterZoneName.trim(),
            leaderName: group.leaderName.trim(),
            leaderPhoneE164: validLeaderPhone,
            leaderEmail: group.leaderEmail ? String(group.leaderEmail).trim().toLowerCase() : null,
            totalSeats: group.totalSeats,
            attendanceCounts: group.attendanceCounts,
            claimedSeats: 0,
            managementToken,
          },
        ],
        { session }
      );
    }

    const usedRefCodes = new Set();
    const usedQrHashes = new Set();
    const participantDocs = [];
    const rawQrTokens = [];

    for (const a of validated) {
      let refCode;
      for (let i = 0; i < 5; i++) {
        const candidate = generateRefCode();
        if (!usedRefCodes.has(candidate)) {
          refCode = candidate;
          break;
        }
      }
      if (!refCode) return await abortWith(session, res, 500, 'Could not allocate a unique ref code');
      usedRefCodes.add(refCode);

      let rawQr = '';
      let qrHash = '';
      let qrOk = false;
      for (let i = 0; i < 5; i++) {
        rawQr = generateToken(24);
        qrHash = hashQrToken(rawQr);
        if (!usedQrHashes.has(qrHash)) {
          qrOk = true;
          break;
        }
      }
      if (!qrOk) return await abortWith(session, res, 500, 'Could not allocate a unique QR token');
      usedQrHashes.add(qrHash);
      rawQrTokens.push(rawQr);

      participantDocs.push({
        orderId: order._id,
        groupId: createdGroup ? createdGroup._id : null,
        ticketTypeId: a.ticketTypeId,
        refCode,
        name: a.name,
        phoneE164: a.phoneE164,
        email: a.email,
        country: a.country,
        state: a.state,
        chapterZone: a.chapterZone,
        attendanceMode: a.attendanceMode,
        isMinor: a.isMinor,
        guardianName: a.guardianName,
        guardianPhoneE164: a.guardianPhoneE164,
        status: 'unconfirmed',
        qrTokenHash: qrHash,
      });
    }

    const createdParticipants = await Participant.insertMany(participantDocs, { session, ordered: true });

    if (createdGroup) {
      const seats = createdParticipants.map((at) => ({
        groupId: createdGroup!._id,
        inviteCode: generateToken(12),
        participantId: at._id,
        isClaimed: true,
        claimedAt: new Date(),
      }));

      await GroupSeat.insertMany(seats, { session, ordered: true });

      createdGroup.claimedSeats = createdParticipants.length;
      await createdGroup.save({ session });
    }

    await session.commitTransaction();

    return res.status(201).json({
      order: {
        id: order._id,
        reference: order.reference,
        currency: order.currency,
        totalMinor: order.totalMinor,
        status: order.status,
      },
      group: createdGroup
        ? {
            id: createdGroup._id,
            managementToken: createdGroup.managementToken,
            claimedSeats: createdGroup.claimedSeats,
            totalSeats: createdGroup.totalSeats,
          }
        : null,
      participants: createdParticipants.map((at, i) => ({
        id: at._id,
        refCode: at.refCode,
        qrToken: rawQrTokens[i],
        ticketTypeId: at.ticketTypeId,
        name: at.name,
      })),
    });
  } catch (err: any) {
    if (session.inTransaction()) await session.abortTransaction();

    if (err && err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({ error: `Duplicate value for ${field}. Please retry.` });
    }

    console.error('[POST /registrations] error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  } finally {
    session.endSession();
  }
});

export default router;