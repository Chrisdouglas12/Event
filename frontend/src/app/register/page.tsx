"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/marketing/header";
import { Countdown } from "@/components/ui/countdown";
import {
  FacebookIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/icons/social-icons";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  CircleQuestionMark,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Monitor,
  Phone,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  COUNTRIES,
  NIGERIA,
  NIGERIAN_STATES,
  findCountry,
  findNigerianState,
} from "@/config/countries";
import {
  countryCurrencyBadge,
  countryDialCode,
  countryIso2,
  phoneWithCountryDial,
} from "@/config/country-meta";
import {
  CURRENCIES,
  CURRENCY_LIST,
  currencyForCountry,
  formatMoneyMinor,
  type SupportedCurrency,
} from "@/config/currencies";
import { SITE_CONFIG } from "@/config/site";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INITIAL_PHONE = "+234 ";
const LEGACY_DRAFT_KEY = "ihgc_draft_registration";
const TOTAL_STEPS = 6;
const HISTORY_KEY = "registrationStep";

/* Real flag images instead of regional-indicator emoji, which Windows desktop
   browsers do not render. XAF/XOF use a representative member-country flag. */
const CURRENCY_FLAG_ISO2: Record<SupportedCurrency, string> = {
  NGN: "NG",
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  EGP: "EG",
  GHS: "GH",
  GNF: "GN",
  KES: "KE",
  MAD: "MA",
  MWK: "MW",
  RWF: "RW",
  SLL: "SL",
  STD: "ST",
  TZS: "TZ",
  UGX: "UG",
  XAF: "CM",
  XOF: "SN",
  ZAR: "ZA",
  ZMW: "ZM",
};

/** Keep the currencies most attendees use at the top of the picker. */
const PREFERRED_CURRENCIES: SupportedCurrency[] = ["NGN", "USD", "EUR", "GBP"];

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (target?: string | HTMLElement) => void;
};
const getTurnstile = () =>
  (window as unknown as { turnstile?: TurnstileApi }).turnstile;

type FieldKey =
  | "groupName"
  | "seats"
  | "inviteeCount"
  | "genderCounts"
  | "hasChildren"
  | "childCount"
  | "gender"
  | "firstTime"
  | "payerName"
  | "payerPhone"
  | "payerEmail"
  | "country"
  | "state"
  | "guardianName"
  | "guardianPhone"
  | "customAmount"
  | "groupAttendance"
  | "consent"
  | "turnstile";
type FieldErrors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = [
  "groupName",
  "seats",
  "country",
  "state",
  "inviteeCount",
  "hasChildren",
  "childCount",
  "genderCounts",
  "gender",
  "firstTime",
  "payerName",
  "payerPhone",
  "payerEmail",
  "guardianName",
  "guardianPhone",
  "groupAttendance",
  "customAmount",
  "consent",
  "turnstile",
];

const FIELD_STEP: Record<FieldKey, number> = {
  groupName: 2,
  seats: 2,
  inviteeCount: 2,
  hasChildren: 2,
  childCount: 2,
  genderCounts: 2,
  gender: 2,
  firstTime: 2,
  country: 3,
  state: 3,
  payerName: 3,
  payerPhone: 3,
  payerEmail: 3,
  guardianName: 3,
  guardianPhone: 3,
  groupAttendance: 4,
  customAmount: 5,
  consent: 6,
  turnstile: 6,
};

const ATTENDANCE_OPTIONS = [
  ["physically", "Physically"],
  ["online", "Online"],
  ["not_sure", "Not sure"],
] as const;

const ATTENDANCE_ICONS: Record<(typeof ATTENDANCE_OPTIONS)[number][0], LucideIcon> = {
  physically: MapPin,
  online: Monitor,
  not_sure: CircleQuestionMark,
};

function toE164Phone(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^2340\d{10}$/.test(digits)) digits = `234${digits.slice(4)}`;
  if (/^234\d{10}$/.test(digits)) return `+${digits}`;
  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^\d{10}$/.test(digits)) return `+234${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

function makeIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const normaliseSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toInt = (value: string) => Number.parseInt(value, 10) || 0;


type CompletedItem = {
  label: string;
  value: string;
  onEdit: () => void;
};

function CompletedDetails({ items }: { items: CompletedItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-[#D6EFE9] bg-[#F5FBFA] px-3.5 py-2.5 text-[12px] leading-5 text-[#4B5563]">
      <span className="font-bold uppercase tracking-[0.16em] text-[#0E7A6E]">
        Completed
      </span>
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex min-w-0 items-center gap-1.5">
          {index > 0 && (
            <span aria-hidden="true" className="mr-1.5 hidden h-3 w-px bg-[#CDE7E1] sm:block" />
          )}
          <Check className="h-3.5 w-3.5 shrink-0 text-[#0E7A6E]" strokeWidth={2.5} aria-hidden="true" />
          <span className="shrink-0">{item.label}:</span>
          <span
            className="min-w-0 max-w-[220px] truncate font-semibold text-[#0E1020]"
            title={item.value}
          >
            {item.value}
          </span>
          <button
            type="button"
            onClick={item.onEdit}
            className="shrink-0 font-semibold text-[#0E7A6E] transition-colors hover:underline"
            aria-label={`Edit ${item.label.toLowerCase()}`}
          >
            Edit
          </button>
        </span>
      ))}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3.5 text-[14px] sm:text-[15px]">
      <span className="shrink-0 text-[#4B5563]">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-[#0E1020] sm:max-w-[70%]">
        {children}
      </span>
    </div>
  );
}

const STEP_LABELS = ["Choose", "Details", "Contact", "Attend", "Payment", "Confirm"] as const;

function StepProgress({ step }: { step: number }) {
  const progress = TOTAL_STEPS > 1 ? ((step - 1) / (TOTAL_STEPS - 1)) * 100 : 0;

  return (
    <div className="mb-6 w-full" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="register-eyebrow">Registration · IHGC 2026</span>
        <span className="text-[12px] font-semibold text-[#0E1020]">
          Step {String(step).padStart(2, "0")} of {TOTAL_STEPS}
        </span>
      </div>
      <div className="relative flex items-start justify-between">
        <span aria-hidden className="absolute left-3 right-3 top-[13px] h-px bg-[#E5E7EB]" />
        <span
          aria-hidden
          className="absolute left-3 top-[13px] h-px bg-[#0E1020] transition-[width] duration-500"
          style={{ width: `calc((100% - 24px) * ${progress / 100})` }}
        />
        {STEP_LABELS.map((label, index) => {
          const value = index + 1;
          const done = value <= step;
          return (
            <div key={label} className="relative z-10 flex min-w-0 flex-col items-center gap-2">
              <span
                className={`grid h-[26px] w-[26px] place-items-center rounded-full border text-[11px] font-bold transition-colors ${
                  done
                    ? "border-[#0E1020] bg-[#0E1020] text-white"
                    : "border-[#D1D5DB] bg-white text-[#9CA3AF]"
                }`}
                aria-current={value === step ? "step" : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : value}
              </span>
              <span className="hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] sm:block">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cross-platform flag badge. Emoji flags fail on Windows desktop, so the
 * registration form uses small flag images with an ISO-code fallback.
 */
function FlagImage({
  iso2,
  label,
  className = "h-4 w-6",
}: {
  iso2: string;
  label?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const code = iso2.toUpperCase();

  if (failed || code.length !== 2) {
    return (
      <span
        aria-hidden={label ? undefined : true}
        className={`flag-fallback ${className}`}
      >
        {code || "–"}
      </span>
    );
  }

  const lower = code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${lower}.png`}
      srcSet={`https://flagcdn.com/w20/${lower}.png 1x, https://flagcdn.com/w40/${lower}.png 2x`}
      width={24}
      height={16}
      alt={label ? `${label} flag` : ""}
      aria-hidden={label ? undefined : true}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`flag-image ${className}`}
    />
  );
}

/**
 * Compact searchable currency picker. The old grid of 18 buttons took over the
 * payment step; this keeps the full choice one click away without the clutter.
 */
