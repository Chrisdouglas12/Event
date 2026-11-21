import crypto from 'crypto';
import mongoose from 'mongoose';

import { Order, Payment } from '../schema/orders.ts';
import { Group, Participant } from '../schema/participants.ts';
import { ScanEvent } from '../schema/scans.ts';

export type GateScanResponse =
  | {
      result: 'valid';
      seats: number;
      isGroup: boolean;
      participant: { name: string; refCode: string; chapterZone?: string | null };
      message: string;
    }
  | {
      result: 'already_checked_in';
      seats: number;
      isGroup: boolean;
      participant: { name: string; refCode: string; chapterZone?: string | null };
      message: string;
    }
  | { result: 'forged'; error: string };

interface GateScanInput {
  qrToken: string;
  standId: string;
  staffId?: unknown;
  deviceId?: unknown;
  scanType?: string;
  clientTimestamp?: string | Date;
  idempotencyKey?: string;
  notes?: string;
}

function secret(): string {
  return process.env.QR_TOKEN_SECRET || '';
}

function accessTokenFor(orderId: unknown): string {
  const value = secret();
  if (!value || value.length < 16) return '';
  return crypto
    .createHmac('sha256', value)
    .update(`order-access:${String(orderId)}`)
    .digest('base64url')
    .slice(0, 32);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashQrToken(raw: string): string {
  return crypto.createHash('sha256').update(raw.trim()).digest('hex');
}

function unknownParticipantId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

async function alreadyRecorded(idempotencyKey: string): Promise<GateScanResponse | null> {
  const existing: any = await ScanEvent.findOne({ idempotencyKey }).lean();
  if (!existing) return null;
  return {
    result: existing.result === 'already_checked_in' ? 'already_checked_in' : 'valid',
    seats: Number(existing.seats) || 1,
    isGroup: !!existing.isGroupScan,
    participant: {
      name: existing.notes?.startsWith('name:') ? existing.notes.slice(5) : 'Participant',
      refCode: '—',
    },
    message: existing.result === 'already_checked_in' ? 'Already checked in.' : 'Checked in successfully.',
  } as GateScanResponse;
}

/** Records one gate scan. A group QR checks in every paid seat on the order. */
export async function recordGateScan(input: GateScanInput): Promise<GateScanResponse> {
  const token = String(input.qrToken || '').trim();
  const standId = String(input.standId || '').trim();
  if (!token || !standId) throw new Error('qrToken and standId are required');

  const idempotencyKey = input.idempotencyKey || crypto.randomUUID();
  const replay = await alreadyRecorded(idempotencyKey);
  if (replay) return replay;

  const scanType = input.scanType || 'arrival';
  const clientTimestamp = new Date(input.clientTimestamp || Date.now());
  if (Number.isNaN(clientTimestamp.getTime())) throw new Error('clientTimestamp must be a valid ISO date');

  const createForgedEvent = async (error: string): Promise<GateScanResponse> => {
    await ScanEvent.create({
      participantId: unknownParticipantId(),
      scanType,
      staffId: input.staffId || null,
      deviceId: input.deviceId || null,
      standId,
      clientTimestamp,
      idempotencyKey,
      result: 'forged',
      notes: error.slice(0, 500),
    });
    return { result: 'forged', error };
  };

  if (token.startsWith('HGCGROUP.')) {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      return createForgedEvent('Invalid group ticket.');
    }
    const [, orderId, tokenSignature] = parts;
    if (!mongoose.isValidObjectId(orderId) || !safeEqual(tokenSignature, accessTokenFor(orderId))) {
      return createForgedEvent('Invalid group ticket signature.');
    }

    const order: any = await Order.findOne({ _id: orderId, status: 'paid' }).lean();
    if (!order) return createForgedEvent('Group ticket is not active.');

    const group: any = await Group.findOne({ orderId: order._id }).lean();
    if (!group) return createForgedEvent('Group ticket is not active.');

    const leader: any = await Participant.findOne({
      orderId: order._id,
      groupId: group._id,
      deletedAt: null,
    }).lean();

    if (group.checkedInAt) {
      await ScanEvent.create({
        participantId: leader?._id || unknownParticipantId(),
        orderId: order._id,
        isGroupScan: true,
        seats: Number(group.totalSeats) || 1,
        scanType,
        staffId: input.staffId || null,
        deviceId: input.deviceId || null,
        standId,
        clientTimestamp,
        idempotencyKey,
        result: 'already_checked_in',
        notes: `name:${order.groupName || order.payerName||''}`.slice(0, 500),
      });
      return {
        result: 'already_checked_in',
        seats: Number(group.totalSeats) || 1,
        isGroup: true,
        participant: {
          name: order.groupName || order.payerName,
          refCode: order.reference,
          chapterZone: order.groupName || null,
        },
        message: 'Group has already been checked in.',
      };
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Group.updateOne(
          { _id: group._id, checkedInAt: null },
          { $set: { checkedInAt: new Date() } },
          { session }
        );
        if (leader) {
          await Participant.updateOne(
            { _id: leader._id },
            { $set: { status: 'checked_in', checkedInAt: new Date() } },
            { session }
          );
        }
        await ScanEvent.create(
          [{
            participantId: leader?._id || unknownParticipantId(),
            orderId: order._id,
            isGroupScan: true,
            seats: Number(group.totalSeats) || 1,
            scanType,
            staffId: input.staffId || null,
            deviceId: input.deviceId || null,
            standId,
            clientTimestamp,
            idempotencyKey,
            result: 'valid',
            notes: `name:${order.groupName || order.payerName || ''}`.slice(0, 500),
          }],
          { session }
        );
      });
    } finally {
      session.endSession();
    }

    return {
      result: 'valid',
      seats: Number(group.totalSeats) || 1,
      isGroup: true,
      participant: {
        name: order.groupName || order.payerName,
        refCode: order.reference,
        chapterZone: order.groupName || null,
      },
      message: `Group checked in — ${group.totalSeats} paid seats.`,
    };
  }

  const participant: any = await Participant.findOne({
    qrTokenHash: hashQrToken(token),
    deletedAt: null,
  });
  if (!participant) return createForgedEvent('Invalid or forged ticket.');

  const participantInfo = {
    name: participant.name,
    refCode: participant.refCode,
    chapterZone: participant.chapterZone || null,
  };

  if (participant.checkedInAt) {
    await ScanEvent.create({
      participantId: participant._id,
      orderId: participant.orderId || null,
      scanType,
      staffId: input.staffId || null,
      deviceId: input.deviceId || null,
      standId,
      clientTimestamp,
      idempotencyKey,
      result: 'already_checked_in',
      notes: `name:${participant.name}`.slice(0, 500),
    });
    return {
      result: 'already_checked_in',
      seats: 1,
      isGroup: false,
      participant: participantInfo,
      message: 'Participant has already been checked in.',
    };
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Participant.updateOne(
        { _id: participant._id, checkedInAt: null },
        { $set: { status: 'checked_in', checkedInAt: new Date() } },
        { session }
      );
      await ScanEvent.create(
        [{
          participantId: participant._id,
          orderId: participant.orderId || null,
          scanType,
          staffId: input.staffId || null,
          deviceId: input.deviceId || null,
          standId,
          clientTimestamp,
          idempotencyKey,
          result: 'valid',
          notes: `name:${participant.name}`.slice(0, 500),
        }],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  return {
    result: 'valid',
    seats: 1,
    isGroup: false,
    participant: participantInfo,
    message: 'Participant checked in successfully.',
  };
}

/** Returns paid orders with their provider for the admin Payments page. */
export async function listPaidPayments(limit = 100): Promise<any[]> {
  const orders: any[] = await Order.find({ status: 'paid' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const payments: any[] = await Payment.find({ orderId: { $in: orders.map((o) => o._id) } }).lean();
  const providerByOrder = new Map(payments.map((p) => [String(p.orderId), p.provider]));

  return orders.map((order) => ({
    ...order,
    id: String(order._id),
    provider: providerByOrder.get(String(order._id)) || null,
  }));
}
