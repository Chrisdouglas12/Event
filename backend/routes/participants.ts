// routes/participants.ts
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';

import { Order, Payment } from '../schema/orders.ts';
import { ATTENDANCE_MODES, CURRENCIES, GENDERS } from '../constants/enums.ts';
import { TicketType, Participant, Group, GroupSeat } from '../schema/participants.ts';
import { toE164 } from '../lib/phone.ts';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAID_STATUS = 'paid';

type PaymentProvider = 'paystack' | 'paypal';
type Gender = 'male' | 'female';
type AttendanceMode = 'physically' | 'online' | 'not_sure';

type AttendanceCounts = { physically: number; online: number; not_sure: number };

interface CheckoutData {
  v: 1;
  reference: string;
  idempotencyKey: string;
  currency: string;
  totalMinor: number;
  provider: PaymentProvider;
  providerRef: string;
  checkoutUrl: string;
  createdAt: number;
  expiresAt: number;
  payer: { name: string; phoneE164: string; email: string };
  country: string;
  state: string | null;
  chapterZone: string | null;
  attendanceMode: AttendanceMode;
  attendanceCounts: AttendanceCounts | null;
  gender: Gender | null;
  firstTime: boolean;
  isMinor: boolean;
  guardianName: string | null;
  guardianPhoneE164: string | null;
  isGroup: boolean;
  seats: number;
  ticketTypeId: string;
  group: {
    name: string;
    totalSeats: number;
    genderCounts: { male: number; female: number };
    firstTimeCounts: { yes: number; no: number };
    inviteeCount: number;
    hasChildren: boolean;
    childCount: number;
  } | null;
}

function generateRefCode(): string {
  const bytes = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  return `HGC-${out}`;
}

function generateToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashQrToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function checkoutSecret(): string {
  const secret = process.env.CHECKOUT_TOKEN_SECRET || process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('CHECKOUT_TOKEN_SECRET or QR_TOKEN_SECRET must be set (min 16 chars)');
  }
  return secret;
}

function hmac(value: string): string {
  return crypto.createHmac('sha256', checkoutSecret()).update(value).digest('base64url');
}

function referenceFor(idempotencyKey: string): string {
  const digest = crypto.createHmac('sha256', checkoutSecret())
    .update(`checkout-reference:${idempotencyKey}`)
    .digest();
  let out = '';
  for (let i = 0; i < 12; i++) out += REF_ALPHABET[digest[i] % REF_ALPHABET.length];
  return `HGC-${out}`;
}

