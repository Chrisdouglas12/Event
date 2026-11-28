// Shared phone normalisation so every route accepts the same common formats
// and stores a consistent E.164 value.
export function toE164(phone: unknown): string | null {
  if (typeof phone !== 'string') return null;

  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  // `00` is the international access prefix (e.g. 00234 801 ...).
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Nigerians often write +234 (0) 801 ... — remove the trunk zero.
  if (/^2340\d{10}$/.test(digits)) digits = `234${digits.slice(4)}`;

  if (/^234\d{10}$/.test(digits)) return `+${digits}`;

  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^\d{10}$/.test(digits)) return `+234${digits}`;

  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  return null;
}
