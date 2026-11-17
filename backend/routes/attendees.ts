// routes/registration.ts
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';


import { Order } from '../schema/orders.ts';
import { ORDER_STATUSES, CURRENCIES } from '../constants/enums.ts';
import { TicketType } from '../schema/attendees.ts'; 
import { Attendee } from '../schema/attendees.ts';
import { Group, GroupSeat } from '../schema/attendees.ts';

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

function toE164(phone: unknown): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAttendee(a: any): { ok: true; value: any } | { ok: false; error: string } {
  if (!a || typeof a !== 'object') return { ok: false, error: 'Attendee must be an object' };

  if (!a.name || typeof a.name !== 'string' || !a.name.trim())
    return { ok: false, error: 'Attendee name is required' };

  const phoneE164 = toE164(a.phoneE164);
  if (!phoneE164) return { ok: false, error: 'Attendee phone is invalid' };

  if (a.email && !EMAIL_RE.test(a.email))
    return { ok: false, error: 'Attendee email is invalid' };

  const country = (a.country || 'Nigeria').trim();

  if (country === 'Nigeria' && !a.state)
    return { ok: false, error: 'State is required for Nigerian attendees' };

  const isMinor = !!a.isMinor;
  if (isMinor) {
    if (!a.guardianName || !a.guardianName.trim())
      return { ok: false, error: 'Guardian name is required for minors' };
    if (!toE164(a.guardianPhoneE164))
      return { ok: false, error: 'Guardian phone is invalid for minors' };
  }

  if (!a.ticketTypeId || !mongoose.isValidObjectId(a.ticketTypeId))
    return { ok: false, error: 'Attendee ticketTypeId is invalid' };

  return {
    ok: true,
    value: {
      ticketTypeId: a.ticketTypeId,
      name: a.name.trim(),
      phoneE164,
      email: a.email ? a.email.trim().toLowerCase() : null,
      country,
      state: a.state ? a.state.trim() : null,
      parish: a.parish ? a.parish.trim() : null,
      isMinor,
      guardianName: isMinor ? a.guardianName.trim() : null,
      guardianPhoneE164: isMinor ? toE164(a.guardianPhoneE164) : null,
    },
  };
}

