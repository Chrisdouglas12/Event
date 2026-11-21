import mongoose from 'mongoose';

import {
  ATTENDANCE_MODES,
  CURRENCIES,
  GENDERS,
  ORDER_STATUSES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
} from '../constants/enums.ts';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────────────────────────────────────

const orderSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      maxlength: 16,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: { values: ORDER_STATUSES },
      required: true,
      default: 'draft',
    },
    disputed: {
      type: Boolean,
      required: true,
      default: false,
    },
    currency: {
      type: String,
      enum: { values: CURRENCIES },
      required: true,
    },
    totalMinor: {
      type: Number,
      required: true,
      min: 0,
    },
    feeMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    payerName: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    payerPhoneE164: {
      type: String,
      required: true,
      maxlength: 32,
      trim: true,
    },
    payerEmail: {
      type: String,
      maxlength: 255,
      trim: true,
      lowercase: true,
    },
    country: {
      type: String,
      maxlength: 64,
      trim: true,
    },
    state: {
      type: String,
      maxlength: 64,
      trim: true,
    },
    isGroup: {
      type: Boolean,
      required: true,
      default: false,
    },
    groupName: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    attendanceCounts: {
      physically: { type: Number, min: 0, default: 0 },
      online: { type: Number, min: 0, default: 0 },
      not_sure: { type: Number, min: 0, default: 0 },
    },
    attendanceMode: {
      type: String,
      enum: { values: ATTENDANCE_MODES },
      required: true,
      default: 'not_sure',
    },
    // Individual KPI data.
    gender: {
      type: String,
      enum: { values: GENDERS },
      default: null,
    },
    firstTime: {
      type: Boolean,
      default: false,
    },
    isMinor: {
      type: Boolean,
      default: false,
    },
    // Group KPI data. Counts cover every paid seat, including children.
    genderCounts: {
      male: { type: Number, min: 0, default: 0 },
      female: { type: Number, min: 0, default: 0 },
    },
    firstTimeCounts: {
      yes: { type: Number, min: 0, default: 0 },
      no: { type: Number, min: 0, default: 0 },
    },
    inviteeCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    hasChildren: {
      type: Boolean,
      default: false,
    },
    childCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Number of paid seats this order holds; powers the per-ticket-type cap.
    seats: {
      type: Number,
      min: 0,
      default: null,
    },
    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketType',
      default: null,
    },
    paidAt: { type: Date, default: null },
    idempotencyKey: {
      type: String,
      required: true,
      maxlength: 128,
      unique: true,
      trim: true,
    },
    expiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'orders' }
);

orderSchema.pre('save', function () {
  this.updatedAt = new Date();
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    provider: {
      type: String,
      enum: { values: PAYMENT_PROVIDERS },
      required: true,
    },
    providerRef: {
      type: String,
      required: true,
      maxlength: 255,
      unique: true,
      trim: true,
    },
    providerCaptureId: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    status: {
      type: String,
      enum: { values: PAYMENT_STATUSES },
      required: true,
      default: 'initiated',
    },
    currency: {
      type: String,
      enum: { values: CURRENCIES },
      required: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 0,
    },
    rawPayloadHash: {
      type: String,
      maxlength: 64,
      trim: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'payments' }
);

paymentSchema.pre('save', function () {
  this.updatedAt = new Date();
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

orderSchema.index({ status: 1 });
orderSchema.index({ payerPhoneE164: 1 });
orderSchema.index({ payerEmail: 1 });
orderSchema.index({ expiresAt: 1 });
orderSchema.index({ ticketTypeId: 1, status: 1 });
orderSchema.index({ country: 1 });
orderSchema.index({ state: 1 });

paymentSchema.index({ orderId: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Order = (mongoose.models.Order || mongoose.model('Order', orderSchema)) as mongoose.Model<any>;
export const Payment = (mongoose.models.Payment || mongoose.model('Payment', paymentSchema)) as mongoose.Model<any>;
