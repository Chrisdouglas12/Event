export type SupportedCurrency = "NGN" | "USD" | "EUR" | "GBP";

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  /** Emoji flag shown next to the currency code in the registration picker. */
  flag: string;
  minorUnitMultiplier: number; // e.g. 100 for kobo/cents/pence
  standardPriceMinor: number;
  label: string;
  /** Every supported currency is routed through Paystack. */
  defaultProvider: "paystack";
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    flag: "🇳🇬",
    minorUnitMultiplier: 100,
    standardPriceMinor: 500_000, // 5,000 NGN in kobo
    label: "Nigerian Naira (NGN)",
    defaultProvider: "paystack",
  },
  USD: {
    code: "USD",
    symbol: "$",
    flag: "🇺🇸",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000, // $20.00 in cents
    label: "US Dollar (USD)",
    defaultProvider: "paystack",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000, // €20.00 in cents
    label: "Euro (EUR)",
    defaultProvider: "paystack",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    flag: "🇬🇧",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000, // £20.00 in pence
    label: "British Pound (GBP)",
    defaultProvider: "paystack",
  },
};

export function formatMoneyMinor(amountMinor: number, currency: SupportedCurrency): string {
  const config = CURRENCIES[currency];
  const major = amountMinor / config.minorUnitMultiplier;
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: currency === "NGN" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}
