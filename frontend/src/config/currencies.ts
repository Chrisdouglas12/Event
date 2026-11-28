export type SupportedCurrency =
  | "NGN"
  | "USD"
  | "EUR"
  | "GBP"
  | "EGP"
  | "GHS"
  | "GNF"
  | "KES"
  | "MAD"
  | "MWK"
  | "RWF"
  | "SLL"
  | "STD"
  | "TZS"
  | "UGX"
  | "XAF"
  | "XOF"
  | "ZAR"
  | "ZMW";

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  /** Emoji flag shown next to the currency code in the registration picker. */
  flag: string;
  minorUnitMultiplier: number; // e.g. 100 for kobo/cents/pence, 1 for CFA franc
  standardPriceMinor: number;
  label: string;
  /** NGN is handled by Paystack; other currencies route through Flutterwave. */
  defaultProvider: "paystack" | "flutterwave";
}

/**
 * Standard prices. NGN keeps the negotiated ₦5,000; every other currency is
 * the static USD-20 equivalent (EUR/GBP keep their existing published 20).
 * Backend prices from `/api/register` always win at checkout — these values
 * only cover first paint and offline fallbacks.
 */
export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    flag: "🇳🇬",
    minorUnitMultiplier: 100,
    standardPriceMinor: 500_000,
    label: "Nigerian Naira (NGN)",
    defaultProvider: "paystack",
  },
  USD: {
    code: "USD",
    symbol: "$",
    flag: "🇺🇸",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000,
    label: "US Dollar (USD)",
    defaultProvider: "flutterwave",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000,
    label: "Euro (EUR)",
    defaultProvider: "flutterwave",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    flag: "🇬🇧",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000,
    label: "British Pound (GBP)",
    defaultProvider: "flutterwave",
  },
  EGP: {
    code: "EGP",
    symbol: "E£",
    flag: "🇪🇬",
    minorUnitMultiplier: 100,
    standardPriceMinor: 97_000,
    label: "Egyptian Pound (EGP)",
    defaultProvider: "flutterwave",
  },
  GHS: {
    code: "GHS",
    symbol: "GH₵",
    flag: "🇬🇭",
    minorUnitMultiplier: 100,
    standardPriceMinor: 31_000,
    label: "Ghanaian Cedi (GHS)",
    defaultProvider: "flutterwave",
  },
  GNF: {
    code: "GNF",
    symbol: "FG",
    flag: "🇬🇳",
    minorUnitMultiplier: 1,
    standardPriceMinor: 172_000,
    label: "GuineanFranc (GNF)",
    defaultProvider: "flutterwave",
  },
  KES: {
    code: "KES",
    symbol: "KSh",
    flag: "🇰🇪",
    minorUnitMultiplier: 100,
    standardPriceMinor: 258_000,
    label: "Kenyan Shilling (KES)",
    defaultProvider: "flutterwave",
  },
  MAD: {
    code: "MAD",
    symbol: "DH",
    flag: "🇲🇦",
    minorUnitMultiplier: 100,
    standardPriceMinor: 19_800,
    label: "Moroccan Dirham (MAD)",
    defaultProvider: "flutterwave",
  },
  MWK: {
    code: "MWK",
    symbol: "MK",
    flag: "🇲🇼",
    minorUnitMultiplier: 100,
    standardPriceMinor: 3_500_000,
    label: "Malawian Kwacha (MWK)",
    defaultProvider: "flutterwave",
  },
  RWF: {
    code: "RWF",
    symbol: "FRw",
    flag: "🇷🇼",
    minorUnitMultiplier: 1,
    standardPriceMinor: 27_000,
    label: "Rwandan Franc (RWF)",
    defaultProvider: "flutterwave",
  },
  SLL: {
    code: "SLL",
    symbol: "Le",
    flag: "🇸🇱",
    minorUnitMultiplier: 100,
    standardPriceMinor: 44_000_000,
    label: "Sierra Leonean Leone (SLL)",
    defaultProvider: "flutterwave",
  },
  STD: {
    code: "STD",
    symbol: "Db",
    flag: "🇸🇹",
    minorUnitMultiplier: 100,
    standardPriceMinor: 49_000,
    label: "São Tomé Dobra (STD)",
    defaultProvider: "flutterwave",
  },
  TZS: {
    code: "TZS",
    symbol: "TSh",
    flag: "🇹🇿",
    minorUnitMultiplier: 1,
    standardPriceMinor: 52_000,
    label: "Tanzanian Shilling (TZS)",
    defaultProvider: "flutterwave",
  },
  UGX: {
    code: "UGX",
    symbol: "USh",
    flag: "🇺🇬",
    minorUnitMultiplier: 1,
    standardPriceMinor: 73_000,
    label: "Ugandan Shilling (UGX)",
    defaultProvider: "flutterwave",
  },
  XAF: {
    code: "XAF",
    symbol: "FCFA",
    flag: "🌍",
    minorUnitMultiplier: 1,
    standardPriceMinor: 11_000,
    label: "Central African CFA Franc (XAF)",
    defaultProvider: "flutterwave",
  },
  XOF: {
    code: "XOF",
    symbol: "CFA",
    flag: "🌍",
    minorUnitMultiplier: 1,
    standardPriceMinor: 11_000,
    label: "West African CFA Franc (XOF)",
    defaultProvider: "flutterwave",
  },
  ZAR: {
    code: "ZAR",
    symbol: "R",
    flag: "🇿🇦",
    minorUnitMultiplier: 100,
    standardPriceMinor: 36_400,
    label: "South African Rand (ZAR)",
    defaultProvider: "flutterwave",
  },
  ZMW: {
    code: "ZMW",
    symbol: "ZK",
    flag: "🇿🇲",
    minorUnitMultiplier: 100,
    standardPriceMinor: 51_000,
    label: "Zambian Kwacha (ZMW)",
    defaultProvider: "flutterwave",
  },
};

