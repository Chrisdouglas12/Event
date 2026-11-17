import mongoose from 'mongoose';

import { CURRENCIES, ORDER_STATUSES, PAYMENT_PROVIDERS, PAYMENT_STATUSES, MANUAL_PAYMENT_STATUSES, } from '../constants/enums.ts';

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
      enum: {
        values: ORDER_STATUSES,
        message:
          'Status must be one of: draft, pending_payment, paid, expired, failed, refunded, partially_refunded',
      },
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
      enum: {
        values: CURRENCIES,
        message: 'Currency must be one of: NGN, USD, EUR, GBP',
      },
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

orderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
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
      enum: {
        values: PAYMENT_PROVIDERS,
        message: 'Provider must be one of: paystack, paypal, manual_transfer',
      },
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
    checkoutUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: 'Status must be one of: initiated, pending, completed, declined, refunded',
      },
      required: true,
      default: 'initiated',
    },
    currency: {
      type: String,
      enum: {
        values: CURRENCIES,
        message: 'Currency must be one of: NGN, USD, EUR, GBP',
      },
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

paymentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK EVENT
// ─────────────────────────────────────────────────────────────────────────────

const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: {
        values: PAYMENT_PROVIDERS,
        message: 'Provider must be one of: paystack, paypal, manual_transfer',
      },
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      maxlength: 64,
      trim: true,
    },
    providerEventId: {
      type: String,
      required: true,
      maxlength: 255,
      unique: true,
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    signatureValid: {
      type: Boolean,
      required: true,
      default: false,
    },
    processed: {
      type: Boolean,
      required: true,
      default: false,
    },
    processedAt: { type: Date, default: null },
    error: {
      type: String,
      maxlength: 1000,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'webhook_events' }
);

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

const manualPaymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    bankName: {
      type: String,
      required: true,
      maxlength: 128,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      maxlength: 128,
      trim: true,
    },
    referenceOrTellerId: {
      type: String,
      required: true,
      maxlength: 128,
      trim: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: MANUAL_PAYMENT_STATUSES,
        message: 'Status must be one of: pending, approved, rejected',
      },
      required: true,
      default: 'pending',
    },
    reviewedByStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StaffUser',
      default: null,
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'manual_payments' }
);

manualPaymentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

// Orders
orderSchema.index({ reference: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payerPhoneE164: 1 });
orderSchema.index({ payerEmail: 1 });
orderSchema.index({ expiresAt: 1 });
// reference + idempotencyKey already unique via field-level `unique: true`

// Payments
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ providerRef: 1 });
// providerRef already unique via field-level `unique: true`

// Webhook events
webhookEventSchema.index({ provider: 1 });
webhookEventSchema.index({ processed: 1 });
// providerEventId already unique via field-level `unique: true`

// Manual payments
manualPaymentSchema.index({ orderId: 1 });
manualPaymentSchema.index({ status: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Order = mongoose.models.Order          || mongoose.model('Order',          orderSchema);
export const Payment = mongoose.models.Payment        || mongoose.model('Payment',        paymentSchema);
export const WebhookEvent = mongoose.models.WebhookEvent   || mongoose.model('WebhookEvent',   webhookEventSchema);
export const ManualPayment = mongoose.models.ManualPayment  || mongoose.model('ManualPayment',  manualPaymentSchema);