function signCheckout(data: CheckoutData): string {
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${encoded}.${hmac(encoded)}`;
}

function readCheckout(token: unknown): CheckoutData | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature || !safeEqual(signature, hmac(encoded))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (parsed?.v !== 1 || typeof parsed.reference !== 'string') return null;
    return parsed as CheckoutData;
  } catch {
    return null;
  }
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

function accessTokenFor(value: unknown): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 16) throw new Error('QR_TOKEN_SECRET is not set (min 16 chars)');
  return crypto
    .createHmac('sha256', secret)
    .update(`order-access:${String(value)}`)
    .digest('base64url')
    .slice(0, 32);
}

function groupTokenFor(orderId: unknown): string {
  return `HGCGROUP.${String(orderId)}.${accessTokenFor(orderId)}`;
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

function attendanceModeOrFallback(value: unknown): AttendanceMode {
  return typeof value === 'string' && (ATTENDANCE_MODES as readonly string[]).includes(value)
    ? value as AttendanceMode
    : 'not_sure';
}

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
  const value = Number(process.env.MAX_TICKETS);
  return Number.isInteger(value) && value > 0 ? value : 20000;
})();

function envTicketPrices(): { currency: string; amountMinor: number }[] {
  const out: { currency: string; amountMinor: number }[] = [];
  for (const currency of CURRENCIES as readonly string[]) {
    const raw = process.env[`TICKET_PRICE_${currency}`];
    if (!raw) continue;
    const major = Number(raw);
    if (!Number.isFinite(major) || major <= 0) continue;
    out.push({ currency, amountMinor: Math.round(major * 100) });
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
    { $match: { ticketTypeId, status: PAID_STATUS } },
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

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data: any = await response.json().catch(() => ({}));
  return !!data.success;
}

async function loadTickets(order: any) {
  const participants: any[] = await Participant.find({ orderId: order._id, deletedAt: null }).lean();
  const group: any = order.isGroup
    ? await Group.findOne({ orderId: order._id }).lean()
    : null;

  return {
    order: {
      reference: order.reference,
      currency: order.currency,
      totalMinor: order.totalMinor,
      isGroup: !!order.isGroup,
      groupName: order.groupName || null,
    },
    participants: participants.map((participant) => ({
      id: String(participant._id),
      refCode: participant.refCode,
      name: participant.name,
      status: participant.status,
      qrToken: qrTokenFor(participant._id),
    })),
    group: group
      ? {
          id: String(group._id),
          totalSeats: group.totalSeats,
          claimedSeats: group.claimedSeats,
          managementToken: group.managementToken,
          qrToken: groupTokenFor(order._id),
        }
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT PROVIDERS
// ─────────────────────────────────────────────────────────────────────────────

async function initPaystack(data: CheckoutData) {
  const callbackToken = signCheckout({
    ...data,
    providerRef: data.reference,
    checkoutUrl: '',
  });

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.payer.email,
      amount: data.totalMinor,
      currency: 'NGN',
      reference: data.reference,
      callback_url: `${frontendUrl()}/payment/status?ref=${encodeURIComponent(data.reference)}&access=${encodeURIComponent(accessTokenFor(data.reference))}&ck=${encodeURIComponent(callbackToken)}`,
      metadata: { orderId: data.reference, isGroup: data.isGroup },
    }),
  });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok || !result.status || !result.data?.authorization_url) {
    throw new Error(`Paystack initialize failed: ${result.message || response.status}`);
  }
  return {
    provider: 'paystack' as const,
    providerRef: String(result.data.reference || data.reference),
    checkoutUrl: String(result.data.authorization_url),
  };
}

async function verifyPaystack(data: CheckoutData): Promise<'paid' | 'pending' | 'failed'> {
  const providerRef = data.providerRef || data.reference;
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(providerRef)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  const result: any = await response.json().catch(() => ({}));

  if (response.status === 404) return 'pending';
  if (!response.ok || !result.status || !result.data) {
    throw new Error(`Paystack verify failed: ${result.message || response.status}`);
  }

  const transaction = result.data;
  if (transaction.status === 'success') {
    if (transaction.currency !== data.currency || Number(transaction.amount) !== Number(data.totalMinor)) {
      console.error('[verify] Paystack amount/currency mismatch', {
        reference: data.reference,
        paid: transaction.amount,
        expected: data.totalMinor,
      });
      return 'failed';
    }
    return 'paid';
  }
  if (transaction.status === 'failed' || transaction.status === 'reversed') return 'failed';
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

  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error('PayPal auth failed');
  return data.access_token;
}

async function initPaypal(data: CheckoutData) {
  const accessToken = await paypalAccessToken();
  const callbackToken = signCheckout({ ...data, providerRef: '', checkoutUrl: '' });

  const response = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': data.idempotencyKey,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: data.reference,
          custom_id: data.reference,
          amount: {
            currency_code: data.currency,
            value: minorToDecimal(data.totalMinor),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${frontendUrl()}/payment/status?ref=${encodeURIComponent(data.reference)}&access=${encodeURIComponent(accessTokenFor(data.reference))}&ck=${encodeURIComponent(callbackToken)}`,
            cancel_url: `${frontendUrl()}/payment/status?ref=${encodeURIComponent(data.reference)}&access=${encodeURIComponent(accessTokenFor(data.reference))}&cancelled=1`,
          },
        },
      },
    }),
  });
  const result: any = await response.json().catch(() => ({}));
  const link = (result.links || []).find((entry: any) => entry.rel === 'payer-action' || entry.rel === 'approve');
  if (!response.ok || !result.id || !link) {
    throw new Error(`PayPal create order failed: ${result.message || response.status}`);
  }
  return {
    provider: 'paypal' as const,
    providerRef: String(result.id),
    checkoutUrl: String(link.href),
  };
}