async function abortWith(session: mongoose.ClientSession, res: Response, status: number, message: string) {
  await session.abortTransaction();
  return res.status(status).json({ error: message });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/registrations
// ─────────────────────────────────────────────────────────────────────────────

router.post('/registrations', async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { currency, buyer, attendees, group } = req.body || {};

    // ── 1. Basic input validation ────────────────────────────────────────────
    if (!currency || !CURRENCIES.includes(currency)) {
      return await abortWith(session, res, 400, `currency must be one of: ${CURRENCIES.join(', ')}`);
    }

    if (!Array.isArray(attendees) || attendees.length === 0) {
      return await abortWith(session, res, 400, 'At least one attendee is required');
    }

    if (attendees.length > 100) {
      return await abortWith(session, res, 400, 'Max 100 attendees per order');
    }

    // ── 2. Validate each attendee ───────────────────────────────────────────
    const validated = [];
    for (let i = 0; i < attendees.length; i++) {
      const v = validateAttendee(attendees[i]);
      if (!v.ok) return await abortWith(session, res, 400, `Attendees[${i}]: ${v.error}`);
      validated.push(v.value);
    }

    // ── 3. Group invariants ─────────────────────────────────────────────────
    let validLeaderPhone = null;
    if (group) {
      if (!group.churchOrParishName || !group.leaderName || !group.leaderPhoneE164) {
        return await abortWith(session, res, 400, 'group requires churchOrParishName, leaderName, leaderPhoneE164');
      }

      validLeaderPhone = toE164(group.leaderPhoneE164);
      if (!validLeaderPhone) {
        return await abortWith(session, res, 400, 'group.leaderPhoneE164 is invalid');
      }

      if (!Number.isInteger(group.totalSeats) || group.totalSeats < validated.length) {
        return await abortWith(session, res, 400, 'group.totalSeats must be >= number of attendees');
      }

      if (group.totalSeats !== validated.length) {
        return await abortWith(session, res, 400, 'group.totalSeats must equal attendees.length in this version');
      }
    }

    // ── 4. Load ticket types and compute total ──────────────────────────────
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

    // ── 5. Create the order ─────────────────────────────────────────────────
    // Uses the exact fields from your schema/orders.ts
    const [order] = await Order.create(
      [
        {
          reference: generateRefCode(),
          idempotencyKey: `reg_${crypto.randomBytes(16).toString('hex')}`,
          status: 'draft', // or 'pending_payment' depending on your flow
          currency,
          totalMinor,
          feeMinor: 0,
          payerName: buyer?.name || validated[0].name,
          payerPhoneE164: buyer?.phone ? toE164(buyer.phone) : validated[0].phoneE164,
          payerEmail: buyer?.email ? String(buyer.email).trim().toLowerCase() : null,
          isGroup: !!group,
          groupName: group?.churchOrParishName || null,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 mins
        },
      ],
      { session }
    );

    // ── 6. Optionally create the group ──────────────────────────────────────
    let createdGroup = null;
    if (group) {
      const managementToken = generateToken(32);

      [createdGroup] = await Group.create(
        [
          {
            orderId: order._id,
            churchOrParishName: group.churchOrParishName.trim(),
            leaderName: group.leaderName.trim(),
            leaderPhoneE164: validLeaderPhone,
            leaderEmail: group.leaderEmail ? String(group.leaderEmail).trim().toLowerCase() : null,
            totalSeats: group.totalSeats,
            claimedSeats: 0,
            managementToken,
          },
        ],
        { session }
      );
    }

    // ── 7. Create the attendees ─────────────────────────────────────────────
    const usedRefCodes = new Set();
    const usedQrHashes = new Set();
    const attendeeDocs = [];
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

      let rawQr, qrHash;
      for (let i = 0; i < 5; i++) {
        rawQr = generateToken(24);
        qrHash = hashQrToken(rawQr);
        if (!usedQrHashes.has(qrHash)) break;
      }
      usedQrHashes.add(qrHash);
      rawQrTokens.push(rawQr);

      attendeeDocs.push({
        orderId: order._id,
        groupId: createdGroup ? createdGroup._id : null,
        ticketTypeId: a.ticketTypeId,
        refCode,
        name: a.name,
        phoneE164: a.phoneE164,
        email: a.email,
        country: a.country,
        state: a.state,
        parish: a.parish,
        isMinor: a.isMinor,
        guardianName: a.guardianName,
        guardianPhoneE164: a.guardianPhoneE164,
        status: 'unconfirmed',
        qrTokenHash: qrHash,
      });
    }

    const createdAttendees = await Attendee.insertMany(attendeeDocs, { session, ordered: true });

    // ── 8. Create group seats ───────────────────────────────────────────────
    if (createdGroup) {
      const seats = createdAttendees.map((at) => ({
        groupId: createdGroup!._id,
        inviteCode: generateToken(12),
        attendeeId: at._id,
        isClaimed: true,
        claimedAt: new Date(),
      }));

      await GroupSeat.insertMany(seats, { session, ordered: true });

      createdGroup.claimedSeats = createdAttendees.length;
      await createdGroup.save({ session });
    }

    // ── 9. Commit ───────────────────────────────────────────────────────────
    await session.commitTransaction();

    // ── 10. Respond ─────────────────────────────────────────────────────────
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
      attendees: createdAttendees.map((at, i) => ({
        id: at._id,
        refCode: at.refCode,
        qrToken: rawQrTokens[i], // ⚠️ shown once — client must persist it
        ticketTypeId: at.ticketTypeId,
        name: at.name,
      })),
    });
  } catch (err: any) {
    await session.abortTransaction();

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