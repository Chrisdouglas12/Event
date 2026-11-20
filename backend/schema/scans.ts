import mongoose from 'mongoose';

import {  SCAN_TYPES, SCAN_RESULTS  } from '../constants/enums.ts';

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE
// ─────────────────────────────────────────────────────────────────────────────

const deviceSchema = new mongoose.Schema(
  {
    deviceName: {
      type: String,
      required: true,
      maxlength: 128,
      trim: true,
    },
    deviceFingerprint: {
      type: String,
      required: true,
      maxlength: 255,
      unique: true,
      trim: true,
    },
    assignedStand: {
      type: String,
      maxlength: 64,
      trim: true,
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastSyncAt: { type: Date, default: null },
    createdAt:  { type: Date, default: Date.now },
  },
  { collection: 'devices' }
);

// ─────────────────────────────────────────────────────────────────────────────
// SCAN EVENT
// ─────────────────────────────────────────────────────────────────────────────

const scanEventSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    scanType: {
      type: String,
      enum: {
        values: SCAN_TYPES,
        message: 'scanType must be one of: arrival, booklet, daily_attendance, custom',
      },
      required: true,
      default: 'arrival',
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StaffUser',
      default: null,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
    },
    standId: {
      type: String,
      required: true,
      maxlength: 64,
      trim: true,
    },
    clientTimestamp: {
      type: Date,
      required: true,
    },
    serverTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    idempotencyKey: {
      type: String,
      required: true,
      maxlength: 128,
      unique: true,
      trim: true,
    },
    result: {
      type: String,
      enum: {
        values: SCAN_RESULTS,
        message: 'result must be one of: valid, already_checked_in, invalid_signature, forged, conflict',
      },
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
      trim: true,
    },
  },
  { collection: 'scan_events' }
);

// ─────────────────────────────────────────────────────────────────────────────
// BOOKLET STOCK
// ─────────────────────────────────────────────────────────────────────────────

const bookletStockSchema = new mongoose.Schema(
  {
    standId: {
      type: String,
      required: true,
      maxlength: 64,
      trim: true,
    },
    allocatedDate: {
      // Stored as a normalised "YYYY-MM-DD" string so the pair
      // (standId, allocatedDate) can be uniquely indexed. `Date` would
      // also work but requires care to zero out the time component.
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    allocatedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    issuedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    returnedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'booklet_stock' }
);

bookletStockSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

// Devices
// deviceFingerprint already unique via field-level `unique: true`
deviceSchema.index({ assignedStand: 1 });
deviceSchema.index({ isRevoked: 1 });

// Scan events
// idempotencyKey already unique via field-level `unique: true`
scanEventSchema.index({ participantId: 1 });
scanEventSchema.index({ standId: 1 });
scanEventSchema.index({ clientTimestamp: 1 });
scanEventSchema.index({ result: 1 });
scanEventSchema.index({ deviceId: 1 });
scanEventSchema.index({ staffId: 1 });

// Booklet stock — replicate the compound unique index
// unique(standId, allocatedDate)
bookletStockSchema.index(
  { standId: 1, allocatedDate: 1 },
  { unique: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Device = mongoose.models.Device       || mongoose.model('Device',       deviceSchema);
export const ScanEvent = mongoose.models.ScanEvent    || mongoose.model('ScanEvent',    scanEventSchema);
export const BookletStock = mongoose.models.BookletStock || mongoose.model('BookletStock', bookletStockSchema);