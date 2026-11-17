// constants/enums.js
//
// Single source of truth for all enum-like string values.
// Imported by Mongoose models, validators, routes and services.
//
// When adding a new value: add it here first. Models that already use
// `enum: { values: X }` will pick it up on the next process restart with
// no migration needed. Do NOT add the value directly in a model file —
// that's how the arrays drift.

// ─────────────────────────────────────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  'draft',
  'pending_payment',
  'paid',
  'expired',
  'failed',
  'refunded',
  'partially_refunded',
];

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = [
  'initiated',
  'pending',
  'completed',
  'declined',
  'refunded',
];

export const PAYMENT_PROVIDERS = [
  'paystack',
  'paypal',
  'manual_transfer',
];

export const FEE_POLICIES = [
  'organizer_absorbs',
  'pass_to_customer',
];

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCIES = [
  'NGN',
  'USD',
  'EUR',
  'GBP',
];

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDEE
// ─────────────────────────────────────────────────────────────────────────────

export const ATTENDEE_STATUSES = [
  'unconfirmed',
  'confirmed',
  'checked_in',
  'booklet_issued',
];

// ─────────────────────────────────────────────────────────────────────────────
// SCAN
// ─────────────────────────────────────────────────────────────────────────────

export const SCAN_TYPES = [
  'arrival',
  'booklet',
  'daily_attendance',
  'custom',
];

export const SCAN_RESULTS = [
  'valid',
  'already_checked_in',
  'invalid_signature',
  'forged',
  'conflict',
];

// ─────────────────────────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────────────────────────

export const STAFF_ROLES = [
  'attendant',
  'supervisor',
  'finance',
  'admin',
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION JOB (not in the original enums.ts — defined here because the
// Mongoose model needs a fixed set; adjust to match your worker contract)
// ─────────────────────────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS = [
  'sms',
  'email',
];

export const NOTIFICATION_STATUSES = [
  'queued',
  'processing',
  'sent',
  'failed',
  'cancelled',
];

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

export const MANUAL_PAYMENT_STATUSES = [
  'pending',
  'approved',
  'rejected',
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