function judgePaypalOrder(data: CheckoutData, result: any): 'paid' | 'pending' | 'failed' {
  if (result.status !== 'COMPLETED') return result.status === 'VOIDED' ? 'failed' : 'pending';

  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) return 'pending';
  if (capture.status === 'PENDING') return 'pending';
  if (capture.status !== 'COMPLETED') return 'failed';

  if (
    capture.amount?.currency_code !== data.currency ||
    capture.amount?.value !== minorToDecimal(data.totalMinor)
  ) {
    console.error('[verify] PayPal amount/currency mismatch', {
      reference: data.reference,
      paid: capture.amount,
      expected: minorToDecimal(data.totalMinor),
    });
    return 'failed';
  }
  return 'paid';
}

async function capturePaypal(data: CheckoutData): Promise<'paid' | 'pending' | 'failed'> {
  if (!data.providerRef) return 'pending';
  const accessToken = await paypalAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const response = await fetch(
    `${paypalBase()}/v2/checkout/orders/${encodeURIComponent(data.providerRef)}/capture`,
    {
      method: 'POST',
      headers: { ...headers, 'PayPal-Request-Id': `cap_${data.reference}` },
      body: '{}',
    }
  );
  const result: any = await response.json().catch(() => ({}));

  if (response.ok) return judgePaypalOrder(data, result);

  const issues: string[] = (result.details || []).map((detail: any) => detail.issue);
  if (issues.includes('ORDER_NOT_APPROVED')) return 'pending';

  if (issues.includes('ORDER_ALREADY_CAPTURED')) {
    const lookup = await fetch(
      `${paypalBase()}/v2/checkout/orders/${encodeURIComponent(data.providerRef)}`,
      { headers }
    );
    const current: any = await lookup.json().catch(() => ({}));
    if (!lookup.ok) throw new Error('PayPal order lookup failed');
    return judgePaypalOrder(data, current);
  }

  throw new Error(`PayPal capture failed: ${result.message || response.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAID FULFILLMENT
// ─────────────────────────────────────────────────────────────────────────────

async function fulfillPaidOrder(data: CheckoutData): Promise<any> {
  const session = await mongoose.startSession();
  let order: any = null;

  try {
    await session.withTransaction(async () => {
      [order] = await Order.create(
        [{
          reference: data.reference,
          idempotencyKey: data.idempotencyKey,
          status: PAID_STATUS,
          disputed: false,
          currency: data.currency,
          totalMinor: data.totalMinor,
          feeMinor: 0,
          payerName: data.payer.name,
          payerPhoneE164: data.payer.phoneE164,
          payerEmail: data.payer.email,
          country: data.country,
          state: data.state,
          isGroup: data.isGroup,
          groupName: data.group?.name || null,
          attendanceMode: data.attendanceMode,
          attendanceCounts: data.attendanceCounts || { physically: 0, online: 0, not_sure: 0 },
          gender: data.gender,
          firstTime: data.firstTime,
          isMinor: data.isMinor,
          genderCounts: data.group?.genderCounts || { male: 0, female: 0 },
          firstTimeCounts: data.group?.firstTimeCounts || { yes: 0, no: 0 },
          inviteeCount: data.group?.inviteeCount || 0,
          hasChildren: data.group?.hasChildren || false,
          childCount: data.group?.childCount || 0,
          seats: data.seats,
          ticketTypeId: data.ticketTypeId,
          paidAt: new Date(),
          expiresAt: new Date(data.expiresAt),
        }],
        { session }
      );

      await Payment.create(
        [{
          orderId: order._id,
          provider: data.provider,
          providerRef: data.providerRef,
          status: 'completed',
          currency: data.currency,
          amountMinor: data.totalMinor,
        }],
        { session }
      );

      let createdGroup: any = null;
      if (data.group) {
        [createdGroup] = await Group.create(
          [{
            orderId: order._id,
            chapterZoneName: data.group.name,
            leaderName: data.payer.name,
            leaderPhoneE164: data.payer.phoneE164,
            leaderEmail: data.payer.email,
            country: data.country,
            state: data.state,
            totalSeats: data.group.totalSeats,
            attendanceCounts: data.attendanceCounts,
            genderCounts: data.group.genderCounts,
            firstTimeCounts: data.group.firstTimeCounts,
            inviteeCount: data.group.inviteeCount,
            hasChildren: data.group.hasChildren,
            childCount: data.group.childCount,
            claimedSeats: data.group.totalSeats,
            managementToken: generateToken(32),
          }],
          { session }
        );
      }

      const participantId = new mongoose.Types.ObjectId();
      const rawQr = qrTokenFor(participantId);
      await Participant.create(
        [{
          _id: participantId,
          orderId: order._id,
          groupId: createdGroup ? createdGroup._id : null,
          ticketTypeId: data.ticketTypeId,
          refCode: generateRefCode(),
          name: data.payer.name,
          phoneE164: data.payer.phoneE164,
          email: data.payer.email,
          country: data.country,
          state: data.state,
          chapterZone: data.chapterZone,
          attendanceMode: data.attendanceMode,
          gender: data.gender,
          firstTime: data.firstTime,
          isChild: data.isMinor,
          isMinor: data.isMinor,
          guardianName: data.guardianName,
          guardianPhoneE164: data.guardianPhoneE164,
          status: 'confirmed',
          qrTokenHash: hashQrToken(rawQr),
        }],
        { session }
      );

      if (createdGroup) {
        const seats: any[] = [];
        for (let index = 0; index < data.group!.totalSeats; index++) {
          seats.push({
            groupId: createdGroup._id,
            inviteCode: generateToken(12),
            participantId: index === 0 ? participantId : null,
            isClaimed: index === 0,
            claimedAt: index === 0 ? new Date() : null,
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

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/register', async (_req: Request, res: Response) => {
  try {
    const ticketType = await getStandardTicketType();
    const pricesMinor: Record<string, number> = {};
    const currencyAvailable: Record<string, boolean> = {};
    const providerByCurrency: Record<string, PaymentProvider> = {};

    for (const currency of CURRENCIES as readonly string[]) {
      const price = ticketType?.prices?.find((entry: any) => entry.currency === currency);
      const provider = providerFor(currency);
      if (price) pricesMinor[currency] = price.amountMinor;
      providerByCurrency[currency] = provider;
      currencyAvailable[currency] = !!price && providerConfigured(provider);
    }

    const taken = ticketType ? await countTicketsTaken(ticketType._id) : 0;
    const remaining = Math.max(0, MAX_TICKETS - taken);
    const soldOut = !!ticketType && remaining === 0;
    const registrationOpen = !!ticketType && !soldOut && process.env.REGISTRATION_OPEN !== 'false';

    const payload: any = {
      pricesMinor,
      currencyAvailable,
      providerByCurrency,
      registrationOpen,
      ticketsRemaining: ticketType ? remaining : null,
    };

    if (!registrationOpen) {
      payload.closedReason = !ticketType
        ? envTicketPrices().length === 0
          ? 'no_ticket_price_configured'
          : 'no_active_ticket_type'
        : soldOut
          ? 'sold_out'
          : 'closed_by_REGISTRATION_OPEN_env';
    }

    res.set('Cache-Control', 'no-store');
    return res.json(payload);
  } catch (error) {
    console.error('[GET /register] error:', error);
    return res.status(500).json({ error: 'Registration configuration is unavailable.' });
  }
});

router.post('/checkout/initialize', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const rawKey = req.header('Idempotency-Key') || '';
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(rawKey)) {
      return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
    }
    const idempotencyKey = `chk_${rawKey}`;

    // A retry from the same browser can reuse the signed session instead of
    // creating another provider checkout. Nothing is written to the database.
    const resumeData = readCheckout(body.checkoutToken);
    if (resumeData && resumeData.idempotencyKey === idempotencyKey) {
      return res.json({
        reference: resumeData.reference,
        checkoutUrl: resumeData.checkoutUrl,
        checkoutToken: signCheckout(resumeData),
      });
    }

    if (!(await verifyTurnstile(body.turnstileToken, req.ip))) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    const { currency, payer, group } = body;
    const isGroup = !!body.isGroup;

    if (!currency || !(CURRENCIES as readonly string[]).includes(currency)) {
      return res.status(400).json({ error: `currency must be one of: ${CURRENCIES.join(', ')}` });
    }
    if (body.consent !== true) {
      return res.status(400).json({ error: 'Consent is required' });
    }

    const provider = providerFor(currency);
    if (!providerConfigured(provider)) {
      return res.status(503).json({ error: `Checkout is unavailable for ${currency} right now.` });
    }
    if (!frontendUrl()) {
      console.error('[POST /checkout/initialize] FRONTEND_URL is not set');
      return res.status(503).json({ error: 'Checkout is unavailable right now.' });
    }

    const payerName = typeof payer?.name === 'string' ? payer.name.trim() : '';
    if (!payerName) return res.status(400).json({ error: 'Name is required' });

    const payerPhone = toE164(payer?.phoneE164 ?? payer?.phone);
    if (!payerPhone) {
      return res.status(400).json({
        error: 'Phone number is invalid. Use a format like +234 801 234 5678 or 08012345678.',
      });
    }

    const payerEmail = typeof payer?.email === 'string' && payer.email.trim()
      ? payer.email.trim().toLowerCase()
      : '';
    if (!EMAIL_RE.test(payerEmail)) {
      return res.status(400).json({ error: 'A valid email address is required for payment.' });
    }

    const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'Nigeria';
    const state = typeof body.state === 'string' && body.state.trim() ? body.state.trim() : null;
    if (country === 'Nigeria' && !state) {
      return res.status(400).json({ error: 'State is required for Nigerian residents' });
    }

    const chapterZone = typeof body.chapterZone === 'string' && body.chapterZone.trim()
      ? body.chapterZone.trim()
      : null;

    const attendanceMode = attendanceModeOrFallback(body.attendanceMode);

    if (!isGroup && !(GENDERS as readonly string[]).includes(body.gender)) {
      return res.status(400).json({ error: 'Please select Gender: Male or Female.' });
    }
    if (!isGroup && typeof body.firstTime !== 'boolean') {
      return res.status(400).json({ error: 'Please answer if this is your first time attending.' });
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
    let attendanceCounts: AttendanceCounts | null = null;
    let groupData: CheckoutData['group'] = null;

    if (isGroup) {
      const name = typeof group?.name === 'string' ? group.name.trim() : '';
      if (!name) return res.status(400).json({ error: 'Chapter / Zone name is required' });
      if (!Number.isInteger(group?.totalSeats) || group.totalSeats < 2 || group.totalSeats > 500) {
        return res.status(400).json({ error: 'totalSeats must be a whole number between 2 and 500' });
      }
      seats = group.totalSeats;

      const readCount = (value: unknown, label: string, max: number) => {
        const count = Number(value);
        if (!Number.isInteger(count) || count < 0 || count > max) {
          throw new Error(`${label} must be a whole number between 0 and ${max}`);
        }
        return count;
      };

      try {
        const physically = readCount(body.groupAttendance?.physically, 'Physical attendance', seats);
        const online = readCount(body.groupAttendance?.online, 'Online attendance', seats);
        const notSure = readCount(body.groupAttendance?.not_sure, 'Not sure attendance', seats);
        const male = readCount(body.genderCounts?.male, 'Male count', seats);
        const female = readCount(body.genderCounts?.female, 'Female count', seats);
        const firstYes = readCount(body.firstTimeCounts?.yes, 'First-time Yes count', seats);
        const firstNo = readCount(body.firstTimeCounts?.no, 'First-time No count', seats);
        const inviteeCount = readCount(body.inviteeCount, 'Invitee count', seats);
        const hasChildren = body.hasChildren === true;
        const childCount = hasChildren ? readCount(body.childCount, 'Children count', seats) : 0;

        if (physically + online + notSure !== seats) {
          throw new Error(`Group attendance counts must add up to ${seats} participants.`);
        }
        if (male + female !== seats) {
          throw new Error(`Male and Female counts must add up to ${seats} participants (children included).`);
        }
        if (firstYes + firstNo !== seats) {
          throw new Error(`First-time Yes and No counts must add up to ${seats} participants.`);
        }
        if (hasChildren && childCount < 1) {
          throw new Error('Children count must be at least 1 when children are attending.');
        }

        attendanceCounts = { physically, online, not_sure: notSure };
        groupData = {
          name,
          totalSeats: seats,
          genderCounts: { male, female },
          firstTimeCounts: { yes: firstYes, no: firstNo },
          inviteeCount,
          hasChildren,
          childCount,
        };
      } catch (error: any) {
        return res.status(400).json({ error: error?.message || 'Invalid group counts' });
      }
    }

    const ticketType = await getStandardTicketType();
    if (!ticketType || process.env.REGISTRATION_OPEN === 'false') {
      return res.status(403).json({ error: 'Online registration is closed.' });
    }
    const price = ticketType.prices?.find((entry: any) => entry.currency === currency);
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

    const remaining = MAX_TICKETS - (await countTicketsTaken(ticketType._id));
    if (remaining <= 0) return res.status(409).json({ error: 'Tickets are sold out.' });
    if (seats > remaining) {
      return res.status(409).json({ error: `Only ${remaining} ticket${remaining === 1 ? '' : 's'} left.` });
    }

    const now = Date.now();
    const data: CheckoutData = {
      v: 1,
      reference: referenceFor(idempotencyKey),
      idempotencyKey,
      currency,
      totalMinor,
      provider,
      providerRef: '',
      checkoutUrl: '',
      createdAt: now,
      expiresAt: now + 1000 * 60 * 30,
      payer: { name: payerName, phoneE164: payerPhone, email: payerEmail },
      country,
      state: country === 'Nigeria' ? state : null,
      chapterZone,
      attendanceMode,
      attendanceCounts,
      gender: isGroup ? null : body.gender as Gender,
      firstTime: isGroup ? false : body.firstTime === true,
      isMinor,
      guardianName,
      guardianPhoneE164,
      isGroup,
      seats,
      group: groupData,
      ticketTypeId: String(ticketType._id),
    };

    try {
      const info = provider === 'paystack' ? await initPaystack(data) : await initPaypal(data);
      const complete: CheckoutData = { ...data, ...info };
      return res.status(201).json({
        reference: complete.reference,
        checkoutUrl: complete.checkoutUrl,
        checkoutToken: signCheckout(complete),
      });
    } catch (error) {
      console.error('[POST /checkout/initialize] provider error:', error);
      return res.status(502).json({ error: 'Could not start payment. Please try again.' });
    }
  } catch (error) {
    console.error('[POST /checkout/initialize] error:', error);
    return res.status(503).json({ error: 'Checkout is unavailable right now.' });
  }
});

router.post('/checkout/verify', async (req: Request, res: Response) => {
  try {
    const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
    if (!reference) return res.status(400).json({ error: 'reference is required' });

    let order: any = await Order.findOne({ reference }).lean();
    if (order?.status === PAID_STATUS) {
      const access = typeof req.body?.access === 'string' ? req.body.access : '';
      const data = readCheckout(req.body?.checkoutToken);
      const allowed =
        (!!data && data.reference === reference) ||
        (!!access && (safeEqual(access, accessTokenFor(reference)) || safeEqual(access, accessTokenFor(order._id)))) ||
        phonesMatch(req.body?.phone, order.payerPhoneE164);

      return res.json({
        status: 'paid',
        reference,
        tickets: allowed ? await loadTickets(order) : null,
      });
    }

    const data = readCheckout(req.body?.checkoutToken);
    if (!data || data.reference !== reference) {
      return res.status(409).json({
        error: 'This checkout session is no longer available on this device. Please register again or contact support.',
      });
    }

    // PayPal returns its order ID as `token` in the browser URL. A checkout
    // token stored before the provider responded may still have an empty
    // providerRef, so take the provider's own reference when supplied.
    const providerRef = typeof req.body?.providerRef === 'string'
      ? req.body.providerRef.trim()
      : '';
    if (providerRef && !data.providerRef) data.providerRef = providerRef;

    const outcome = data.provider === 'paystack'
      ? await verifyPaystack(data)
      : await capturePaypal(data);

    if (outcome !== 'paid') return res.json({ status: outcome, reference });

    try {
      order = await fulfillPaidOrder(data);
    } catch (error: any) {
      if (error?.code === 11000) {
        order = await Order.findOne({ reference }).lean();
        if (order?.status === PAID_STATUS) {
          return res.json({ status: 'paid', reference, tickets: await loadTickets(order) });
        }
      }
      throw error;
    }

    return res.json({ status: 'paid', reference, tickets: await loadTickets(order) });
  } catch (error) {
    console.error('[POST /checkout/verify] error:', error);
    return res.status(502).json({ error: 'Could not confirm payment yet. Please retry.' });
  }
});

export default router;
