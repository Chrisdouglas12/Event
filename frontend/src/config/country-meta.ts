/**
 * Calling codes, ISO country codes and currency codes for the registration
 * country picker. The list mirrors `COUNTRIES` so every option can show a flag,
 * a phone prefix and a currency symbol (falling back to the flag when the
 * currency has no single, recognisable symbol).
 */

type CountryMeta = {
  iso2: string;
  dial: string;
  currency?: string;
};

export const COUNTRY_META: Record<string, CountryMeta> = {
  Afghanistan: { iso2: "AF", dial: "+93", currency: "AFN" },
  "Åland Islands": { iso2: "AX", dial: "+358", currency: "EUR" },
  Albania: { iso2: "AL", dial: "+355", currency: "ALL" },
  Algeria: { iso2: "DZ", dial: "+213", currency: "DZD" },
  "American Samoa": { iso2: "AS", dial: "+1684", currency: "USD" },
  Andorra: { iso2: "AD", dial: "+376", currency: "EUR" },
  Angola: { iso2: "AO", dial: "+244", currency: "AOA" },
  Anguilla: { iso2: "AI", dial: "+1264", currency: "XCD" },
  Antarctica: { iso2: "AQ", dial: "+672" },
  "Antigua and Barbuda": { iso2: "AG", dial: "+1268", currency: "XCD" },
  Argentina: { iso2: "AR", dial: "+54", currency: "ARS" },
  Armenia: { iso2: "AM", dial: "+374", currency: "AMD" },
  Aruba: { iso2: "AW", dial: "+297", currency: "AWG" },
  Australia: { iso2: "AU", dial: "+61", currency: "AUD" },
  Austria: { iso2: "AT", dial: "+43", currency: "EUR" },
  Azerbaijan: { iso2: "AZ", dial: "+994", currency: "AZN" },
  Bahamas: { iso2: "BS", dial: "+1242", currency: "BSD" },
  Bahrain: { iso2: "BH", dial: "+973", currency: "BHD" },
  Bangladesh: { iso2: "BD", dial: "+880", currency: "BDT" },
  Barbados: { iso2: "BB", dial: "+1246", currency: "BBD" },
  Belarus: { iso2: "BY", dial: "+375", currency: "BYN" },
  Belgium: { iso2: "BE", dial: "+32", currency: "EUR" },
  Belize: { iso2: "BZ", dial: "+501", currency: "BZD" },
  Benin: { iso2: "BJ", dial: "+229", currency: "XOF" },
  Bermuda: { iso2: "BM", dial: "+1441", currency: "BMD" },
  Bhutan: { iso2: "BT", dial: "+975", currency: "BTN" },
  Bolivia: { iso2: "BO", dial: "+591", currency: "BOB" },
  "Bonaire, Sint Eustatius and Saba": { iso2: "BQ", dial: "+599", currency: "USD" },
  "Bosnia and Herzegovina": { iso2: "BA", dial: "+387", currency: "BAM" },
  Botswana: { iso2: "BW", dial: "+267", currency: "BWP" },
  "Bouvet Island": { iso2: "BV", dial: "+47", currency: "NOK" },
  Brazil: { iso2: "BR", dial: "+55", currency: "BRL" },
  "British Indian Ocean Territory": { iso2: "IO", dial: "+246", currency: "USD" },
  Brunei: { iso2: "BN", dial: "+673", currency: "BND" },
  Bulgaria: { iso2: "BG", dial: "+359", currency: "BGN" },
  "Burkina Faso": { iso2: "BF", dial: "+226", currency: "XOF" },
  Burundi: { iso2: "BI", dial: "+257", currency: "BIF" },
  "Cabo Verde": { iso2: "CV", dial: "+238", currency: "CVE" },
  Cambodia: { iso2: "KH", dial: "+855", currency: "KHR" },
  Cameroon: { iso2: "CM", dial: "+237", currency: "XAF" },
  Canada: { iso2: "CA", dial: "+1", currency: "CAD" },
  "Cayman Islands": { iso2: "KY", dial: "+1345", currency: "KYD" },
  "Central African Republic": { iso2: "CF", dial: "+236", currency: "XAF" },
  Chad: { iso2: "TD", dial: "+235", currency: "XAF" },
  Chile: { iso2: "CL", dial: "+56", currency: "CLP" },
  China: { iso2: "CN", dial: "+86", currency: "CNY" },
  "Christmas Island": { iso2: "CX", dial: "+61", currency: "AUD" },
  "Cocos (Keeling) Islands": { iso2: "CC", dial: "+61", currency: "AUD" },
  Colombia: { iso2: "CO", dial: "+57", currency: "COP" },
  Comoros: { iso2: "KM", dial: "+269", currency: "KMF" },
  "Congo, Democratic Republic of the": { iso2: "CD", dial: "+243", currency: "CDF" },
  "Cook Islands": { iso2: "CK", dial: "+682", currency: "NZD" },
  "Costa Rica": { iso2: "CR", dial: "+506", currency: "CRC" },
  "Côte d'Ivoire": { iso2: "CI", dial: "+225", currency: "XOF" },
  Croatia: { iso2: "HR", dial: "+385", currency: "EUR" },
  Cuba: { iso2: "CU", dial: "+53", currency: "CUP" },
  Curaçao: { iso2: "CW", dial: "+599", currency: "ANG" },
  Cyprus: { iso2: "CY", dial: "+357", currency: "EUR" },
  Czechia: { iso2: "CZ", dial: "+420", currency: "CZK" },
  Denmark: { iso2: "DK", dial: "+45", currency: "DKK" },
  Djibouti: { iso2: "DJ", dial: "+253", currency: "DJF" },
  Dominica: { iso2: "DM", dial: "+1767", currency: "XCD" },
  "Dominican Republic": { iso2: "DO", dial: "+1809", currency: "DOP" },
  Ecuador: { iso2: "EC", dial: "+593", currency: "USD" },
  Egypt: { iso2: "EG", dial: "+20", currency: "EGP" },
  "El Salvador": { iso2: "SV", dial: "+503", currency: "USD" },
  "Equatorial Guinea": { iso2: "GQ", dial: "+240", currency: "XAF" },
  Eritrea: { iso2: "ER", dial: "+291", currency: "ERN" },
  Estonia: { iso2: "EE", dial: "+372", currency: "EUR" },
  Eswatini: { iso2: "SZ", dial: "+268", currency: "SZL" },
  Ethiopia: { iso2: "ET", dial: "+251", currency: "ETB" },
  "Falkland Islands": { iso2: "FK", dial: "+500", currency: "FKP" },
  "Faroe Islands": { iso2: "FO", dial: "+298", currency: "DKK" },
  Fiji: { iso2: "FJ", dial: "+679", currency: "FJD" },
  Finland: { iso2: "FI", dial: "+358", currency: "EUR" },
  France: { iso2: "FR", dial: "+33", currency: "EUR" },
  "French Guiana": { iso2: "GF", dial: "+594", currency: "EUR" },
  "French Polynesia": { iso2: "PF", dial: "+689", currency: "XPF" },
  "French Southern Territories": { iso2: "TF", dial: "+262", currency: "EUR" },
  Gabon: { iso2: "GA", dial: "+241", currency: "XAF" },
  Gambia: { iso2: "GM", dial: "+220", currency: "GMD" },
  Georgia: { iso2: "GE", dial: "+995", currency: "GEL" },
  Germany: { iso2: "DE", dial: "+49", currency: "EUR" },
  Ghana: { iso2: "GH", dial: "+233", currency: "GHS" },
  Gibraltar: { iso2: "GI", dial: "+350", currency: "GIP" },
  Greece: { iso2: "GR", dial: "+30", currency: "EUR" },
  Greenland: { iso2: "GL", dial: "+299", currency: "DKK" },
  Grenada: { iso2: "GD", dial: "+1473", currency: "XCD" },
  Guadeloupe: { iso2: "GP", dial: "+590", currency: "EUR" },
  Guam: { iso2: "GU", dial: "+1671", currency: "USD" },
  Guatemala: { iso2: "GT", dial: "+502", currency: "GTQ" },
  Guernsey: { iso2: "GG", dial: "+44", currency: "GBP" },
  Guinea: { iso2: "GN", dial: "+224", currency: "GNF" },
  "Guinea-Bissau": { iso2: "GW", dial: "+245", currency: "XOF" },
  Guyana: { iso2: "GY", dial: "+592", currency: "GYD" },
  Haiti: { iso2: "HT", dial: "+509", currency: "HTG" },
  "Heard Island and McDonald Islands": { iso2: "HM", dial: "+61", currency: "AUD" },
  "Holy See": { iso2: "VA", dial: "+39", currency: "EUR" },
  Honduras: { iso2: "HN", dial: "+504", currency: "HNL" },
  "Hong Kong": { iso2: "HK", dial: "+852", currency: "HKD" },
  Hungary: { iso2: "HU", dial: "+36", currency: "HUF" },
  Iceland: { iso2: "IS", dial: "+354", currency: "ISK" },
  India: { iso2: "IN", dial: "+91", currency: "INR" },
  Indonesia: { iso2: "ID", dial: "+62", currency: "IDR" },
  Iran: { iso2: "IR", dial: "+98", currency: "IRR" },
  Iraq: { iso2: "IQ", dial: "+964", currency: "IQD" },
  Ireland: { iso2: "IE", dial: "+353", currency: "EUR" },
  "Isle of Man": { iso2: "IM", dial: "+44", currency: "GBP" },
  Israel: { iso2: "IL", dial: "+972", currency: "ILS" },
  Italy: { iso2: "IT", dial: "+39", currency: "EUR" },
  Jamaica: { iso2: "JM", dial: "+1876", currency: "JMD" },
  Japan: { iso2: "JP", dial: "+81", currency: "JPY" },
  Jersey: { iso2: "JE", dial: "+44", currency: "GBP" },
  Jordan: { iso2: "JO", dial: "+962", currency: "JOD" },
  Kazakhstan: { iso2: "KZ", dial: "+7", currency: "KZT" },
  Kenya: { iso2: "KE", dial: "+254", currency: "KES" },
  Kiribati: { iso2: "KI", dial: "+686", currency: "AUD" },
  Kosovo: { iso2: "XK", dial: "+383", currency: "EUR" },
  Kuwait: { iso2: "KW", dial: "+965", currency: "KWD" },
  Kyrgyzstan: { iso2: "KG", dial: "+996", currency: "KGS" },
  Laos: { iso2: "LA", dial: "+856", currency: "LAK" },
  Latvia: { iso2: "LV", dial: "+371", currency: "EUR" },
  Lebanon: { iso2: "LB", dial: "+961", currency: "LBP" },
  Lesotho: { iso2: "LS", dial: "+266", currency: "LSL" },
  Liberia: { iso2: "LR", dial: "+231", currency: "LRD" },
  Libya: { iso2: "LY", dial: "+218", currency: "LYD" },
  Liechtenstein: { iso2: "LI", dial: "+423", currency: "CHF" },
  Lithuania: { iso2: "LT", dial: "+370", currency: "EUR" },
  Luxembourg: { iso2: "LU", dial: "+352", currency: "EUR" },
  Macao: { iso2: "MO", dial: "+853", currency: "MOP" },
  Madagascar: { iso2: "MG", dial: "+261", currency: "MGA" },
  Malawi: { iso2: "MW", dial: "+265", currency: "MWK" },
  Malaysia: { iso2: "MY", dial: "+60", currency: "MYR" },
  Maldives: { iso2: "MV", dial: "+960", currency: "MVR" },
  Mali: { iso2: "ML", dial: "+223", currency: "XOF" },
  Malta: { iso2: "MT", dial: "+356", currency: "EUR" },
  "Marshall Islands": { iso2: "MH", dial: "+692", currency: "USD" },
  Martinique: { iso2: "MQ", dial: "+596", currency: "EUR" },
  Mauritania: { iso2: "MR", dial: "+222", currency: "MRU" },
  Mauritius: { iso2: "MU", dial: "+230", currency: "MUR" },
  Mayotte: { iso2: "YT", dial: "+262", currency: "EUR" },
  Mexico: { iso2: "MX", dial: "+52", currency: "MXN" },
  Micronesia: { iso2: "FM", dial: "+691", currency: "USD" },
  Moldova: { iso2: "MD", dial: "+373", currency: "MDL" },
  Monaco: { iso2: "MC", dial: "+377", currency: "EUR" },
  Mongolia: { iso2: "MN", dial: "+976", currency: "MNT" },
  Montenegro: { iso2: "ME", dial: "+382", currency: "EUR" },
  Montserrat: { iso2: "MS", dial: "+1664", currency: "XCD" },
  Morocco: { iso2: "MA", dial: "+212", currency: "MAD" },
  Mozambique: { iso2: "MZ", dial: "+258", currency: "MZN" },
  Myanmar: { iso2: "MM", dial: "+95", currency: "MMK" },
  Namibia: { iso2: "NA", dial: "+264", currency: "NAD" },
  Nauru: { iso2: "NR", dial: "+674", currency: "AUD" },
  Nepal: { iso2: "NP", dial: "+977", currency: "NPR" },
  Netherlands: { iso2: "NL", dial: "+31", currency: "EUR" },
  "New Caledonia": { iso2: "NC", dial: "+687", currency: "XPF" },
  "New Zealand": { iso2: "NZ", dial: "+64", currency: "NZD" },
  Nicaragua: { iso2: "NI", dial: "+505", currency: "NIO" },
  Niger: { iso2: "NE", dial: "+227", currency: "XOF" },
  Nigeria: { iso2: "NG", dial: "+234", currency: "NGN" },
  Niue: { iso2: "NU", dial: "+683", currency: "NZD" },
  "Norfolk Island": { iso2: "NF", dial: "+672", currency: "AUD" },
  "North Korea": { iso2: "KP", dial: "+850", currency: "KPW" },
  "North Macedonia": { iso2: "MK", dial: "+389", currency: "MKD" },
  "Northern Mariana Islands": { iso2: "MP", dial: "+1670", currency: "USD" },
  Norway: { iso2: "NO", dial: "+47", currency: "NOK" },
  Oman: { iso2: "OM", dial: "+968", currency: "OMR" },
  Pakistan: { iso2: "PK", dial: "+92", currency: "PKR" },
  Palau: { iso2: "PW", dial: "+680", currency: "USD" },
  Palestine: { iso2: "PS", dial: "+970", currency: "ILS" },
  Panama: { iso2: "PA", dial: "+507", currency: "PAB" },
  "Papua New Guinea": { iso2: "PG", dial: "+675", currency: "PGK" },
  Paraguay: { iso2: "PY", dial: "+595", currency: "PYG" },
  Peru: { iso2: "PE", dial: "+51", currency: "PEN" },
  Philippines: { iso2: "PH", dial: "+63", currency: "PHP" },
  Pitcairn: { iso2: "PN", dial: "+64", currency: "NZD" },
  Poland: { iso2: "PL", dial: "+48", currency: "PLN" },
  Portugal: { iso2: "PT", dial: "+351", currency: "EUR" },
  "Puerto Rico": { iso2: "PR", dial: "+1787", currency: "USD" },
  Qatar: { iso2: "QA", dial: "+974", currency: "QAR" },
  "Republic of the Congo": { iso2: "CG", dial: "+242", currency: "XAF" },
  Réunion: { iso2: "RE", dial: "+262", currency: "EUR" },
  Romania: { iso2: "RO", dial: "+40", currency: "RON" },
  Russia: { iso2: "RU", dial: "+7", currency: "RUB" },
  Rwanda: { iso2: "RW", dial: "+250", currency: "RWF" },
  "Saint Barthélemy": { iso2: "BL", dial: "+590", currency: "EUR" },
  "Saint Helena, Ascension and Tristan da Cunha": { iso2: "SH", dial: "+290", currency: "SHP" },
  "Saint Kitts and Nevis": { iso2: "KN", dial: "+1869", currency: "XCD" },
  "Saint Lucia": { iso2: "LC", dial: "+1758", currency: "XCD" },
  "Saint Martin (French part)": { iso2: "MF", dial: "+590", currency: "EUR" },
  "Saint Pierre and Miquelon": { iso2: "PM", dial: "+508", currency: "EUR" },
  "Saint Vincent and the Grenadines": { iso2: "VC", dial: "+1784", currency: "XCD" },
  Samoa: { iso2: "WS", dial: "+685", currency: "WST" },
  "San Marino": { iso2: "SM", dial: "+378", currency: "EUR" },
  "Sao Tome and Principe": { iso2: "ST", dial: "+239", currency: "STN" },
  "Saudi Arabia": { iso2: "SA", dial: "+966", currency: "SAR" },
  Senegal: { iso2: "SN", dial: "+221", currency: "XOF" },
  Serbia: { iso2: "RS", dial: "+381", currency: "RSD" },
  Seychelles: { iso2: "SC", dial: "+248", currency: "SCR" },
  "Sierra Leone": { iso2: "SL", dial: "+232", currency: "SLE" },
  Singapore: { iso2: "SG", dial: "+65", currency: "SGD" },
  "Sint Maarten (Dutch part)": { iso2: "SX", dial: "+1721", currency: "ANG" },
  Slovakia: { iso2: "SK", dial: "+421", currency: "EUR" },
  Slovenia: { iso2: "SI", dial: "+386", currency: "EUR" },
  "Solomon Islands": { iso2: "SB", dial: "+677", currency: "SBD" },
  Somalia: { iso2: "SO", dial: "+252", currency: "SOS" },
  "South Africa": { iso2: "ZA", dial: "+27", currency: "ZAR" },
  "South Georgia and the South Sandwich Islands": { iso2: "GS", dial: "+500", currency: "FKP" },
  "South Korea": { iso2: "KR", dial: "+82", currency: "KRW" },
  "South Sudan": { iso2: "SS", dial: "+211", currency: "SSP" },
  Spain: { iso2: "ES", dial: "+34", currency: "EUR" },
  "Sri Lanka": { iso2: "LK", dial: "+94", currency: "LKR" },
  Sudan: { iso2: "SD", dial: "+249", currency: "SDG" },
  Suriname: { iso2: "SR", dial: "+597", currency: "SRD" },
  "Svalbard and Jan Mayen": { iso2: "SJ", dial: "+47", currency: "NOK" },
  Sweden: { iso2: "SE", dial: "+46", currency: "SEK" },
  Switzerland: { iso2: "CH", dial: "+41", currency: "CHF" },
  Syria: { iso2: "SY", dial: "+963", currency: "SYP" },
  Taiwan: { iso2: "TW", dial: "+886", currency: "TWD" },
  Tajikistan: { iso2: "TJ", dial: "+992", currency: "TJS" },
  Tanzania: { iso2: "TZ", dial: "+255", currency: "TZS" },
  Thailand: { iso2: "TH", dial: "+66", currency: "THB" },
  "Timor-Leste": { iso2: "TL", dial: "+670", currency: "USD" },
  Togo: { iso2: "TG", dial: "+228", currency: "XOF" },
  Tokelau: { iso2: "TK", dial: "+64", currency: "NZD" },
  Tonga: { iso2: "TO", dial: "+676", currency: "TOP" },
  "Trinidad and Tobago": { iso2: "TT", dial: "+1868", currency: "TTD" },
  Tunisia: { iso2: "TN", dial: "+216", currency: "TND" },
  Turkey: { iso2: "TR", dial: "+90", currency: "TRY" },
  Turkmenistan: { iso2: "TM", dial: "+993", currency: "TMT" },
  "Turks and Caicos Islands": { iso2: "TC", dial: "+1649", currency: "USD" },
  Tuvalu: { iso2: "TV", dial: "+688", currency: "AUD" },
  Uganda: { iso2: "UG", dial: "+256", currency: "UGX" },
  Ukraine: { iso2: "UA", dial: "+380", currency: "UAH" },
  "United Arab Emirates": { iso2: "AE", dial: "+971", currency: "AED" },
  "United Kingdom": { iso2: "GB", dial: "+44", currency: "GBP" },
  "United States": { iso2: "US", dial: "+1", currency: "USD" },
  "United States Minor Outlying Islands": { iso2: "UM", dial: "+1", currency: "USD" },
  Uruguay: { iso2: "UY", dial: "+598", currency: "UYU" },
  Uzbekistan: { iso2: "UZ", dial: "+998", currency: "UZS" },
  Vanuatu: { iso2: "VU", dial: "+678", currency: "VUV" },
  Venezuela: { iso2: "VE", dial: "+58", currency: "VES" },
  Vietnam: { iso2: "VN", dial: "+84", currency: "VND" },
  "Virgin Islands (British)": { iso2: "VG", dial: "+1284", currency: "USD" },
  "Virgin Islands (U.S.)": { iso2: "VI", dial: "+1340", currency: "USD" },
  "Wallis and Futuna": { iso2: "WF", dial: "+681", currency: "XPF" },
  "Western Sahara": { iso2: "EH", dial: "+212", currency: "MAD" },
  Yemen: { iso2: "YE", dial: "+967", currency: "YER" },
  Zambia: { iso2: "ZM", dial: "+260", currency: "ZMW" },
  Zimbabwe: { iso2: "ZW", dial: "+263", currency: "ZWL" },
};