function CurrencyPicker({
  value,
  pricesMinor,
  currencyAvailable,
  disabled,
  onSelect,
}: {
  value: SupportedCurrency;
  pricesMinor: Partial<Record<SupportedCurrency, number>>;
  currencyAvailable: Record<string, boolean>;
  disabled: boolean;
  onSelect: (code: SupportedCurrency) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const term = query.trim().toLowerCase();
    const ranked = CURRENCY_LIST.slice().sort((a, b) => {
      const aIndex = PREFERRED_CURRENCIES.indexOf(a);
      const bIndex = PREFERRED_CURRENCIES.indexOf(b);
      return (
        (aIndex === -1 ? PREFERRED_CURRENCIES.length : aIndex) -
        (bIndex === -1 ? PREFERRED_CURRENCIES.length : bIndex)
      );
    });

    if (!term) return ranked;
    return ranked.filter((code) => {
      const config = CURRENCIES[code];
      return (
        code.toLowerCase().includes(term) ||
        config.label.toLowerCase().includes(term) ||
        config.symbol.toLowerCase().includes(term)
      );
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const activeCode = options[activeIndex];
    if (!activeCode) return;
    document
      .getElementById(`currency-option-${activeCode}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, options]);

  const selectCurrency = (code: SupportedCurrency) => {
    onSelect(code);
    setOpen(false);
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!options.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const code = options[activeIndex];
      if (code && currencyAvailable[code] !== false) selectCurrency(code);
    }
  };

  const selectedPrice = pricesMinor[value];
  const activeDescendant = options[activeIndex]
    ? `currency-option-${options[activeIndex]}`
    : undefined;

  return (
    <div ref={wrapRef} className="relative">
      <button
        id="field-currency"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="currency-listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex h-[60px] w-full items-center justify-between gap-3 rounded-[12px] border border-[#D1D5DB] bg-white px-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1020]/25 disabled:cursor-wait disabled:opacity-70 sm:px-4"
      >
        <span className="flex min-w-0 items-center gap-3">
          <FlagImage
            iso2={CURRENCY_FLAG_ISO2[value]}
            label={CURRENCIES[value].label}
            className="h-5 w-7 shrink-0 rounded-[2px] object-cover"
          />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-[#111C18]">
              {CURRENCIES[value].label}
            </span>
            <span className="mt-0.5 block text-[11px] text-[#6B7280]">
              {value}
              {typeof selectedPrice === "number" ? (
                <>
                  {" · "}
                  <span className="currency-symbol">{formatMoneyMinor(selectedPrice, value)}</span>
                  {" per person"}
                </>
              ) : (
                " · loading price"
              )}
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[14px] border border-[#D1D5DB] bg-white"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              value={query}
              aria-expanded
              aria-controls="currency-listbox"
              aria-activedescendant={activeDescendant}
              aria-label="Search currencies"
              placeholder="Search currency or country"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              className="h-8 w-full border-0 bg-transparent text-[13px] text-[#111C18] outline-none placeholder:text-[#9CA3AF]"
            />
          </div>

          <ul
            id="currency-listbox"
            role="listbox"
            aria-label="Currency"
            className="max-h-[292px] overflow-y-auto overscroll-contain py-1.5"
          >
            {options.map((code, index) => {
              const unavailable = currencyAvailable[code] === false;
              const price = pricesMinor[code];
              const selected = code === value;
              return (
                <li key={code} role="presentation">
                  <button
                    id={`currency-option-${code}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={unavailable}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCurrency(code)}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      index === activeIndex ? "bg-[#EEF1F6]" : "bg-white hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <FlagImage
                      iso2={CURRENCY_FLAG_ISO2[code]}
                      label={CURRENCIES[code].label}
                      className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#111C18]">
                        {CURRENCIES[code].label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[#6B7280]">
                        {unavailable ? (
                          "Currently unavailable"
                        ) : typeof price === "number" ? (
                          <>
                            <span className="currency-symbol">{formatMoneyMinor(price, code)}</span>
                            {" per person"}
                          </>
                        ) : (
                          "Price loading"
                        )}
                      </span>
                    </span>
                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-[#0E1020]" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}

            {options.length === 0 && (
              <li className="px-4 py-7 text-center text-[13px] text-[#6B7280]">
                No currency found. Try the currency code, e.g. NGN.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="h-px w-7 bg-[#8EE3D6]" />
        <span className="register-eyebrow">
          Step {String(step).padStart(2, "0")} · {STEP_LABELS[step - 1]}
        </span>
      </div>
      <h1 className="register-title text-[20px] font-semibold uppercase leading-tight tracking-wide text-[#0E1020]">
        {title}
      </h1>
      <p className="max-w-2xl text-[14px] leading-relaxed text-[#4B5563] sm:text-[15px]">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full space-y-2">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-[#0E1020]">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[12px] leading-relaxed text-[#6B7280]">{hint}</p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-rose-600"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all sm:min-h-[40px] sm:px-4 sm:text-[14px] ${
        active
          ? "border-[#0E1020] bg-[#0E1020] text-white"
          : "border-[#D1D5DB] bg-white text-[#0E1020] hover:border-[#0E1020] hover:bg-[#F5F6F8]"
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

function ToggleRow({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-[12px] border border-[#D1D5DB] bg-white px-4 py-4 text-left transition hover:border-[#0E1020] hover:bg-[#F5F6F8]"
    >
      <span className="min-w-0 text-[14px] font-medium text-[#0E1020]">
        {label}
        {description && (
          <small className="mt-1 block text-[12px] font-normal leading-relaxed text-[#6B7280]">
            {description}
          </small>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#0E1020]" : "bg-[#D1D5DB]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function NumberField({
  id,
  value,
  min = 0,
  max,
  onChange,
  onBlur,
  invalid,
  describedBy,
  label,
}: {
  id: string;
  value: string | number;
  min?: number;
  max?: number;
  onChange: (next: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  label: string;
}) {
  const parsed = Number.parseInt(String(value), 10);
  const current = Number.isFinite(parsed) ? parsed : 0;
  const canDecrease = current > min;
  const canIncrease = max === undefined || current < max;

  return (
    <div
      className={`flex h-[60px] w-full items-center overflow-hidden rounded-[12px] border bg-white transition focus-within:ring-2 ${
        invalid
          ? "border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500/20"
          : "border-[#D1D5DB] focus-within:border-[#0E1020] focus-within:ring-[#0E1020]/20"
      }`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${label}`}
        disabled={!canDecrease}
        onClick={() => onChange(String(Math.max(min, current - 1)))}
        className="flex h-full w-12 shrink-0 items-center justify-center border-r border-[#E5E7EB] text-[#4B5563] transition hover:bg-[#EEF1F6] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="min-w-0 flex-1 bg-transparent px-2 text-center text-[16px] font-semibold text-[#0E1020] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${label}`}
        disabled={!canIncrease}
        onClick={() =>
          onChange(String(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, current + 1))))
        }
        className="flex h-full w-12 shrink-0 items-center justify-center border-l border-[#E5E7EB] text-[#4B5563] transition hover:bg-[#EEF1F6] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Tally({
  id,
  current,
  total,
  unit,
  error,
}: {
  id: string;
  current: number;
  total: number;
  unit: string;
  error?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const matched = total > 0 && current === total;

  let text: string;
  if (total <= 0) text = "Enter the number of participants first.";
  else if (matched) text = `All ${total} ${unit} assigned`;
  else if (current < total) text = `${total - current} of ${total} ${unit} still to assign`;
  else text = `${current - total} over. Reduce a count so the total is ${total}.`;

  return (
    <div className="rounded-[12px] border border-[#D6EFE9] bg-[#F5FBFA] p-4">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DCE7E4]">
        <span
          aria-hidden="true"
          className={`block h-full rounded-full transition-all ${
            error ? "bg-rose-500" : matched ? "bg-[#0E7A6E]" : "bg-[#8FB8A9]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {error ? (
        <p id={id} role="alert" className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        <p aria-live="polite" className="mt-2.5 flex items-center gap-1.5 text-[13px] text-[#4B5563]">
          {matched && <Check className="h-3.5 w-3.5 text-[#0E7A6E]" />}
          <span>{text}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Searchable country/state picker. Keeps focus while filtering and supports
 * arrow keys + Enter, matching the behaviour of the original full form.
 */
function SearchableSelect({
  id,
  value,
  options,
  onChange,
  onTyping,
  placeholder,
  disabled = false,
  emptyMessage = "No matches found",
  inputProps,
  renderOption,
  renderLeading,
}: {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  onTyping?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  renderOption?: (option: string) => React.ReactNode;
  renderLeading?: (value: string) => React.ReactNode;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const needle = normaliseSearch(query.trim());
  const selectedNeedle = normaliseSearch(value.trim());
  const showAll = !needle || needle === selectedNeedle;

  const filtered = useMemo(() => {
    if (showAll) return options;
    return options.filter((option) => normaliseSearch(option).includes(needle));
  }, [needle, options, showAll]);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const currentIndex = filtered.findIndex(
    (option) => normaliseSearch(option) === selectedNeedle
  );

  const commit = (option: string) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const resetToValue = () => {
    setQuery(value);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
      } else {
        setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(currentIndex >= 0 ? currentIndex : Math.max(0, filtered.length - 1));
      } else {
        setActiveIndex((index) => Math.max(0, index - 1));
      }
    } else if (event.key === "Enter" && open && filtered[activeIndex]) {
      event.preventDefault();
      commit(filtered[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      resetToValue();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          resetToValue();
        }
      }}
    >
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[18px] text-[#6B7280]">
        {renderLeading?.(value) ?? (disabled ? <Lock className="h-4 w-4" /> : <Search className="h-4 w-4" />)}
      </div>
      <input
        {...inputProps}
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          onTyping?.(next);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
        }}
        onKeyDown={handleKeyDown}
        className={`h-[60px] w-full rounded-[12px] border bg-white pl-11 pr-10 text-[16px] text-[#0E1020] outline-none transition placeholder:text-gray-400 focus:border-[#0E1020] focus:ring-2 focus:ring-[#0E1020]/20 disabled:cursor-not-allowed disabled:bg-[#F5FBFA] disabled:text-gray-500 ${
          inputProps?.["aria-invalid"] ? "border-rose-500" : "border-[#D1D5DB]"
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (disabled) return;
          setOpen((wasOpen) => !wasOpen);
          setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
          inputRef.current?.focus();
        }}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-gray-500 transition hover:text-[#0E1020] disabled:opacity-40"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      {open && !disabled && (
        <div
          ref={listRef}
          id={`${id}-options`}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-auto rounded-[12px] border border-[#E5E7EB] bg-white p-1.5"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-[14px] text-[#6B7280]">{emptyMessage}</div>
          ) : (
            filtered.map((option, index) => (
              <div
                key={option}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option === value}
                data-active={index === activeIndex ? "true" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(option)}
                className={`flex cursor-pointer items-center gap-2 rounded-[8px] px-3 py-2.5 text-[14px] text-[#0E1020] transition ${
                  index === activeIndex ? "bg-[#EEF1F6]" : "hover:bg-[#EEF1F6]"
                }`}
              >
                <span
                  className={`flex min-w-0 flex-1 items-center gap-2 ${
                    option === value ? "font-semibold text-[#0E1020]" : ""
                  }`}
                >
                  {renderOption ? renderOption(option) : option}
                </span>
                {option === value && (
                  <Check className="ml-1 h-4 w-4 shrink-0 text-[#0E1020]" aria-hidden />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RegistrationLayout({
  step,
  hintBelowCard,
  children,
}: {
  step: number;
  hintBelowCard?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="register-shell register-premium-bg flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-start px-4 pb-10 pt-4 sm:pb-14 sm:pt-6">
        <div className="flex w-full max-w-[700px] flex-col items-center">
          <StepProgress step={step} />
          <div className="register-premium-card w-full overflow-hidden rounded-[4px] bg-white">
            <div className="register-top-plate flex min-w-0 items-center justify-between gap-2 rounded-t-[4px] px-4 py-4 text-[#0E1020] sm:px-12 sm:py-5">
              <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#8EE3D6] to-transparent" />
              <div className="relative z-10 flex min-w-0 items-center gap-2 sm:gap-4">
                <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-[#0E1020] sm:text-[13px]">
                  IHGC 2026
                </span>
                <span aria-hidden className="hidden h-4 w-px bg-[#D1D5DB] sm:block" />
                <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-[#4B5563] sm:text-[13px]">
                  <span className="whitespace-nowrap sm:hidden">In</span>
                  <span className="hidden whitespace-nowrap sm:inline">Begins in</span>
                  <span className="min-w-0 text-[#0E1020] [&>div]:gap-1 sm:[&>div]:gap-1.5">
                    <Countdown compact onLight />
                  </span>
                </div>
              </div>
              <Link
                href="/programme"
                aria-label="View schedule"
                title="View schedule"
                className="relative z-10 inline-flex shrink-0 items-center whitespace-nowrap text-[12px] font-semibold text-[#0E7A6E] transition-colors hover:text-[#0E1020] sm:text-[13px]"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[3px] bg-[#8EE3D6]/45">
                  <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                </span>
                <span className="hidden sm:ml-1.5 sm:inline">View schedule</span>
              </Link>
            </div>
            <div className="p-6 sm:p-12">{children}</div>
          </div>
          <div className="mt-5 flex w-full flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12px] text-[#6B7280]">
              <span className="font-medium text-[#0E1020]">Need help?</span>
              <a
                href={SITE_CONFIG.contact.phoneTel}
                className="inline-flex items-center gap-1.5 font-medium text-[#0E1020] transition hover:text-[#0E7A6E]"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                <span>{SITE_CONFIG.contact.phone}</span>
              </a>
              <span aria-hidden className="hidden h-3 w-px bg-[#D1D5DB] sm:block" />
              <div className="flex items-center gap-2.5">
                <a
                  href={SITE_CONFIG.contact.whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with us on WhatsApp"
                  className="text-[#6B7280] transition hover:text-[#0E7A6E]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </a>
                <a
                  href={SITE_CONFIG.socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="HOREMOW on Facebook"
                  className="text-[#6B7280] transition hover:text-[#0E7A6E]"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
                <a
                  href={SITE_CONFIG.socials.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="HOREMOW on YouTube"
                  className="text-[#6B7280] transition hover:text-[#0E7A6E]"
                >
                  <YoutubeIcon className="h-4 w-4" />
                </a>
                <a
                  href={SITE_CONFIG.socials.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="HOREMOW on X"
                  className="text-[#6B7280] transition hover:text-[#0E7A6E]"
                >
                  <XIcon className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-center text-[12px] text-[#6B7280]">
              <Lock className="h-3.5 w-3.5 shrink-0 text-[#0E7A6E]" aria-hidden />
              <span>
                {hintBelowCard ??
                  "Secure registration · Your progress stays on this device"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* =========================================================================
 * Main component: functional registration flow in the step-by-step UI.
 * ========================================================================= */

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isGroup, setIsGroup] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>("NGN");
  const [pricesMinor, setPricesMinor] = useState<Partial<Record<SupportedCurrency, number>>>({});
  const [currencyAvailable, setCurrencyAvailable] = useState<Record<string, boolean>>({});
  const [customAmountCutoffAt, setCustomAmountCutoffAt] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [configState, setConfigState] = useState<"loading" | "ready" | "error">("loading");
  const [now, setNow] = useState(() => Date.now());

  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState(INITIAL_PHONE);
  const [payerEmail, setPayerEmail] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [groupName, setGroupName] = useState("");
  const [seatsInput, setSeatsInput] = useState("0");
  const parsedSeats = Number.parseInt(seatsInput, 10);
  const seatsCount = Number.isFinite(parsedSeats) ? Math.min(500, Math.max(0, parsedSeats)) : 0;
  const [attendanceMode, setAttendanceMode] = useState<"physically" | "online" | "not_sure">("physically");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [firstTime, setFirstTime] = useState<"yes" | "no">("no");
  const [hasInvitees, setHasInvitees] = useState(false);
  const [inviteeCount, setInviteeCount] = useState("0");
  const [genderCounts, setGenderCounts] = useState({ male: 0, female: 0 });
  const [hasChildren, setHasChildren] = useState(false);
  const [childCount, setChildCount] = useState(0);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("5000");
  const [customAmountTouched, setCustomAmountTouched] = useState(false);
  const [groupAttendance, setGroupAttendance] = useState({ physically: 0, online: 0, not_sure: 0 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const checkoutAttempt = useRef<{ payload: string; key: string } | null>(null);

  const errorCount = Object.keys(fieldErrors).length;
  const matchedCountry = findCountry(country);
  const matchedState = findNigerianState(state);
  const isNigeria = matchedCountry === NIGERIA || country.trim().toLowerCase() === "nigeria";
  const selectedCountry = findCountry(country) ?? country;
  const selectedDial = countryDialCode(selectedCountry);
  const inviteeNumber = hasInvitees ? Number(inviteeCount) || 0 : 0;
  const returningCount = Math.max(0, seatsCount - inviteeNumber);
  const groupAttendanceTotal =
    groupAttendance.physically + groupAttendance.online + groupAttendance.not_sure;

  const [stateOptions, setStateOptions] = useState<readonly string[]>(NIGERIAN_STATES);
  const [statesLoading, setStatesLoading] = useState(false);
  const stateCache = useRef<Record<string, readonly string[]>>({ [NIGERIA]: NIGERIAN_STATES });

  // First-time attendees coming from outside Nigeria must tell us where they
  // are coming from. Groups count as first-time when they have invitees.
  const isFirstTimeAttendee = isGroup ? inviteeNumber > 0 : firstTime === "yes";
  const requiresForeignState = !isNigeria && isFirstTimeAttendee;

  // Country/state belong to the group-details step for groups, but to the
  // contact step for individuals, matching the original working form.
  const fieldStep = (key: FieldKey): number =>
    key === "country" || key === "state" ? (isGroup ? 2 : 3) : FIELD_STEP[key];

  const writeStepToHistory = useCallback((next: number, replace = false) => {
    if (typeof window === "undefined") return;
    const state = { ...(window.history.state || {}), [HISTORY_KEY]: next };
    if (replace) window.history.replaceState(state, "");
    else window.history.pushState(state, "");
  }, []);

  const goToStep = useCallback(
    (target: number, replace = false) => {
      const next = Math.min(TOTAL_STEPS, Math.max(1, target));
      setStep(next);
      writeStepToHistory(next, replace);
    },
    [writeStepToHistory]
  );


  const resetTurnstile = useCallback(() => {
    const api = getTurnstile();
    if (turnstileRef.current && api) {
      try {
        api.reset(turnstileRef.current);
      } catch (_) {}
    }
    setTurnstileToken(null);
  }, []);

  const resetForm = useCallback(() => {
    goToStep(1, true);
    setIsGroup(false);
    setCurrency("NGN");
    setPayerName("");
    setPayerPhone(INITIAL_PHONE);
    setPayerEmail("");
    setCountry("Nigeria");
    setState("");
    setGroupName("");
    setSeatsInput("0");
    setAttendanceMode("physically");
    setGender("male");
    setFirstTime("no");
    setHasInvitees(false);
    setInviteeCount("0");
    setGenderCounts({ male: 0, female: 0 });
    setHasChildren(false);
    setChildCount(0);
    setIsMinor(false);
    setGuardianName("");
    setGuardianPhone("");
    setConsent(false);
    setCustomAmount("5000");
    setCustomAmountTouched(false);
    setGroupAttendance({ physically: 0, online: 0, not_sure: 0 });
    setError(null);
    setFieldErrors({});
    setLoading(false);
    checkoutAttempt.current = null;
    resetTurnstile();
  }, [resetTurnstile, goToStep]);

  const switchMode = (group: boolean) => {
    if (group === isGroup) return;
    resetForm();
    setIsGroup(group);
  };

  const clearErr = (key: FieldKey) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const blurValidate = (key: FieldKey) => {
    const message = validate()[key];
    setFieldErrors((prev) => {
      if (message) return prev[key] === message ? prev : { ...prev, [key]: message };
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fp = (key: FieldKey, validateOnBlur = true) => ({
    "aria-invalid": fieldErrors[key] ? true : undefined,
    "aria-describedby": fieldErrors[key] ? `field-${key}-error` : undefined,
    ...(validateOnBlur ? { onBlur: () => blurValidate(key) } : {}),
  });

  const nf = (key: FieldKey) => ({
    invalid: Boolean(fieldErrors[key]),
    describedBy: fieldErrors[key] ? `field-${key}-error` : undefined,
  });

  const focusField = (key: FieldKey) => {
    window.setTimeout(() => {
      const el = document.getElementById(`field-${key}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (key !== "turnstile") el.focus({ preventScroll: true });
    }, 60);
  };


  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch (_) {}
  }, []);

  // Keep the wizard in the browser history so the device/Android back button
  // moves to the previous step instead of leaving the registration flow.
  useEffect(() => {
    writeStepToHistory(1, true);

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const onPopState = (event: PopStateEvent) => {
      const state = event.state as Record<string, unknown> | null;
      const next = state?.[HISTORY_KEY];
      setStep(typeof next === "number" ? Math.min(TOTAL_STEPS, Math.max(1, next)) : 1);
      setError(null);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [writeStepToHistory]);

  // Always open a new step from the top of the form, including hardware back.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetForm();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [resetForm]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/register`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Config unavailable");
        if (cancelled) return;
        setPricesMinor(data.pricesMinor || {});
        setCurrencyAvailable(data.currencyAvailable || {});
        setCustomAmountCutoffAt(data.customAmountCutoffAt || null);
        setRegistrationOpen(Boolean(data.registrationOpen));
        setClosedReason(typeof data.closedReason === "string" ? data.closedReason : null);
        setConfigState("ready");
      })
      .catch((caught) => {
        if (cancelled) return;
        console.error(caught);
        setConfigState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the locked-fee window accurate if the page stays open across Day 2.
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Fall back to a configured currency if the preferred one has no provider.
  useEffect(() => {
    if (configState !== "ready" || currencyAvailable[currency] !== false) return;
    const fallback =
      CURRENCY_LIST.find((code) => currencyAvailable[code] !== false) || "NGN";
    setCurrency(fallback);
    setCustomAmountTouched(false);
    clearErr("customAmount");
  }, [configState, currencyAvailable, currency]);

  // Load states/regions for the selected country. Nigeria is local; every
  // other country comes from the open CountriesNow dataset.
  useEffect(() => {
    const selected = findCountry(country) ?? country;
    if (!selected || selected === NIGERIA) {
      setStateOptions(NIGERIAN_STATES);
      setStatesLoading(false);
      return;
    }

    const cached = stateCache.current[selected];
    if (cached) {
      setStateOptions(cached);
      setStatesLoading(false);
      return;
    }

    let cancelled = false;
    setStatesLoading(true);
    fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: selected }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const names = Array.isArray(data?.data?.states)
          ? data.data.states
              .map((entry: { name?: string }) => String(entry?.name || "").trim())
              .filter(Boolean)
              .sort((a: string, b: string) => a.localeCompare(b))
          : [];
        stateCache.current[selected] = names;
        setStateOptions(names);
      })
      .catch(() => {
        if (!cancelled) setStateOptions([]);
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || step !== TOTAL_STEPS) return;
    let cancelled = false;

    const renderWidget = () => {
      const api = getTurnstile();
      if (!cancelled && api && turnstileRef.current && !turnstileRef.current.hasChildNodes()) {
        api.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            setTurnstileToken(token);
            clearErr("turnstile");
          },
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          theme: "light",
        });
      }
    };

    if (getTurnstile()) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }

    let script = document.getElementById("ihgc-turnstile-script") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "ihgc-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      script.onload = renderWidget;
      renderWidget();
    }

    return () => {
      cancelled = true;
      script!.onload = null;
    };
  }, [step]);


  const effectiveSeats = isGroup ? seatsCount : 1;
  const currencyConfig = CURRENCIES[currency];
  const backendUnitMinor = pricesMinor[currency];
  // Backend prices win; static config prices cover first paint and offline use.
  const standardUnitMinor =
    typeof backendUnitMinor === "number" && backendUnitMinor > 0
      ? backendUnitMinor
      : currencyConfig.standardPriceMinor;
  const standardTotalMinor = standardUnitMinor * effectiveSeats;
  const cutoffMs = customAmountCutoffAt ? Date.parse(customAmountCutoffAt) : null;
  // Before Day 2 closes the standard fee is the floor; afterwards any
  // positive amount is allowed. A missing cutoff keeps the floor in place.
  const standardFeeLocked = cutoffMs === null || now < cutoffMs;
  const minimumMinor = standardFeeLocked ? standardTotalMinor : 1;
  const customMajor = Number(customAmount);
  const customMinor =
    customAmount.trim() !== "" && Number.isFinite(customMajor) && customMajor > 0
      ? Math.round(customMajor * currencyConfig.minorUnitMultiplier)
      : null;
  const totalMinor =
    customMinor !== null && customMinor >= minimumMinor ? customMinor : null;
  const formattedTotal = totalMinor !== null ? formatMoneyMinor(totalMinor, currency) : "—";

  useEffect(() => {
    if (customAmountTouched) return;
    const major = standardTotalMinor / currencyConfig.minorUnitMultiplier;
    setCustomAmount(String(Number.isFinite(major) ? major : ""));
  }, [standardTotalMinor, currencyConfig.minorUnitMultiplier, customAmountTouched]);


  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    const seatsValid = Number.isInteger(parsedSeats) && parsedSeats >= 2 && parsedSeats <= 500;

    if (isGroup) {
      if (!groupName.trim()) errs.groupName = "Enter your chapter or zone name.";
      if (!seatsValid) errs.seats = "Enter a number between 2 and 500.";
      if (
        hasInvitees &&
        (!Number.isInteger(Number(inviteeCount)) ||
          Number(inviteeCount) < 1 ||
          Number(inviteeCount) > seatsCount)
      ) {
        errs.inviteeCount = `Enter a number between 1 and ${seatsCount}.`;
      }
      if (genderCounts.male + genderCounts.female !== seatsCount) {
        errs.genderCounts = `Male and female counts must add up to ${seatsCount} participants (children included).`;
      }
      if (hasChildren && (childCount < 1 || childCount > seatsCount)) {
        errs.childCount = `Enter a child count between 1 and ${seatsCount}.`;
      }
    } else {
      if (gender !== "male" && gender !== "female") errs.gender = "Select Male or Female.";
      if (firstTime !== "yes" && firstTime !== "no") errs.firstTime = "Select Yes or No.";
    }

    if (!payerName.trim()) errs.payerName = "Enter your full name.";
    if (!toE164Phone(payerPhone)) {
      errs.payerPhone = `Enter a valid phone number with country code, e.g. ${selectedDial} 801 234 5678.`;
    }
    if (!EMAIL_RE.test(payerEmail.trim())) {
      errs.payerEmail = "Enter a valid email address, e.g. name@example.com.";
    }
    if (!matchedCountry) errs.country = "Select a country from the list.";
    if (isNigeria && !matchedState) {
      errs.state = "Select a state from the list.";
    } else if (requiresForeignState && !state.trim()) {
      errs.state = "Select the state or region you are coming from.";
    }

    if (!isGroup && isMinor) {
      if (!guardianName.trim()) errs.guardianName = "Enter a parent or guardian name.";
      if (!guardianPhone.trim()) errs.guardianPhone = "Enter a parent or guardian phone number.";
    }

    if (customMinor === null || customMinor < minimumMinor) {
      errs.customAmount = standardFeeLocked
        ? `Enter at least ${formatMoneyMinor(standardTotalMinor, currency)}.`
        : "Enter an amount greater than zero.";
    }

    if (isGroup && seatsValid) {
      const counted = groupAttendance.physically + groupAttendance.online + groupAttendance.not_sure;
      if (counted !== parsedSeats) {
        errs.groupAttendance = `The three counts must add up to ${parsedSeats} participants (currently ${counted}).`;
      }
    }

    if (!consent) errs.consent = "Please accept the terms and consent to continue.";
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      errs.turnstile = "Please complete the verification check.";
    }

    return errs;
  };

  const stepKeys = (current: number): FieldKey[] => {
    if (current === 2) {
      return isGroup
        ? [
            "groupName",
            "seats",
            "country",
            "state",
            "inviteeCount",
            "hasChildren",
            "childCount",
            "genderCounts",
          ]
        : ["gender", "firstTime"];
    }
    if (current === 3) {
      return [
        ...(!isGroup ? (["country", "state"] as FieldKey[]) : []),
        "payerName",
        "payerPhone",
        "payerEmail",
        ...(!isGroup && isMinor ? (["guardianName", "guardianPhone"] as FieldKey[]) : []),
      ];
    }
    if (current === 4) return isGroup ? ["groupAttendance"] : [];
    if (current === 5) return ["customAmount"];
    if (current === TOTAL_STEPS) return ["consent", "turnstile"];
    return [];
  };

  const validateStep = (current: number): boolean => {
    const all = validate();
    const keys = stepKeys(current);
    const nextErrors: FieldErrors = {};
    keys.forEach((key) => {
      if (all[key]) nextErrors[key] = all[key];
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        if (nextErrors[key]) next[key] = nextErrors[key];
        else delete next[key];
      });
      return next;
    });

    if (keys.some((key) => nextErrors[key])) return false;
    if (current === 5 && totalMinor === null) {
      setError("Pricing is still loading. Please wait a moment and try again.");
      return false;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    goToStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    if (step > 1) {
      window.history.back();
      return;
    }
    goToStep(1, true);
  };

  const jumpToStep = (target: number) => {
    setError(null);
    goToStep(target);
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError(null);

    const errs = validate();
    setFieldErrors(errs);
    const firstInvalid = FIELD_ORDER.find((key) => errs[key]);
    if (firstInvalid) {
      goToStep(fieldStep(firstInvalid));
      focusField(firstInvalid);
      return;
    }

    const payerPhoneE164 = toE164Phone(payerPhone);
    if (!payerPhoneE164) return;

    setLoading(true);

    try {
      const minor = !isGroup && isMinor;

      const checkoutPayload = {
        currency,
        isGroup,
        payer: {
          name: payerName.trim(),
          phoneE164: payerPhoneE164,
          phone: payerPhone.trim(),
          email: payerEmail.trim().toLowerCase(),
        },
        country: matchedCountry || country.trim(),
        state: state.trim() || undefined,
        attendanceMode,
        gender: isGroup ? undefined : gender,
        firstTime: isGroup ? undefined : firstTime === "yes",
        isMinor: minor,
        guardianName: minor ? guardianName.trim() : undefined,
        guardianPhone: minor ? guardianPhone.trim() : undefined,
        group: isGroup ? { name: groupName.trim(), totalSeats: seatsCount } : undefined,
        inviteeCount: isGroup && hasInvitees ? Number(inviteeCount) : isGroup ? 0 : undefined,
        genderCounts: isGroup ? genderCounts : undefined,
        hasChildren: isGroup ? hasChildren : undefined,
        childCount: isGroup && hasChildren ? childCount : undefined,
        turnstileToken: turnstileToken || undefined,
        consent,
        customAmountMinor: customMinor ?? undefined,
        groupAttendance: isGroup ? groupAttendance : undefined,
      };

      const { turnstileToken: _token, ...fingerprintSource } = checkoutPayload;
      const fingerprint = JSON.stringify(fingerprintSource);
      if (!checkoutAttempt.current || checkoutAttempt.current.payload !== fingerprint) {
        checkoutAttempt.current = { payload: fingerprint, key: makeIdempotencyKey() };
      }

      const response = await fetch(`${API_BASE}/api/checkout/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": checkoutAttempt.current.key,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 410) checkoutAttempt.current = null;
        throw new Error(data.error || "Failed to initialize registration session.");
      }

      checkoutAttempt.current = null;

      if (data.reference && data.checkoutToken) {
        try {
          localStorage.setItem(`ihgc_checkout_${data.reference}`, data.checkoutToken);
          localStorage.setItem(
            "ihgc_last_checkout",
            JSON.stringify({ reference: data.reference, phone: payerPhoneE164 })
          );
        } catch (_) {}
      }

      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else router.push(`/payment/status?ref=${data.reference}`);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : "An unexpected error occurred. Please try again."
      );
      setLoading(false);
      resetTurnstile();
    }
  };

  const submitDisabled =
    loading ||
    configState !== "ready" ||
    !registrationOpen ||
    totalMinor === null ||
    (isGroup && (!Number.isInteger(parsedSeats) || parsedSeats < 2 || parsedSeats > 500));

  const handleCountryChange = (next: string) => {
    setCountry(next);
    setPayerPhone((prev) => phoneWithCountryDial(prev, countryDialCode(next)));
    clearErr("country");
    clearErr("state");
    clearErr("payerPhone");
    setState("");

    // Prefer the participant's local currency where Flutterwave supports it.
    const localCurrency = currencyForCountry(next);
    if (localCurrency && currencyAvailable[localCurrency] !== false) {
      setCurrency(localCurrency);
      setCustomAmountTouched(false);
      clearErr("customAmount");
    }
  };

  const locationFields = (
    <>
      <Field
        htmlFor="field-country"
        label={isGroup ? "Group country" : "Country of residence"}
        error={fieldErrors.country}
        hint={isGroup ? "Applied to every participant in this group." : undefined}
      >
        <SearchableSelect
          id="field-country"
          value={country}
          options={COUNTRIES}
          placeholder="Search countries..."
          emptyMessage="No countries match your search"
          inputProps={fp("country", false)}
          onTyping={() => {
            clearErr("country");
            clearErr("state");
          }}
          onChange={handleCountryChange}
          renderLeading={() => <FlagImage iso2={countryIso2(country)} label={country} />}
          renderOption={(option) => (
            <>
              <FlagImage iso2={countryIso2(option)} label={option} />
              <span className="min-w-0 truncate">{option}</span>
              <span aria-hidden className="currency-symbol ml-auto text-[12px] opacity-60">
                {countryCurrencyBadge(option)}
              </span>
            </>
          )}
        />
      </Field>

      <Field
        htmlFor="field-state"
        label={
          isNigeria
            ? isGroup
              ? "Group state"
              : "State of residence"
            : requiresForeignState
              ? "State / region you're coming from"
              : "State / region (optional)"
        }
        error={fieldErrors.state}
        hint={
          statesLoading
            ? "Loading states and regions..."
            : isNigeria
              ? undefined
              : requiresForeignState
                ? "Required because you're a first-time attendee."
                : "Optional for returning attendees. Type your state or region if it is not listed."
        }
      >
        <SearchableSelect
          id="field-state"
          value={state}
          options={stateOptions}
          placeholder={
            statesLoading
              ? "Loading states and regions..."
              : isNigeria
                ? "Search Nigerian states..."
                : `Search states in ${selectedCountry || "your country"}...`
          }
          emptyMessage="No matches — type your state or region"
          inputProps={fp("state", false)}
          onTyping={() => clearErr("state")}
          onChange={(next) => {
            setState(next);
            clearErr("state");
          }}
          renderLeading={() => <Search className="h-4 w-4" />}
        />
      </Field>
    </>
  );

  const phoneValid = Boolean(toE164Phone(payerPhone));
  const emailValid = EMAIL_RE.test(payerEmail.trim());
  const standardChips: { label: string; minor: number; major: number }[] =
    standardFeeLocked && standardTotalMinor > 0
      ? [
          {
            label: "Standard",
            minor: standardTotalMinor,
            major: standardTotalMinor / currencyConfig.minorUnitMultiplier,
          },
        ]
      : [];

  const categorySummary = isGroup
    ? `Group participants · ${groupName.trim() || "Chapter"} · ${seatsCount} participants`
    : `Individual participant · ${gender === "male" ? "Male" : "Female"} · ${
        firstTime === "yes" ? "First-time" : "Returning"
      } attendee`;
  const attendeeSummary = isGroup
    ? `${groupName.trim() || "Chapter"} · ${seatsCount} participants`
    : `${gender === "male" ? "Male" : "Female"} · ${
        firstTime === "yes" ? "First-time" : "Returning"
      }`;
  const contactSummary = payerName.trim()
    ? `${payerName.trim()} · ${payerEmail.trim() || selectedDial}`
    : "";
  const attendanceSummary = isGroup
    ? `Group attendance · ${groupAttendanceTotal}/${seatsCount} assigned`
    : attendanceMode === "physically"
      ? "Physically · Kwali Campground"
      : attendanceMode === "online"
        ? "Online · Livestream"
        : "Not sure yet";

  const attendeeHistory: CompletedItem = {
    label: isGroup ? "Group" : "Attendee",
    value: attendeeSummary,
    onEdit: () => jumpToStep(2),
  };
  const contactHistory: CompletedItem | null = payerName.trim()
    ? {
        label: "Contact",
        value: contactSummary,
        onEdit: () => jumpToStep(3),
      }
    : null;
  const attendanceHistory: CompletedItem = {
    label: "Attendance",
    value: attendanceSummary,
    onEdit: () => jumpToStep(4),
  };

  const footerButtons = (back = true, nextLabel = "Continue") => (
    <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-5">
      {back ? (
        <button
          type="button"
          onClick={prevStep}
          className="py-2.5 pl-1 pr-2 text-[13px] font-semibold text-[#0E1020] transition hover:text-[#0E1020]"
        >
          Back
        </button>
      ) : (
        <Link
          href="/"
          className="py-2.5 pl-1 pr-2 text-[13px] font-semibold text-[#0E1020] transition hover:text-[#0E1020]"
        >
          Back to Home
        </Link>
      )}
      <button
        type="button"
        onClick={nextStep}
        className="register-primary h-[44px] rounded-[10px] border px-5 text-[14px] font-semibold transition-colors"
      >
        {nextLabel}
      </button>
    </div>
  );

  return (
    <RegistrationLayout
      step={step}
      hintBelowCard={
        step === TOTAL_STEPS
          ? "Secure checkout · Registration fees are non-refundable"
          : undefined
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {step === 1 && (
          <>
            <StepHeading
              step={1}
              title="Registration category"
              description="Select how you will be attending IHGC 2026."
            />

            <div className="grid gap-3.5 pt-2 sm:grid-cols-2">
              {[
                {
                  group: false,
                  title: "Individual participant",
                  desc: "Register yourself as an individual participant.",
                  icon: UserRound,
                },
                {
                  group: true,
                  title: "Group participants",
                  desc: "Register your chapter, unit, zone and others as a group.",
                  icon: UsersRound,
                },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() => switchMode(option.group)}
                    className={`rounded-[12px] border p-5 text-left transition-all ${
                      isGroup === option.group
                        ? "border-[#0E1020] bg-[#EEF1F6]/70 ring-2 ring-[#0E1020]/10"
                        : "border-[#D1D5DB] bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          isGroup === option.group ? "text-[#0E1020]" : "text-[#0E7A6E]"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="text-[16px] font-semibold text-[#0E1020]">{option.title}</div>
                    </div>
                    <div className="mt-1 text-[13px] text-[#6B7280]">{option.desc}</div>
                  </button>
                );
              })}
            </div>

            {footerButtons(false)}
          </>
        )}

        {step === 2 && (
          <>
            <StepHeading
              step={2}
              title={isGroup ? "Group details" : "About you"}
              description={
                isGroup
                  ? "Tell us about your chapter or zone and the people attending."
                  : "Tell us your gender and whether you’re an invitee/first-timer or a returning participant."
              }
            />

            <CompletedDetails
              items={[
                {
                  label: "Category",
                  value: categorySummary,
                  onEdit: () => jumpToStep(1),
                },
              ]}
            />

            {isGroup ? (
              <div className="space-y-5 pt-2">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field htmlFor="field-groupName" label="Chapter / zone name" error={fieldErrors.groupName}>
                    <input
                      id="field-groupName"
                      type="text"
                      placeholder="e.g. Horemow Lagos Central"
                      value={groupName}
                      onChange={(event) => {
                        setGroupName(event.target.value);
                        clearErr("groupName");
                      }}
                      {...fp("groupName")}
                      className="h-[60px] w-full rounded-[12px] border border-[#D1D5DB] px-4 text-[16px] text-[#0E1020] outline-none transition placeholder:text-gray-400 focus:border-[#0E1020] focus:ring-2 focus:ring-[#0E1020]/20"
                    />
                  </Field>

                  <Field
                    htmlFor="field-seats"
                    label="Number of participants"
                    error={fieldErrors.seats}
                    hint="Everyone attending, children included."
                  >
                    <NumberField
                      {...nf("seats")}
                      id="field-seats"
                      label="participants"
                      value={seatsInput}
                      min={2}
                      max={500}
                      onChange={(next) => {
                        setSeatsInput(next);
                        clearErr("seats");
                        clearErr("groupAttendance");
                        clearErr("genderCounts");
                        if (!hasInvitees) clearErr("inviteeCount");
                      }}
                      onBlur={() => {
                        const parsed = Number.parseInt(seatsInput, 10);
                        const clamped = Math.min(500, Math.max(0, Number.isFinite(parsed) ? parsed : 0));
                        setSeatsInput(String(clamped));
                        if (clamped >= 2) clearErr("seats");
                        else
                          setFieldErrors((prev) => ({
                            ...prev,
                            seats: "Enter a number between 2 and 500.",
                          }));
                      }}
                    />
                  </Field>

                  {locationFields}
                </div>

                <div className="space-y-3">
                  <ToggleRow
                    id="field-hasInvitees"
                    checked={hasInvitees}
                    onChange={(next) => {
                      setHasInvitees(next);
                      setInviteeCount(next ? "1" : "0");
                      clearErr("inviteeCount");
                    }}
                    label="Do you have new comers / invitees registering with you?"
                    description={
                      hasInvitees
                        ? `${inviteeNumber} first-time · ${returningCount} returning attendant${
                            returningCount === 1 ? "" : "s"
                          }`
                        : `All ${seatsCount} participants will be recorded as returning attendants.`
                    }
                  />
                  {hasInvitees && (
                    <Field
                      htmlFor="field-inviteeCount"
                      label="Number of new comers / invitees"
                      error={fieldErrors.inviteeCount}
                      hint="These participants are recorded as first-time attendees."
                    >
                      <NumberField
                        {...nf("inviteeCount")}
                        id="field-inviteeCount"
                        label="invitees"
                        value={inviteeCount}
                        min={1}
                        max={seatsCount}
                        onChange={(next) => {
                          setInviteeCount(next);
                          clearErr("inviteeCount");
                        }}
                      />
                    </Field>
                  )}
                </div>

                <div className="space-y-3">
                  <ToggleRow
                    id="field-hasChildren"
                    checked={hasChildren}
                    onChange={(next) => {
                      setHasChildren(next);
                      setChildCount(next ? 1 : 0);
                      clearErr("hasChildren");
                      clearErr("childCount");
                    }}
                    label="Are you registering any children?"
                    description="Children are included in the participant count."
                  />
                  {hasChildren && (
                    <Field
                      htmlFor="field-childCount"
                      label="Number of children"
                      error={fieldErrors.childCount}
                    >
                      <NumberField
                        {...nf("childCount")}
                        id="field-childCount"
                        label="children"
                        value={childCount}
                        min={1}
                        max={seatsCount}
                        onChange={(next) => {
                          setChildCount(Math.max(0, Math.min(seatsCount, toInt(next))));
                          clearErr("childCount");
                        }}
                      />
                    </Field>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field htmlFor="field-genderCounts" label="Number of males" hint="Include boys in this count.">
                      <NumberField
                        id="field-genderCounts"
                        label="males"
                        value={genderCounts.male}
                        min={0}
                        max={seatsCount}
                        invalid={Boolean(fieldErrors.genderCounts)}
                        describedBy={fieldErrors.genderCounts ? "field-genderCounts-error" : undefined}
                        onChange={(next) => {
                          const value = Math.max(0, Math.min(seatsCount, toInt(next)));
                          setGenderCounts((prev) => ({ ...prev, male: value }));
                          clearErr("genderCounts");
                        }}
                      />
                    </Field>
                    <Field
                      htmlFor="field-genderCounts-female"
                      label="Number of females"
                      hint="Include girls in this count."
                    >
                      <NumberField
                        id="field-genderCounts-female"
                        label="females"
                        value={genderCounts.female}
                        min={0}
                        max={seatsCount}
                        invalid={Boolean(fieldErrors.genderCounts)}
                        describedBy={fieldErrors.genderCounts ? "field-genderCounts-error" : undefined}
                        onChange={(next) => {
                          const value = Math.max(0, Math.min(seatsCount, toInt(next)));
                          setGenderCounts((prev) => ({ ...prev, female: value }));
                          clearErr("genderCounts");
                        }}
                      />
                    </Field>
                  </div>
                  <Tally
                    id="field-genderCounts-error"
                    current={genderCounts.male + genderCounts.female}
                    total={seatsCount}
                    unit="participants"
                    error={fieldErrors.genderCounts}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 pt-2 sm:grid-cols-2">
                <Field htmlFor="field-gender" label="Gender" error={fieldErrors.gender}>
                  <div id="field-gender" role="group" aria-label="Gender" className="flex flex-wrap gap-2">
                    {(["male", "female"] as const).map((value) => (
                      <ChoiceButton
                        key={value}
                        active={gender === value}
                        onClick={() => {
                          setGender(value);
                          clearErr("gender");
                        }}
                      >
                        {value === "male" ? "Male" : "Female"}
                      </ChoiceButton>
                    ))}
                  </div>
                </Field>

                <Field htmlFor="field-firstTime" label="Attendance history" error={fieldErrors.firstTime}>
                  <div id="field-firstTime" role="group" aria-label="First timer or invitee" className="flex flex-wrap gap-2">
                    {(["no", "yes"] as const).map((value) => (
                      <ChoiceButton
                        key={value}
                        active={firstTime === value}
                        onClick={() => {
                          setFirstTime(value);
                          clearErr("firstTime");
                        }}
                        icon={value === "yes" ? UserPlus : UserCheck}
                      >
                        {value === "yes" ? "First-time" : "Returning"}
                      </ChoiceButton>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {footerButtons()}
          </>
        )}

        {step === 3 && (
          <>
            <StepHeading
              step={3}
              title={isGroup ? "Group leader details" : "Your contact details"}
              description={
                isGroup
                  ? "The person registering and paying for the group."
                  : "Your digital pass and check-in barcode will be sent here."
              }
            />

            <CompletedDetails items={[attendeeHistory]} />

            <div className="grid gap-5 pt-2 sm:grid-cols-2">
              {!isGroup && locationFields}

              <div className="sm:col-span-2">
                <Field htmlFor="field-payerName" label="Full name" error={fieldErrors.payerName}>
                  <div className="relative">
                    <input
                      id="field-payerName"
                      type="text"
                      autoComplete="name"
                      placeholder="Full Name"
                      value={payerName}
                      onChange={(event) => {
                        setPayerName(event.target.value);
                        clearErr("payerName");
                      }}
                      {...fp("payerName")}
                      className="h-[60px] w-full rounded-[12px] border border-[#D1D5DB] px-4 pr-11 text-[16px] text-[#0E1020] outline-none transition placeholder:text-gray-400 focus:border-[#0E1020] focus:ring-2 focus:ring-[#0E1020]/20"
                    />
                    {payerName.trim() && !fieldErrors.payerName && (
                      <Check className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E7A6E]" />
                    )}
                  </div>
                </Field>
              </div>

              <Field
                htmlFor="field-payerPhone"
                label="Phone number"
                error={fieldErrors.payerPhone}
                hint={
                  <span className="inline-flex items-center gap-1.5">
                    <FlagImage iso2={countryIso2(selectedCountry)} label={selectedCountry} />
                    <span>{selectedDial} for {selectedCountry || "your selected country"}</span>
                  </span>
                }
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden>
                    <FlagImage iso2={countryIso2(selectedCountry)} label={selectedCountry} />
                  </span>
                  <input
                    id="field-payerPhone"
                    type="tel"
                    autoComplete="tel"
                    placeholder={`${selectedDial} 801 234 5678`}
                    value={payerPhone}
                    onChange={(event) => {
                      setPayerPhone(event.target.value);
                      clearErr("payerPhone");
                    }}
                    {...fp("payerPhone")}
                    className="h-[60px] w-full rounded-[12px] border border-[#D1D5DB] pl-12 pr-11 text-[16px] text-[#0E1020] outline-none transition placeholder:text-gray-400 focus:border-[#0E1020] focus:ring-2 focus:ring-[#0E1020]/20"
                  />
                  {phoneValid && !fieldErrors.payerPhone && (
                    <Check className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E7A6E]" />
                  )}
                </div>
              </Field>

              <Field htmlFor="field-payerEmail" label="Email address" error={fieldErrors.payerEmail}>
                <div className="relative">
                  <input
                    id="field-payerEmail"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    placeholder="name@example.com"
                    value={payerEmail}
                    onChange={(event) => {
                      setPayerEmail(event.target.value);
                      clearErr("payerEmail");
                    }}
                    {...fp("payerEmail")}
                    className="h-[60px] w-full rounded-[12px] border border-[#D1D5DB] px-4 pr-11 text-[16px] text-[#0E1020] outline-none transition placeholder:text-gray-400 focus:border-[#0E1020] focus:ring-2 focus:ring-[#0E1020]/20"
                  />
                  {emailValid && !fieldErrors.payerEmail && (
                    <Check className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E7A6E]" />
                  )}
                </div>
              </Field>
            </div>

            {!isGroup && (
              <div className="space-y-4">
                <ToggleRow
                  id="field-isMinor"
                  checked={isMinor}
                  onChange={(next) => {
                    setIsMinor(next);
                    clearErr("guardianName");
                    clearErr("guardianPhone");
                  }}
                  label="Participant is under 18 years of age"
                  description="A parent or guardian's details are needed."
                />
                {isMinor && (
                  <div className="grid gap-5 rounded-[12px] border border-[#D1E5DE] bg-[#EEF4F1]/70 p-5 sm:grid-cols-2">
                    <Field htmlFor="field-guardianName" label="Parent / guardian name" error={fieldErrors.guardianName}>
                      <input
                        id="field-guardianName"
                        type="text"
                        placeholder="Parent / Guardian Name"
                        value={guardianName}
                        onChange={(event) => {
                          setGuardianName(event.target.value);
                          clearErr("guardianName");
                        }}
                        {...fp("guardianName")}
                        className="h-[60px] w-full rounded-[12px] border border-[#D1D5DB] bg-white px-4 text-[16px] text-[#0E1020] outline-none transition placeholder:text-gray-400 focus:border-[#0E1020] focus:ring-2 focus:ring-[#0E1020]/20"
                      />
                    </Field>
                    <Field htmlFor="field-guardianPhone" label="Parent / guardian phone" error={fieldErrors.guardianPhone}>
                      <input
                        id="field-guardianPhone"
                        type="tel"
                        placeholder="Parent / Guardian Phone"
                        value={guardianPhone}
                        onChange={(event) => {
                          setGuardianPhone(event.target.value);
                          clearErr("guardianPhone");
                        }}
                        {...fp("guardianPhone")}
                        className="h-[60px] w-full rounded-[12px] border border-[#D1D5DB] bg-white px-4 text-[16px] text-[#0E1020] outline-none transition placeholder:text-gray-400 focus:border-[#0E1020] focus:ring-2 focus:ring-[#0E1020]/20"
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {footerButtons()}
          </>
        )}

        {step === 4 && (
          <>
            <StepHeading
              step={4}
              title={isGroup ? "How will the group attend?" : "How will you attend?"}
              description={
                isGroup
                  ? seatsCount > 0
                    ? `Enter a count for each mode. The counts must add up to all ${seatsCount} participants.`
                    : "Set the number of participants in step 2 first."
                  : "Select your attendance mode."
              }
            />

            <CompletedDetails
              items={contactHistory ? [attendeeHistory, contactHistory] : [attendeeHistory]}
            />

            {isGroup ? (
              <div className="space-y-4 pt-2">
                <div className="grid gap-5 sm:grid-cols-3">
                  {ATTENDANCE_OPTIONS.map(([key, label]) => {
                    const id = `field-attendance-${key}`;
                    return (
                      <Field key={key} htmlFor={id} label={label}>
                        <NumberField
                          id={id}
                          label={label.toLowerCase()}
                          value={groupAttendance[key]}
                          min={0}
                          max={seatsCount}
                          invalid={Boolean(fieldErrors.groupAttendance)}
                          describedBy={fieldErrors.groupAttendance ? "field-groupAttendance-error" : undefined}
                          onChange={(next) => {
                            setGroupAttendance({
                              ...groupAttendance,
                              [key]: Math.max(0, Math.min(seatsCount, toInt(next))),
                            });
                            clearErr("groupAttendance");
                          }}
                        />
                      </Field>
                    );
                  })}
                </div>
                <Tally
                  id="field-groupAttendance-error"
                  current={groupAttendanceTotal}
                  total={seatsCount}
                  unit="participants"
                  error={fieldErrors.groupAttendance}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {ATTENDANCE_OPTIONS.map(([value, label]) => (
                  <ChoiceButton
                    key={value}
                    active={attendanceMode === value}
                    onClick={() => setAttendanceMode(value)}
                    icon={ATTENDANCE_ICONS[value]}
                  >
                    {label}
                  </ChoiceButton>
                ))}
              </div>
            )}

            {footerButtons()}
          </>
        )}

        {step === 5 && (
          <>
            <StepHeading
              step={5}
              title="Payment"
              description="Choose the currency you want to pay in. Standard prices are per participant."
            />

            <CompletedDetails
              items={[
                attendeeHistory,
                ...(contactHistory ? [contactHistory] : []),
                attendanceHistory,
              ]}
            />

            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <label htmlFor="field-currency" className="block text-[14px] font-medium text-[#0E1020]">
                  Currency
                </label>
                <CurrencyPicker
                  value={currency}
                  pricesMinor={pricesMinor}
                  currencyAvailable={currencyAvailable}
                  disabled={configState !== "ready"}
                  onSelect={(code) => {
                    setCurrency(code);
                    setCustomAmountTouched(false);
                    clearErr("customAmount");
                  }}
                />
                <p className="text-[11px] leading-relaxed text-[#6B7280]">
                  Choose the currency you want to be charged in. Prices shown are per participant.
                </p>
              </div>

              <Field
                htmlFor="field-customAmount"
                label="Registration amount"
                error={fieldErrors.customAmount}
                hint={
                  standardFeeLocked
                    ? `Minimum is ${formatMoneyMinor(standardTotalMinor, currency)} until Day 2 ends.`
                    : "Any amount above zero is now allowed."
                }
              >
                <div className="flex h-[60px] w-full overflow-hidden rounded-[12px] border border-[#D1D5DB] transition focus-within:border-[#0E1020] focus-within:ring-2 focus-within:ring-[#0E1020]/20">
                  <span className="currency-symbol flex w-[54px] shrink-0 items-center justify-center border-r border-[#E5E7EB] bg-[#F5FBFA] text-[18px] font-bold text-[#0E1020]">
                    {currencyConfig.symbol}
                  </span>
                  <input
                    id="field-customAmount"
                    type="number"
                    inputMode="numeric"
                    step={currencyConfig.minorUnitMultiplier === 1 ? "1" : "0.01"}
                    min={minimumMinor / currencyConfig.minorUnitMultiplier}
                    value={customAmount}
                    onChange={(event) => {
                      setCustomAmount(event.target.value);
                      setCustomAmountTouched(true);
                      clearErr("customAmount");
                    }}
                    {...fp("customAmount")}
                    className="min-w-0 flex-1 bg-white px-4 text-[18px] font-bold text-[#0E1020] outline-none sm:text-[20px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </Field>

              {standardChips.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {standardChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setCustomAmount(String(chip.major));
                        setCustomAmountTouched(false);
                        clearErr("customAmount");
                      }}
                      className={`h-[46px] rounded-[12px] border px-5 text-[14px] font-bold transition-all ${
                        customMinor === chip.minor
                          ? "border-[#0E1020] bg-[#0E1020] text-white"
                          : "border-[#D1D5DB] bg-white text-[#4B5563] hover:border-[#0E1020]"
                      }`}
                    >
                      {chip.label} <span className="currency-symbol">{formatMoneyMinor(chip.minor, currency)}</span>
                    </button>
                  ))}
                </div>
              )}

              {(configState === "error" || (configState === "ready" && !registrationOpen)) && (
                <div
                  role={configState === "error" ? "alert" : "status"}
                  className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {configState === "error"
                      ? "Registration pricing could not be loaded. Refresh the page to try again."
                      : closedReason || "Online registration is closed."}
                  </span>
                </div>
              )}
            </div>

            {footerButtons()}
          </>
        )}

        {step === TOTAL_STEPS && (
          <>
            <StepHeading
              step={6}
              title="Review and confirm"
              description="Check your details before the secure checkout."
            />

            <div className="divide-y divide-[#E5E7EB] pt-2">
              <SummaryRow label="Category">
                {isGroup ? "Group participants" : "Individual participant"}
              </SummaryRow>
              {isGroup && groupName.trim() && (
                <SummaryRow label="Chapter / zone">{groupName.trim()}</SummaryRow>
              )}
              <SummaryRow label="Participants">{effectiveSeats}</SummaryRow>
              <SummaryRow label="Standard price per participant">
                <span className="currency-symbol">{formatMoneyMinor(standardUnitMinor, currency)}</span>
              </SummaryRow>
              {!isGroup && (
                <>
                  <SummaryRow label="Title">
                    {gender === "male" ? "Male" : "Female"}
                  </SummaryRow>
                  <SummaryRow label="Attendance history">
                    {firstTime === "yes" ? "First-time" : "Returning"}
                  </SummaryRow>
                </>
              )}
              <SummaryRow label="Attendance">
                {attendanceSummary.split(" · ").map((part, index) => (
                  <span key={`${part}-${index}`}>
                    {index > 0 && (
                      <>
                        <span className="hidden sm:inline"> · </span>
                        <br className="sm:hidden" />
                      </>
                    )}
                    {part}
                  </span>
                ))}
              </SummaryRow>
              <SummaryRow label="Location">
                {country}
                {state ? `, ${state}` : ""}
              </SummaryRow>
              {payerEmail.trim() && (
                <SummaryRow label="Email">{payerEmail.trim()}</SummaryRow>
              )}
              {!isGroup && isMinor && guardianName.trim() && (
                <SummaryRow label="Guardian">
                  {guardianName.trim()}
                  {guardianPhone.trim() ? ` (${guardianPhone.trim()})` : ""}
                </SummaryRow>
              )}
            </div>

            <div className="flex items-baseline justify-between border-t border-[#E5E7EB] pb-2 pt-4">
              <div>
                <div className="text-[15px] font-semibold text-[#0E1020]">Total payable</div>
                <div className="mt-0.5 text-[12px] text-[#6B7280]">
                  Includes all event materials and pass
                </div>
              </div>
              <div className="register-total text-[26px] font-bold text-[#0E1020] sm:text-[30px]">
                <span className="currency-symbol">{formattedTotal}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex cursor-pointer select-none items-start gap-3">
                <input
                  id="field-consent"
                  type="checkbox"
                  checked={consent}
                  aria-invalid={fieldErrors.consent ? true : undefined}
                  aria-describedby={fieldErrors.consent ? "field-consent-error" : undefined}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    clearErr("consent");
                  }}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 accent-[#0E1020] focus:ring-[#0E1020]"
                />
                <span className="text-[13px] leading-relaxed text-[#6B7280] sm:text-[14px]">
                  I understand that registration fees are non-refundable. I consent to personal data processing
                  under the <Link href="/privacy" className="font-medium text-[#0E7A6E] underline">Privacy Policy</Link>{" "}
                  and <Link href="/terms" className="font-medium text-[#0E7A6E] underline">Terms</Link>.
                </span>
              </label>
              {fieldErrors.consent && (
                <p id="field-consent-error" role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.consent}</span>
                </p>
              )}

              {TURNSTILE_SITE_KEY && (
                <div className="space-y-2">
                  <div
                    id="field-turnstile"
                    ref={turnstileRef}
                    className={`max-w-full overflow-hidden rounded-[10px] ${fieldErrors.turnstile ? "ring-2 ring-rose-400" : ""}`}
                    style={{ minHeight: 65 }}
                  />
                  {fieldErrors.turnstile && (
                    <p role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.turnstile}</span>
                    </p>
                  )}
                </div>
              )}

              {errorCount > 0 && (
                <div role="alert" className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {errorCount === 1 ? "1 field needs" : `${errorCount} fields need`} your attention.{" "}
                    {firstInvalidField() && (
                      <button
                        type="button"
                        onClick={() => {
                          const key = firstInvalidField()!;
                          goToStep(fieldStep(key));
                          focusField(key);
                        }}
                        className="font-semibold underline"
                      >
                        Go to the first one
                      </button>
                    )}
                  </span>
                </div>
              )}

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {(configState === "error" || (configState === "ready" && !registrationOpen)) && (
                <div
                  role={configState === "error" ? "alert" : "status"}
                  className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {configState === "error"
                      ? "Registration pricing could not be loaded. Refresh the page to try again."
                      : closedReason || "Online registration is closed."}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-5">
              <button
                type="button"
                onClick={prevStep}
                className="py-2.5 pl-1 pr-2 text-[13px] font-semibold text-[#0E1020] transition hover:text-[#0E1020]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitDisabled}
                className="register-primary inline-flex h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border px-5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {loading
                  ? "Initializing secure checkout..."
                  : configState === "ready" && !registrationOpen
                    ? "Registration closed"
                    : totalMinor === null
                      ? "Loading price..."
                      : <>Pay <span className="currency-symbol">{formattedTotal}</span> securely</>}
              </button>
            </div>
          </>
        )}
      </form>
    </RegistrationLayout>
  );
}

function firstInvalidField() {
  return FIELD_ORDER.find((key) => {
    const el = document.getElementById(`field-${key}`);
    return el?.getAttribute("aria-invalid") === "true";
  });
}
