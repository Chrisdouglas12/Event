// constants/enums.ts
//
// Single source of truth for all enum-like string values.
// Imported by Mongoose models, validators, routes and services.

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
// PARTICIPANT
// ─────────────────────────────────────────────────────────────────────────────

export const ATTENDANCE_MODES = [
  'physically',
  'online',
  'not_sure',
];

export const GENDERS = [
  'male',
  'female',
];

export const PARTICIPANT_STATUSES = [
  'unconfirmed',
  'confirmed',
  'checked_in',
];

// ─────────────────────────────────────────────────────────────────────────────
// SCAN
// ─────────────────────────────────────────────────────────────────────────────

export const SCAN_TYPES = [
  'arrival',
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