function normalise(name: string) {
  return name.trim().toLowerCase();
}

const COUNTRY_META_BY_LOWERCASE = Object.fromEntries(
  Object.entries(COUNTRY_META).map(([name, meta]) => [normalise(name), meta])
) as Record<string, CountryMeta>;

export function getCountryMeta(name: string): CountryMeta | undefined {
  return COUNTRY_META[name] ?? COUNTRY_META_BY_LOWERCASE[normalise(name)];
}

export function countryFlag(name: string): string {
  const iso2 = getCountryMeta(name)?.iso2;
  if (!iso2 || iso2.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((letter) => 127397 + letter.charCodeAt(0))
  );
}

export function countryDialCode(name: string): string {
  return getCountryMeta(name)?.dial ?? "+234";
}

export function countryCurrencySymbol(name: string): string | undefined {
  const currency = getCountryMeta(name)?.currency;
  if (!currency) return undefined;
  try {
    const symbol = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value;
    if (!symbol || /^[A-Z]{3}$/.test(symbol) || symbol.length > 4) return undefined;
    return symbol;
  } catch {
    return undefined;
  }
}

/** Currency symbol when it is a real glyph; otherwise the national flag. */
export function countryCurrencyBadge(name: string): string {
  return countryCurrencySymbol(name) ?? countryFlag(name);
}

/** Replace the leading dial code while keeping whatever number was typed. */
export function phoneWithCountryDial(phone: string, dialCode: string): string {
  const trimmed = phone.trim();
  const leadingCode = trimmed.match(/^\+\d+/)?.[0] ?? "";
  const digits = trimmed.replace(/\D/g, "");
  const national = leadingCode ? digits.slice(leadingCode.length - 1) : digits;
  return `${dialCode}${national ? ` ${national}` : " "}`;
}
