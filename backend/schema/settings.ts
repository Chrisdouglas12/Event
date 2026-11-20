import mongoose from 'mongoose';

import { CURRENCIES, PAYMENT_PROVIDERS, FEE_POLICIES } from '../constants/enums.ts';

// ─────────────────────────────────────────────────────────────────────────────
// EVENT SETTINGS  (singleton)
// ─────────────────────────────────────────────────────────────────────────────

const eventSettingsSchema = new mongoose.Schema(
  {
    // Fixed key so only one document can ever exist. Enforced by the
    // unique index on this field in the INDEXES block below.
    singleton: {
      type: String,
      required: true,
      default: 'event',
    },
    eventName: {
      type: String,
      required: true,
      maxlength: 255,
      default: 'International Holiness General Conference 2026',
      trim: true,
    },
    theme: {
      type: String,
      required: true,
      maxlength: 255,
      default: 'Man and Satan in Contention Against the Holy God',
      trim: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    registrationDeadline: {
      type: Date,
      required: true,
    },
    venueName: {
      type: String,
      required: true,
      maxlength: 255,
      default: 'Holiness Campground',
      trim: true,
    },
    venueAddress: {
      type: String,
      required: true,
      default: 'Behind FGC, Kwali, Abuja, Nigeria',
      trim: true,
    },
    venueMapUrl: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      maxlength: 32,
      default: '+234 701 566 8452',
      trim: true,
    },
    contactEmail: {
      type: String,
      maxlength: 255,
      trim: true,
      lowercase: true,
    },
    bankName: {
      type: String,
      maxlength: 128,
      trim: true,
    },
    bankAccountName: {
      type: String,
      maxlength: 128,
      trim: true,
    },
    bankAccountNumber: {
      type: String,
      maxlength: 32,
      trim: true,
    },
    capacityLimit: {
      // null = uncapped
      type: Number,
      default: null,
      min: 0,
    },
    capacityAlertThresholds: {
      // Stored as an array of integers instead of a CSV string so it can
      // be queried with $gte / $lt without parsing.
      type: [Number],
      default: [8000, 9000, 10000],
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'event_settings' }
);

eventSettingsSchema.pre('save', function (next) {
  // Keep thresholds deterministic regardless of what the admin panel sends.
  if (Array.isArray(this.capacityAlertThresholds)) {
    this.capacityAlertThresholds = [...new Set(this.capacityAlertThresholds)].sort(
      (a, b) => a - b
    );
  }
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER ROUTE  (one doc per currency)
// ─────────────────────────────────────────────────────────────────────────────

const providerRouteSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // the currency, e.g. 'NGN'
      required: true,
      enum: {
        values: CURRENCIES,
        message: 'Currency must be one of: NGN, USD, EUR, GBP',
      },
    },
    primaryProvider: {
      type: String,
      enum: {
        values: PAYMENT_PROVIDERS,
        message: 'primaryProvider must be one of: paystack, paypal, manual_transfer',
      },
      required: true,
    },
    fallbackProvider: {
      type: String,
      enum: {
        values: PAYMENT_PROVIDERS,
        message: 'fallbackProvider must be one of: paystack, paypal, manual_transfer',
      },
      required: true,
      default: 'manual_transfer',
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    feePolicy: {
      type: String,
      enum: {
        values: FEE_POLICIES,
        message: 'feePolicy must be one of: organizer_absorbs, pass_to_customer',
      },
      required: true,
      default: 'organizer_absorbs',
    },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'provider_routes',
    _id: false, // we supply `_id` ourselves as the currency code
  }
);

providerRouteSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// MINISTER
// ─────────────────────────────────────────────────────────────────────────────

const ministerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    titleOrRole: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    photoUrl: {
      type: String,
      trim: true,
    },
    biography: {
      type: String,
      trim: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'ministers' }
);

ministerSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMME ITEM
// ─────────────────────────────────────────────────────────────────────────────

const programmeItemSchema = new mongoose.Schema(
  {
    eventDate: {
      // Stored as "YYYY-MM-DD" so `date` semantics match Postgres.
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    startTime: {
      // Stored as "HH:mm" (24h). See notes below for the why.
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      // Optional, same format as startTime.
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    speakerOrLeader: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'programme_items' }
);

programmeItemSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

// Event settings — exactly one document.
eventSettingsSchema.index({ singleton: 1 }, { unique: true });

// Provider routes — _id is the currency, but a stable sort/lookup index helps.
providerRouteSchema.index({ isEnabled: 1 });
providerRouteSchema.index({ primaryProvider: 1 });

// Ministers
ministerSchema.index({ isActive: 1, sortOrder: 1 });

// Programme items — the primary read pattern is "give me the schedule,
// sorted by day then time".
programmeItemSchema.index({ eventDate: 1, startTime: 1, sortOrder: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const EventSettings = (mongoose.models.EventSettings || mongoose.model('EventSettings', eventSettingsSchema)) as mongoose.Model<any>;
export const ProviderRoute = (mongoose.models.ProviderRoute || mongoose.model('ProviderRoute', providerRouteSchema)) as mongoose.Model<any>;
export const Minister = (mongoose.models.Minister      || mongoose.model('Minister',      ministerSchema)) as mongoose.Model<any>;
export const ProgrammeItem = (mongoose.models.ProgrammeItem || mongoose.model('ProgrammeItem', programmeItemSchema)) as mongoose.Model<any>;
