import mongoose from 'mongoose';

import { SCAN_RESULTS, SCAN_TYPES } from '../constants/enums.ts';

// DEVICE

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
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'devices' }
);

// SCAN EVENT

const scanEventSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    isGroupScan: {
      type: Boolean,
      required: true,
      default: false,
    },
    seats: {
      type: Number,
      min: 1,
      default: 1,
    },
    scanType: {
      type: String,
      enum: { values: SCAN_TYPES },
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
      enum: { values: SCAN_RESULTS },
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

// INDEXES

deviceSchema.index({ assignedStand: 1 });
deviceSchema.index({ isRevoked: 1 });

scanEventSchema.index({ participantId: 1 });
scanEventSchema.index({ orderId: 1 });
scanEventSchema.index({ standId: 1 });
scanEventSchema.index({ clientTimestamp: 1 });
scanEventSchema.index({ result: 1 });
scanEventSchema.index({ deviceId: 1 });
scanEventSchema.index({ staffId: 1 });
scanEventSchema.index({ isGroupScan: 1 });

// EXPORTS

export const Device = (mongoose.models.Device || mongoose.model('Device', deviceSchema)) as mongoose.Model<any>;
export const ScanEvent = (mongoose.models.ScanEvent || mongoose.model('ScanEvent', scanEventSchema)) as mongoose.Model<any>;
