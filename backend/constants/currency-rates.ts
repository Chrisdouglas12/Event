// Static currency configuration for registration.
//
// Local African prices are fixed at the equivalent of USD 20 using the rates
// below. They are deliberately static: checkout never depends on a live FX
// call, and admins can override any amount in the ticket-price settings.
// NGN stays at the existing negotiated price of NGN 5,000.

export const USD_EQUIVALENT_MAJOR = 20;
export const NGN_STANDARD_MAJOR = 5_000;

/** Units of local currency per 1 USD (indicative, captured for this event). */
export const USD_TO_LOCAL_RATE: Record<string, number> = {
  EGP: 48.5,
  EUR: 1, // existing published price: €20
  GBP: 1, // existing published price: £20
  GHS: 15.5,
  GNF: 8_600,
  KES: 129,
  MAD: 9.9,
  MWK: 1_750,
  NGN: 250,
  RWF: 1_350,
  SLL: 22_000,
  STD: 24.5,
  TZS: 2_600,
  UGX: 3_650,
  USD: 1,
  XAF: 550,
  XOF: 550,
  ZAR: 18.2,
  ZMW: 25.5,
};

/** Minor-unit multiplier per currency (0-decimal currencies use 1). */
export const MINOR_UNITS: Record<string, number> = {
  EGP: 100,
  EUR: 100,
  GBP: 100,
  GHS: 100,
  GNF: 1,
  KES: 100,
  MAD: 100,
  MWK: 100,
  NGN: 100,
  RWF: 1,
  SLL: 100,
  STD: 100,
  TZS: 1,
  UGX: 1,
  USD: 100,
  XAF: 1,
  XOF: 1,
  ZAR: 100,
  ZMW: 100,
};

export function minorUnitsFor(currency: string): number {
  return MINOR_UNITS[currency] ?? 100;
}

/** Convert a major-unit amount into the currency's minor unit. */
export function toMinor(currency: string, major: number): number {
  return Math.round(major * minorUnitsFor(currency));
}

/** Static fallback price in minor units for every supported currency. */
export function defaultPriceMinor(currency: string): number {
  if (currency === 'NGN') return toMinor(currency, NGN_STANDARD_MAJOR);
  const rate = USD_TO_LOCAL_RATE[currency];
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return toMinor(currency, USD_EQUIVALENT_MAJOR * rate);
}