export const CURRENCY_LIST = Object.keys(CURRENCIES) as SupportedCurrency[];

/**
 * Country → local currency for the Flutterwave-supported African markets.
 * Countries not listed here keep USD as the international fallback.
 */
export const COUNTRY_CURRENCY: Record<string, SupportedCurrency> = {
  Benin: "XOF",
  "Burkina Faso": "XOF",
  Cameroon: "XAF",
  "Central African Republic": "XAF",
  Chad: "XAF",
  "Côte d'Ivoire": "XOF",
  Egypt: "EGP",
  "Equatorial Guinea": "XAF",
  Gabon: "XAF",
  Ghana: "GHS",
  Guinea: "GNF",
  "Guinea-Bissau": "XOF",
  Kenya: "KES",
  Malawi: "MWK",
  Mali: "XOF",
  Morocco: "MAD",
  Niger: "XOF",
  Nigeria: "NGN",
  "Republic of the Congo": "XAF",
  Rwanda: "RWF",
  "Sao Tome and Principe": "STD",
  Senegal: "XOF",
  "Sierra Leone": "SLL",
  "South Africa": "ZAR",
  Tanzania: "TZS",
  Togo: "XOF",
  Uganda: "UGX",
  Zambia: "ZMW",
};

/** Local currency for a country, or null when there is no local mapping. */
export function currencyForCountry(country: string): SupportedCurrency | null {
  return COUNTRY_CURRENCY[country.trim()] ?? null;
}

export function formatMoneyMinor(amountMinor: number, currency: SupportedCurrency): string {
  const config = CURRENCIES[currency];
  const major = amountMinor / config.minorUnitMultiplier;
  const fractions = config.minorUnitMultiplier === 1 ? 0 : 2;
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: fractions,
      maximumFractionDigits: fractions,
    }).format(major);
  } catch {
    // Some runtimes reject retired ISO codes such as STD.
    return `${config.symbol}${major.toLocaleString()}`;
  }
}
