import mongoose from 'mongoose';

import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from '../constants/enums.ts';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION JOB
// ─────────────────────────────────────────────────────────────────────────────

const notificationJobSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    channel: {
      type: String,
      enum: {
        values: NOTIFICATION_CHANNELS,
        message: 'Channel must be one of: sms, email',
      },
      required: true,
    },
    payload: {
      // { participantName, refCode, phoneE164?, email?, ticketUrl }
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      maxlength: 128,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: NOTIFICATION_STATUSES,
        message: 'Status must be one of: queued, processing, sent, failed, cancelled',
      },
      required: true,
      default: 'queued',
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    availableAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'notification_jobs' }
);

notificationJobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

// idempotencyKey already unique via field-level `unique: true`

// Worker poll: "give me queued jobs that are due".
notificationJobSchema.index({ status: 1, availableAt: 1 });

// Per-order reporting / admin lookup.
notificationJobSchema.index({ orderId: 1 });

// Per-participant history (nice to have for support).
notificationJobSchema.index({ participantId: 1 });

// Detect stuck jobs (processing but locked too long ago).
notificationJobSchema.index({ status: 1, lockedAt: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationJob = mongoose.models.NotificationJob || mongoose.model('NotificationJob', notificationJobSchema);;