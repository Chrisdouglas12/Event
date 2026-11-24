"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { SITE_CONFIG } from "@/config/site";
import { CURRENCIES, formatMoneyMinor, SupportedCurrency } from "@/config/currencies";
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
  countryFlag,
  phoneWithCountryDial,
} from "@/config/country-meta";
import { Countdown } from "@/components/ui/countdown";
import {
  User,
  Users,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Search,
  Minus,
  Plus,
  HelpCircle,
  ArrowRight,
  Info,
} from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const CURRENCY_LIST: SupportedCurrency[] = ["NGN", "USD", "EUR", "GBP"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INITIAL_PHONE = "+234 ";
const MIN_NGN_PER_PASS_MINOR = 200_000;
const LEGACY_DRAFT_KEY = "ihgc_draft_registration";
const TOTAL_STEPS = 6;

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (target?: string | HTMLElement) => void;
};
const getTurnstile = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

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
  | "customNairaAmount"
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
  "customNairaAmount",
  "consent",
  "turnstile",
];

const ATTENDANCE_OPTIONS = [
  ["physically", "Attend In-Person at Kwali Camp"],
  ["online", "Attend Online via Live Stream"],
  ["not_sure", "Not Decided Yet"],
] as const;

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

const normaliseSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toInt = (value: string) => Number.parseInt(value, 10) || 0;

/* ---------- Reusable Form UI Components with Uniform Spacings ---------- */

function FormField({
  htmlFor,
  label,
  error,
  hint,
  required = true,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-sm font-bold text-slate-800 tracking-tight"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      </div>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500 leading-normal">{hint}</p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 mt-0.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function SectionStepHeader({
  n,
  done,
  title,
  subtitle,
}: {
  n: number;
  done: boolean;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
          done
            ? "bg-[#0E7A6E] text-white shadow-sm"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}
        aria-hidden
      >
        {done ? <CheckCircle2 className="w-5 h-5 text-white" /> : n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {title}
            {done && <span className="sr-only"> (complete)</span>}
          </h3>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              done
                ? "bg-teal-50 text-[#0E7A6E] border border-teal-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {done ? "Complete" : `Step ${n} of ${TOTAL_STEPS}`}
          </span>
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function StepperField({
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
      className={`flex items-center h-[52px] rounded-xl border bg-white overflow-hidden transition-all ${
        invalid
          ? "border-rose-400 bg-rose-50/30 ring-2 ring-rose-100"
          : "border-slate-300 hover:border-slate-400 focus-within:border-[#0E7A6E] focus-within:ring-4 focus-within:ring-[#0E7A6E]/12"
      }`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${label}`}
        disabled={!canDecrease}
        onClick={() => onChange(String(Math.max(min, current - 1)))}
        className="w-14 h-full flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors border-r border-slate-200"
      >
        <Minus className="w-4 h-4" />
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
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full h-full text-center font-bold text-slate-900 text-base focus:outline-none bg-transparent"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${label}`}
        disabled={!canIncrease}
        onClick={() =>
          onChange(
            String(
              Math.min(
                max ?? Number.MAX_SAFE_INTEGER,
                Math.max(min, current + 1)
              )
            )
          )
        }
        className="w-14 h-full flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors border-l border-slate-200"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function SearchSelect({
  id,
  value,
  options,
  onChange,
  onTyping,
  placeholder,
  disabled = false,
  emptyMessage = "No matches found",
  invalid = false,
  describedBy,
  renderLeading,
  renderOption,
}: {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  onTyping?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  invalid?: boolean;
  describedBy?: string;
  renderLeading?: (value: string) => React.ReactNode;
  renderOption?: (option: string) => React.ReactNode;
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

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, []);

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

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          resetToValue();
        }
      }}
    >
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 z-10 flex items-center">
        {renderLeading ? (
          renderLeading(value)
        ) : (
          <Search className="w-4 h-4 text-slate-400" />
        )}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
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
          setActiveIndex(0);
        }}
        className={`w-full h-[52px] pl-11 pr-11 rounded-xl border bg-white text-slate-900 text-[15px] font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
          invalid
            ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-100"
            : "border-slate-300 hover:border-slate-400 focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
        } ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((was) => !was);
          inputRef.current?.focus();
        }}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? "rotate-180 text-[#0E7A6E]" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          className="absolute z-50 left-0 right-0 top-[calc(100%+6px)] max-h-64 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10"
        >
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 font-medium">
              {emptyMessage}
            </div>
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                  option === value
                    ? "bg-[#EAF9F7] text-[#0E7A6E] font-bold"
                    : index === activeIndex
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {renderOption ? renderOption(option) : option}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SwitchCard({
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
      className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
        checked
          ? "bg-[#0E1B2D] border-[#0E1B2D] text-white shadow-md shadow-slate-900/10"
          : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm sm:text-base leading-snug">
          {label}
        </div>
        {description && (
          <div
            className={`text-xs sm:text-sm mt-1 leading-relaxed ${
              checked ? "text-gray-300" : "text-slate-500"
            }`}
          >
            {description}
          </div>
        )}
      </div>
      <div
        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
          checked ? "bg-[#8EE3D6]" : "bg-slate-300"
        }`}
        aria-hidden
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

function ProgressTally({
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
  const pct =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const matched = total > 0 && current === total;

  let text: string;
  if (total <= 0) text = "Enter the number of participants first.";
  else if (matched) text = `All ${total} ${unit} assigned`;
  else if (current < total)
    text = `${total - current} of ${total} ${unit} still to assign`;
  else text = `${current - total} over. Reduce a count so the total is ${total}.`;

  return (
    <div className="space-y-2 pt-1">
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            error
              ? "bg-rose-500"
              : matched
              ? "bg-[#0E7A6E]"
              : "bg-amber-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        id={id}
        role={error ? "alert" : "status"}
        className={`text-xs font-semibold flex items-center gap-1.5 ${
          error
            ? "text-rose-600"
            : matched
            ? "text-[#0E7A6E]"
            : "text-slate-500"
        }`}
      >
        {matched ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : error ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <Info className="w-3.5 h-3.5" />
        )}
        <span>{error || text}</span>
      </div>
    </div>
  );
}

/* =========================================================================
 * Main RegisterPage Component
 * ========================================================================= */

export default function RegisterPage() {
  const router = useRouter();

  // Mode: Individual vs Group
  const [isGroup, setIsGroup] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>("NGN");

  // Config loaded from Express backend
  const [pricesMinor, setPricesMinor] = useState<
    Partial<Record<SupportedCurrency, number>>
  >({});
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [configState, setConfigState] = useState<
    "loading" | "ready" | "error"
  >("loading");

  // Form state
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState(INITIAL_PHONE);
  const [payerEmail, setPayerEmail] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [groupName, setGroupName] = useState("");
  const [seatsInput, setSeatsInput] = useState("0");
  const parsedSeats = Number.parseInt(seatsInput, 10);
  const seatsCount = Number.isFinite(parsedSeats)
    ? Math.min(500, Math.max(0, parsedSeats))
    : 0;
  const [attendanceMode, setAttendanceMode] = useState<
    "physically" | "online" | "not_sure"
  >("physically");
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
  const [customNairaAmount, setCustomNairaAmount] = useState("5000");
  const [groupAttendance, setGroupAttendance] = useState({
    physically: 0,
    online: 0,
    not_sure: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const checkoutAttempt = useRef<{ payload: string; key: string } | null>(null);

  const errorCount = Object.keys(fieldErrors).length;
  const matchedCountry = findCountry(country);
  const matchedState = findNigerianState(state);
  const isNigeria =
    matchedCountry === NIGERIA || country.trim().toLowerCase() === "nigeria";
  const selectedCountry = findCountry(country) ?? country;
  const selectedDial = countryDialCode(selectedCountry);
  const selectedFlag = countryFlag(selectedCountry);
  const inviteeNumber = hasInvitees ? Number(inviteeCount) || 0 : 0;
  const returningCount = Math.max(0, seatsCount - inviteeNumber);
  const groupAttendanceTotal =
    groupAttendance.physically +
    groupAttendance.online +
    groupAttendance.not_sure;

  /* ---------- Reset helpers ---------- */

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
    setCustomNairaAmount("5000");
    setGroupAttendance({ physically: 0, online: 0, not_sure: 0 });
    setError(null);
    setFieldErrors({});
    setLoading(false);
    checkoutAttempt.current = null;
    resetTurnstile();
  }, [resetTurnstile]);

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

  const focusField = (key: FieldKey) => {
    const el = document.getElementById(`field-${key}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (key !== "turnstile") el.focus({ preventScroll: true });
  };

  /* ---------- Effects ---------- */

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetForm();
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
        setRegistrationOpen(Boolean(data.registrationOpen));
        setConfigState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setConfigState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    const renderWidget = () => {
      const api = getTurnstile();
      if (api && turnstileRef.current && !turnstileRef.current.hasChildNodes()) {
        api.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            setTurnstileToken(token);
            setFieldErrors((prev) => {
              if (!prev.turnstile) return prev;
              const next = { ...prev };
              delete next.turnstile;
              return next;
            });
          },
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          theme: "light",
        });
      }
    };

    if (getTurnstile()) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
  }, []);

  /* ---------- Pricing ---------- */

  const effectiveSeats = isGroup ? seatsCount : 1;
  const unitMinor = pricesMinor[currency];
  const minimumNairaMinor = effectiveSeats * MIN_NGN_PER_PASS_MINOR;
  const standardGroupNairaMinor =
    typeof pricesMinor.NGN === "number"
      ? pricesMinor.NGN * seatsCount
      : null;
  const customNairaMajor = Number(customNairaAmount);
  const customNairaMinor =
    currency === "NGN" && Number.isFinite(customNairaMajor)
      ? Math.round(customNairaMajor * 100)
      : null;
  const totalMinor =
    currency === "NGN"
      ? isGroup
        ? standardGroupNairaMinor
        : customNairaMinor
      : typeof unitMinor === "number"
      ? effectiveSeats * unitMinor
      : null;
  const formattedTotal =
    totalMinor !== null ? formatMoneyMinor(totalMinor, currency) : "—";

  /* ---------- Validation ---------- */

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    const seatsValid =
      Number.isInteger(parsedSeats) && parsedSeats >= 2 && parsedSeats <= 500;

    if (isGroup) {
      if (!groupName.trim())
        errs.groupName = "Enter your chapter or zone name.";
      if (!seatsValid)
        errs.seats = "Enter a participant count between 2 and 500.";
      if (
        hasInvitees &&
        (!Number.isInteger(Number(inviteeCount)) ||
          Number(inviteeCount) < 1 ||
          Number(inviteeCount) > seatsCount)
      ) {
        errs.inviteeCount = `Enter an invitee count between 1 and ${seatsCount}.`;
      }
      if (genderCounts.male + genderCounts.female !== seatsCount) {
        errs.genderCounts = `Males and Females must add up to ${seatsCount} participants.`;
      }
      if (hasChildren && (childCount < 1 || childCount > seatsCount)) {
        errs.childCount = `Enter a child count between 1 and ${seatsCount}.`;
      }
    } else {
      if (gender !== "male" && gender !== "female")
        errs.gender = "Select Brother or Sister.";
      if (firstTime !== "yes" && firstTime !== "no")
        errs.firstTime = "Select Yes or No.";
    }

    if (!payerName.trim()) errs.payerName = "Enter your full name.";
    if (!toE164Phone(payerPhone)) {
      errs.payerPhone = `Enter a valid phone number, e.g. ${selectedDial} 801 234 5678.`;
    }
    if (!EMAIL_RE.test(payerEmail.trim())) {
      errs.payerEmail = "Enter a valid email address, e.g. name@example.com.";
    }
    if (!matchedCountry) errs.country = "Select a country from the list.";
    if (isNigeria && !matchedState)
      errs.state = "Select a Nigerian state from the list.";

    if (!isGroup && isMinor) {
      if (!guardianName.trim())
        errs.guardianName = "Enter a parent or guardian name.";
      if (!guardianPhone.trim())
        errs.guardianPhone = "Enter a parent or guardian phone number.";
    }

    if (!isGroup && currency === "NGN") {
      if (
        !Number.isInteger(customNairaMajor) ||
        customNairaMinor === null ||
        customNairaMinor < minimumNairaMinor
      ) {
        errs.customNairaAmount = "Enter a valid whole-naira amount (minimum ₦2,000).";
      }
    }

    if (isGroup && seatsValid) {
      const counted =
        groupAttendance.physically +
        groupAttendance.online +
        groupAttendance.not_sure;
      if (counted !== parsedSeats) {
        errs.groupAttendance = `Attendance counts must sum to ${parsedSeats} participants (currently ${counted}).`;
      }
    }

    if (!consent)
      errs.consent = "Please accept the terms and registration consent to continue.";
    if (TURNSTILE_SITE_KEY && !turnstileToken)
      errs.turnstile = "Please complete the verification check.";

    return errs;
  };

  /* ---------- Live Step Completion Check ---------- */

  const live = validate();
  const hasErr = (...keys: FieldKey[]) => keys.some((k) => live[k]);
  const seatsOk =
    Number.isInteger(parsedSeats) && parsedSeats >= 2 && parsedSeats <= 500;
  const stepDone = {
    type: true,
    details: isGroup
      ? !hasErr(
          "groupName",
          "seats",
          "country",
          "state",
          "inviteeCount",
          "hasChildren",
          "childCount",
          "genderCounts"
        )
      : !hasErr("gender", "firstTime"),
    contact:
      !hasErr(
        "payerName",
        "payerPhone",
        "payerEmail",
        "guardianName",
        "guardianPhone"
      ) && (isGroup || !hasErr("country", "state")),
    attendance: isGroup
      ? seatsOk &&
        !hasErr("groupAttendance") &&
        groupAttendanceTotal === parsedSeats
      : true,
    payment: totalMinor !== null && !hasErr("customNairaAmount"),
    review: !hasErr("consent", "turnstile"),
  };
  const doneCount = Object.values(stepDone).filter(Boolean).length;
  const progress = Math.round((doneCount / TOTAL_STEPS) * 100);
  const firstInvalidKey = FIELD_ORDER.find((k) => fieldErrors[k]);

  /* ---------- Submit handler ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const errs = validate();
    setFieldErrors(errs);
    const firstInvalid = FIELD_ORDER.find((k) => errs[k]);
    if (firstInvalid) {
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
        state: isNigeria ? (matchedState || undefined) : (state.trim() || undefined),
        attendanceMode,
        gender: isGroup ? undefined : gender,
        firstTime: isGroup ? undefined : firstTime === "yes",
        isMinor: minor,
        guardianName: minor ? guardianName.trim() : undefined,
        guardianPhone: minor ? guardianPhone.trim() : undefined,
        group: isGroup
          ? { name: groupName.trim(), totalSeats: seatsCount }
          : undefined,
        inviteeCount:
          isGroup && hasInvitees ? Number(inviteeCount) : isGroup ? 0 : undefined,
        genderCounts: isGroup ? genderCounts : undefined,
        hasChildren: isGroup ? hasChildren : undefined,
        childCount: isGroup && hasChildren ? childCount : undefined,
        turnstileToken: turnstileToken || undefined,
        consent,
        customAmountMinor:
          !isGroup && currency === "NGN" ? customNairaMinor : undefined,
        groupAttendance: isGroup ? groupAttendance : undefined,
      };

      const { turnstileToken: _t, ...fingerprintSource } = checkoutPayload;
      const fingerprint = JSON.stringify(fingerprintSource);
      if (
        !checkoutAttempt.current ||
        checkoutAttempt.current.payload !== fingerprint
      ) {
        checkoutAttempt.current = {
          payload: fingerprint,
          key: crypto.randomUUID(),
        };
      }

      const res = await fetch(`${API_BASE}/api/checkout/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": checkoutAttempt.current.key,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 410) checkoutAttempt.current = null;
        throw new Error(
          data.error || "Failed to initialize registration session."
        );
      }

      checkoutAttempt.current = null;

      if (data.reference && data.checkoutToken) {
        try {
          localStorage.setItem(
            `ihgc_checkout_${data.reference}`,
            data.checkoutToken
          );
          localStorage.setItem(
            "ihgc_last_checkout",
            JSON.stringify({ reference: data.reference, phone: payerPhoneE164 })
          );
        } catch (_) {}
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/payment/status?ref=${data.reference}`);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
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
    (isGroup &&
      (!Number.isInteger(parsedSeats) || parsedSeats < 2 || parsedSeats > 500));

  const handleCountryChange = (next: string) => {
    const nextIsNigeria =
      findCountry(next) === NIGERIA || next.trim().toLowerCase() === "nigeria";
    setCountry(next);
    setPayerPhone((prev) => phoneWithCountryDial(prev, countryDialCode(next)));
    clearErr("country");
    clearErr("state");
    clearErr("payerPhone");
    if (nextIsNigeria !== isNigeria) {
      setState("");
    }
  };

  const locationFields = (
    <>
      <FormField
        htmlFor="field-country"
        label={isGroup ? "Group Country" : "Country of Residence"}
        error={fieldErrors.country}
        hint={
          isGroup
            ? "Applies to the entire group delegation."
            : "Select your country to update dialing code."
        }
      >
        <SearchSelect
          id="field-country"
          value={country}
          options={COUNTRIES}
          placeholder="Search country..."
          emptyMessage="No matching countries found"
          invalid={Boolean(fieldErrors.country)}
          describedBy={
            fieldErrors.country ? "field-country-error" : undefined
          }
          onTyping={() => {
            clearErr("country");
            clearErr("state");
          }}
          onChange={handleCountryChange}
          renderLeading={(value) => (
            <span aria-hidden className="text-xl leading-none">
              {countryFlag(value)}
            </span>
          )}
          renderOption={(option) => {
            const flag = countryFlag(option);
            const badge = countryCurrencyBadge(option);
            return (
              <>
                <span aria-hidden className="text-lg leading-none">
                  {flag}
                </span>
                <span className="truncate flex-1">{option}</span>
                <span aria-hidden className="text-xs text-slate-400 font-bold ml-auto">
                  {badge}
                </span>
              </>
            );
          }}
        />
      </FormField>

      <FormField
        htmlFor="field-state"
        label={
          isNigeria
            ? isGroup
              ? "Group State"
              : "State of Residence"
            : isGroup
            ? "Group State / Province"
            : "State / Province / Region"
        }
        error={fieldErrors.state}
        required={isNigeria}
        hint={
          isNigeria
            ? isGroup
              ? "Applied to every participant in this group."
              : "Required for participants resident in Nigeria."
            : "Enter your state, province, or region."
        }
      >
        {isNigeria ? (
          <SearchSelect
            id="field-state"
            value={state}
            options={NIGERIAN_STATES}
            placeholder="Select Nigerian state..."
            emptyMessage="No matching states found"
            invalid={Boolean(fieldErrors.state)}
            describedBy={fieldErrors.state ? "field-state-error" : undefined}
            onTyping={() => clearErr("state")}
            onChange={(next) => {
              setState(next);
              clearErr("state");
            }}
          />
        ) : (
          <input
            type="text"
            id="field-state"
            value={state}
            placeholder="e.g. California, Ontario, Greater London, etc."
            onChange={(e) => {
              setState(e.target.value);
              clearErr("state");
            }}
            className="w-full h-[52px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-[15px] font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12 transition-all"
          />
        )}
      </FormField>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#070D18]">
      <Header />

      {/* Cinematic Top Hero Header (Inspired by Design Reference) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#070D18] via-[#091322] to-[#0A1628] text-white pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-[#0E7A6E]/20 to-[#8EE3D6]/10 blur-[100px] rounded-full"
        />

        <div className="relative max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            <Sparkles className="w-3.5 h-3.5" />
            Limited Spots Available · IHGC 2026
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
            International Holiness General Conference 2026
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base lg:text-lg leading-relaxed">
            Theme: <strong className="text-white">&ldquo;{SITE_CONFIG.theme}&rdquo;</strong> — Register now for 4 days of spiritual breakthrough, holiness teaching, and revival in Kwali, Abuja.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-gray-300">
              <Calendar className="w-4 h-4 text-[#8EE3D6]" /> 8–11 December 2026
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-gray-300">
              <MapPin className="w-4 h-4 text-[#8EE3D6]" /> Kwali, Abuja, Nigeria
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-gray-300">
              <Clock className="w-4 h-4 text-[#8EE3D6]" /> Opens Tuesday 4:00 PM WAT
            </span>
          </div>
        </div>
      </section>

      {/* Main Form & Overview Section */}
      <main className="relative -mt-10 sm:-mt-16 flex-1 pb-24 z-10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Left Column: Event Overview Card (Sticky on Desktop) */}
            <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
              <div className="bg-[#0B1424] text-white rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-7">
                {/* Logo & Headline */}
                <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                  <Image
                    src={SITE_CONFIG.logo.src}
                    alt={SITE_CONFIG.logo.alt}
                    width={110}
                    height={38}
                    className="h-10 w-auto object-contain"
                    priority
                  />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8EE3D6] block">
                      Official Portal
                    </span>
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      IHGC 2026 Registration
                    </h2>
                  </div>
                </div>

                {/* Live Countdown */}
                <div className="p-5 rounded-2xl bg-[#070D18] border border-white/10 space-y-2 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#8EE3D6]">
                    Conference Begins In
                  </span>
                  <div className="flex items-center justify-center pt-1">
                    <Countdown compact />
                  </div>
                </div>

                {/* Key Conference Value Highlights */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    What Your Registration Pass Includes
                  </h4>
                  <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#8EE3D6] shrink-0 mt-0.5" />
                      <span>Full 4-day admission to all morning warfare, teaching & revival sessions.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#8EE3D6] shrink-0 mt-0.5" />
                      <span>Official digital entry pass with secure QR verification for camp gate access.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#8EE3D6] shrink-0 mt-0.5" />
                      <span>Access to official book reviews, marriage prayer sessions & ministries.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#8EE3D6] shrink-0 mt-0.5" />
                      <span>Live online streaming link for remote participants worldwide.</span>
                    </li>
                  </ul>
                </div>

                {/* Timetable Link Box */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Daily Schedule Ready
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Review all 4 days of warfare, teachings & revivals.
                    </p>
                  </div>
                  <Link
                    href="/programme"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7A6E] text-white text-xs font-bold hover:bg-[#0B655B] transition-colors shrink-0"
                  >
                    View Schedule <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Security Reassurance */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#8EE3D6]" />
                    <span>256-Bit SSL Encrypted Checkout</span>
                  </div>
                  <span className="font-semibold text-gray-300">Paystack Certified</span>
                </div>
              </div>
            </aside>

            {/* Right Column: Redesigned White Registration Card */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-10 lg:p-12 space-y-10">
                
                {/* Form Top Header with Progress */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#0E7A6E]">
                      Registration Form
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                      Participant Details
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Completion
                      </span>
                      <span className="text-sm font-extrabold text-[#0E7A6E]">
                        {doneCount} of {TOTAL_STEPS} Steps
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center font-bold text-xs text-[#0E7A6E]">
                      {progress}%
                    </div>
                  </div>
                </div>

                <form id="register-form" noValidate onSubmit={handleSubmit} className="space-y-10">
                  
                  {/* Step 1: Registration Type Selection */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Select Registration Category
                    </label>
                    <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => switchMode(false)}
                        className={`h-14 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm sm:text-base transition-all ${
                          !isGroup
                            ? "bg-[#0A101D] text-white shadow-md shadow-slate-900/20"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        Individual Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode(true)}
                        className={`h-14 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm sm:text-base transition-all ${
                          isGroup
                            ? "bg-[#0A101D] text-white shadow-md shadow-slate-900/20"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        Group Delegation
                      </button>
                    </div>
                  </div>

                  {/* Step 2: About You / Group Setup */}
                  <div className="space-y-6">
                    <SectionStepHeader
                      n={2}
                      done={stepDone.details}
                      title={isGroup ? "Group & Delegation Details" : "About You"}
                      subtitle={
                        isGroup
                          ? "Specify your church branch, chapter, and participant breakdown."
                          : "Basic demographic details for your conference badge."
                      }
                    />

                    {isGroup ? (
                      <div className="space-y-6 p-6 rounded-2xl bg-slate-50/70 border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <FormField
                            htmlFor="field-groupName"
                            label="Chapter / Branch Name"
                            error={fieldErrors.groupName}
                          >
                            <input
                              type="text"
                              id="field-groupName"
                              placeholder="e.g. Horemow Lagos Central"
                              value={groupName}
                              onChange={(e) => {
                                setGroupName(e.target.value);
                                clearErr("groupName");
                              }}
                              className={`w-full h-[52px] px-4 rounded-xl border bg-white text-slate-900 text-[15px] font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                                fieldErrors.groupName
                                  ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-100"
                                  : "border-slate-300 hover:border-slate-400 focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
                              }`}
                            />
                          </FormField>

                          <FormField
                            htmlFor="field-seats"
                            label="Total Participants"
                            error={fieldErrors.seats}
                            hint="Everyone in the group, including children (2 to 500)."
                          >
                            <StepperField
                              id="field-seats"
                              label="participants"
                              value={seatsInput}
                              min={2}
                              max={500}
                              invalid={Boolean(fieldErrors.seats)}
                              describedBy={
                                fieldErrors.seats ? "field-seats-error" : undefined
                              }
                              onChange={(next) => {
                                setSeatsInput(next);
                                clearErr("seats");
                                clearErr("groupAttendance");
                                clearErr("genderCounts");
                                if (!hasInvitees) clearErr("inviteeCount");
                              }}
                              onBlur={() => {
                                const parsed = Number.parseInt(seatsInput, 10);
                                const clamped = Math.min(
                                  500,
                                  Math.max(0, Number.isFinite(parsed) ? parsed : 0)
                                );
                                setSeatsInput(String(clamped));
                                if (clamped >= 2) clearErr("seats");
                                else
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    seats: "Enter a participant count between 2 and 500.",
                                  }));
                              }}
                            />
                          </FormField>

                          {locationFields}
                        </div>

                        {/* Invitees Switch */}
                        <div className="space-y-4 pt-2">
                          <SwitchCard
                            id="field-hasInvitees"
                            checked={hasInvitees}
                            onChange={(next) => {
                              setHasInvitees(next);
                              setInviteeCount(next ? "1" : "0");
                              clearErr("inviteeCount");
                            }}
                            label="Do you have first-time invitees in your group?"
                            description={
                              hasInvitees
                                ? `${inviteeNumber} first-time attendee${
                                    inviteeNumber === 1 ? "" : "s"
                                  } · ${returningCount} returning`
                                : `All ${seatsCount} participants recorded as returning members.`
                            }
                          />
                          {hasInvitees && (
                            <div className="sm:max-w-xs pl-2">
                              <FormField
                                htmlFor="field-inviteeCount"
                                label="Number of First-Time Invitees"
                                error={fieldErrors.inviteeCount}
                              >
                                <StepperField
                                  id="field-inviteeCount"
                                  label="invitees"
                                  value={inviteeCount}
                                  min={1}
                                  max={seatsCount}
                                  invalid={Boolean(fieldErrors.inviteeCount)}
                                  describedBy={
                                    fieldErrors.inviteeCount
                                      ? "field-inviteeCount-error"
                                      : undefined
                                  }
                                  onChange={(next) => {
                                    setInviteeCount(next);
                                    clearErr("inviteeCount");
                                  }}
                                />
                              </FormField>
                            </div>
                          )}
                        </div>

                        {/* Children Switch */}
                        <div className="space-y-4 pt-2">
                          <SwitchCard
                            id="field-hasChildren"
                            checked={hasChildren}
                            onChange={(next) => {
                              setHasChildren(next);
                              setChildCount(next ? 1 : 0);
                              clearErr("hasChildren");
                              clearErr("childCount");
                            }}
                            label="Are you registering children in this group?"
                            description="Helps us prepare dedicated children ministry materials."
                          />
                          {hasChildren && (
                            <div className="sm:max-w-xs pl-2">
                              <FormField
                                htmlFor="field-childCount"
                                label="Number of Children"
                                error={fieldErrors.childCount}
                              >
                                <StepperField
                                  id="field-childCount"
                                  label="children"
                                  value={childCount}
                                  min={1}
                                  max={seatsCount}
                                  invalid={Boolean(fieldErrors.childCount)}
                                  describedBy={
                                    fieldErrors.childCount
                                      ? "field-childCount-error"
                                      : undefined
                                  }
                                  onChange={(next) => {
                                    setChildCount(
                                      Math.max(
                                        0,
                                        Math.min(seatsCount, toInt(next))
                                      )
                                    );
                                    clearErr("childCount");
                                  }}
                                />
                              </FormField>
                            </div>
                          )}
                        </div>

                        {/* Male / Female Distribution */}
                        <div className="space-y-4 pt-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Gender Distribution (Must total {seatsCount} seats)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField
                              htmlFor="field-genderCounts"
                              label="Males (Including Boys)"
                            >
                              <StepperField
                                id="field-genderCounts"
                                label="males"
                                value={genderCounts.male}
                                min={0}
                                max={seatsCount}
                                invalid={Boolean(fieldErrors.genderCounts)}
                                describedBy={
                                  fieldErrors.genderCounts
                                    ? "field-genderCounts-error"
                                    : undefined
                                }
                                onChange={(next) => {
                                  const value = Math.max(
                                    0,
                                    Math.min(seatsCount, toInt(next))
                                  );
                                  setGenderCounts((prev) => ({
                                    ...prev,
                                    male: value,
                                  }));
                                  clearErr("genderCounts");
                                }}
                              />
                            </FormField>
                            <FormField
                              htmlFor="field-genderCounts-female"
                              label="Females (Including Girls)"
                            >
                              <StepperField
                                id="field-genderCounts-female"
                                label="females"
                                value={genderCounts.female}
                                min={0}
                                max={seatsCount}
                                invalid={Boolean(fieldErrors.genderCounts)}
                                describedBy={
                                  fieldErrors.genderCounts
                                    ? "field-genderCounts-error"
                                    : undefined
                                }
                                onChange={(next) => {
                                  const value = Math.max(
                                    0,
                                    Math.min(seatsCount, toInt(next))
                                  );
                                  setGenderCounts((prev) => ({
                                    ...prev,
                                    female: value,
                                  }));
                                  clearErr("genderCounts");
                                }}
                              />
                            </FormField>
                          </div>
                          <ProgressTally
                            id="field-genderCounts-error"
                            current={genderCounts.male + genderCounts.female}
                            total={seatsCount}
                            unit="participants"
                            error={fieldErrors.genderCounts}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          htmlFor="field-gender"
                          label="Title / Gender"
                          error={fieldErrors.gender}
                        >
                          <div
                            id="field-gender"
                            role="group"
                            aria-label="Gender"
                            className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setGender("male");
                                clearErr("gender");
                              }}
                              className={`h-11 rounded-lg font-bold text-sm transition-all ${
                                gender === "male"
                                  ? "bg-[#0A101D] text-white shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Brother (Male)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGender("female");
                                clearErr("gender");
                              }}
                              className={`h-11 rounded-lg font-bold text-sm transition-all ${
                                gender === "female"
                                  ? "bg-[#0A101D] text-white shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Sister (Female)
                            </button>
                          </div>
                        </FormField>

                        <FormField
                          htmlFor="field-firstTime"
                          label="Is this your first time attending?"
                          error={fieldErrors.firstTime}
                        >
                          <div
                            id="field-firstTime"
                            role="group"
                            aria-label="First timer"
                            className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setFirstTime("yes");
                                clearErr("firstTime");
                              }}
                              className={`h-11 rounded-lg font-bold text-sm transition-all ${
                                firstTime === "yes"
                                  ? "bg-[#0A101D] text-white shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Yes, First Time
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFirstTime("no");
                                clearErr("firstTime");
                              }}
                              className={`h-11 rounded-lg font-bold text-sm transition-all ${
                                firstTime === "no"
                                  ? "bg-[#0A101D] text-white shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              No, Returning
                            </button>
                          </div>
                        </FormField>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Contact Details */}
                  <div className="space-y-6">
                    <SectionStepHeader
                      n={3}
                      done={stepDone.contact}
                      title={
                        isGroup
                          ? "Group Leader Contact"
                          : "Your Contact Details"
                      }
                      subtitle={
                        isGroup
                          ? "We will send group tickets and receipts to this contact."
                          : "Your digital pass and check-in barcode will be delivered here."
                      }
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {!isGroup && locationFields}

                      <FormField
                        htmlFor="field-payerName"
                        label="Full Name"
                        error={fieldErrors.payerName}
                      >
                        <input
                          type="text"
                          id="field-payerName"
                          autoComplete="name"
                          placeholder="e.g. Bro. John Doe"
                          value={payerName}
                          onChange={(e) => {
                            setPayerName(e.target.value);
                            clearErr("payerName");
                          }}
                          className={`w-full h-[52px] px-4 rounded-xl border bg-white text-slate-900 text-[15px] font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                            fieldErrors.payerName
                              ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-100"
                              : "border-slate-300 hover:border-slate-400 focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
                          }`}
                        />
                      </FormField>

                      <FormField
                        htmlFor="field-payerPhone"
                        label="Phone Number (WhatsApp Preferred)"
                        error={fieldErrors.payerPhone}
                        hint={`Selected: ${selectedFlag} ${selectedDial} (${selectedCountry})`}
                      >
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl leading-none pointer-events-none">
                            {selectedFlag}
                          </span>
                          <input
                            type="tel"
                            id="field-payerPhone"
                            autoComplete="tel"
                            placeholder={`${selectedDial} 801 234 5678`}
                            value={payerPhone}
                            onChange={(e) => {
                              setPayerPhone(e.target.value);
                              clearErr("payerPhone");
                            }}
                            className={`w-full h-[52px] pl-12 pr-4 rounded-xl border bg-white text-slate-900 text-[15px] font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                              fieldErrors.payerPhone
                                ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-100"
                                : "border-slate-300 hover:border-slate-400 focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
                            }`}
                          />
                        </div>
                      </FormField>

                      <div className="sm:col-span-2">
                        <FormField
                          htmlFor="field-payerEmail"
                          label="Email Address"
                          error={fieldErrors.payerEmail}
                          hint="Your official ticket confirmation and PDF badge will be sent here."
                        >
                          <input
                            type="email"
                            id="field-payerEmail"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            placeholder="name@example.com"
                            value={payerEmail}
                            onChange={(e) => {
                              setPayerEmail(e.target.value);
                              clearErr("payerEmail");
                            }}
                            className={`w-full h-[52px] px-4 rounded-xl border bg-white text-slate-900 text-[15px] font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                              fieldErrors.payerEmail
                                ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-100"
                                : "border-slate-300 hover:border-slate-400 focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
                            }`}
                          />
                        </FormField>
                      </div>
                    </div>

                    {!isGroup && (
                      <div className="space-y-4 pt-2">
                        <SwitchCard
                          id="field-isMinor"
                          checked={isMinor}
                          onChange={(next) => {
                            setIsMinor(next);
                            clearErr("guardianName");
                            clearErr("guardianPhone");
                          }}
                          label="Participant is under 18 years of age"
                          description="Parent or legal guardian contact is required for minors."
                        />
                        {isMinor && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                            <FormField
                              htmlFor="field-guardianName"
                              label="Parent / Guardian Name"
                              error={fieldErrors.guardianName}
                            >
                              <input
                                type="text"
                                id="field-guardianName"
                                placeholder="Guardian Full Name"
                                value={guardianName}
                                onChange={(e) => {
                                  setGuardianName(e.target.value);
                                  clearErr("guardianName");
                                }}
                                className="w-full h-[52px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-[15px] font-medium focus:outline-none focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
                              />
                            </FormField>
                            <FormField
                              htmlFor="field-guardianPhone"
                              label="Parent / Guardian Phone"
                              error={fieldErrors.guardianPhone}
                            >
                              <input
                                type="tel"
                                id="field-guardianPhone"
                                placeholder="Guardian Phone Number"
                                value={guardianPhone}
                                onChange={(e) => {
                                  setGuardianPhone(e.target.value);
                                  clearErr("guardianPhone");
                                }}
                                className="w-full h-[52px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-[15px] font-medium focus:outline-none focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
                              />
                            </FormField>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 4: Attendance Mode */}
                  <div className="space-y-6">
                    <SectionStepHeader
                      n={4}
                      done={stepDone.attendance}
                      title={
                        isGroup
                          ? "How Will the Group Attend?"
                          : "How Will You Attend?"
                      }
                      subtitle={
                        isGroup
                          ? `Distribute the ${seatsCount} participants across attendance modes.`
                          : "Let us know if you will be present on campground or watching online."
                      }
                    />

                    {isGroup ? (
                      <div className="space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <FormField
                            htmlFor="field-groupAttendance-physically"
                            label="Attending In-Person"
                          >
                            <StepperField
                              id="field-groupAttendance-physically"
                              label="physical attendees"
                              value={groupAttendance.physically}
                              min={0}
                              max={seatsCount}
                              invalid={Boolean(fieldErrors.groupAttendance)}
                              describedBy={
                                fieldErrors.groupAttendance
                                  ? "field-groupAttendance-error"
                                  : undefined
                              }
                              onChange={(next) => {
                                setGroupAttendance({
                                  ...groupAttendance,
                                  physically: Math.max(
                                    0,
                                    Math.min(seatsCount, toInt(next))
                                  ),
                                });
                                clearErr("groupAttendance");
                              }}
                            />
                          </FormField>

                          <FormField
                            htmlFor="field-groupAttendance-online"
                            label="Attending Online"
                          >
                            <StepperField
                              id="field-groupAttendance-online"
                              label="online attendees"
                              value={groupAttendance.online}
                              min={0}
                              max={seatsCount}
                              invalid={Boolean(fieldErrors.groupAttendance)}
                              describedBy={
                                fieldErrors.groupAttendance
                                  ? "field-groupAttendance-error"
                                  : undefined
                              }
                              onChange={(next) => {
                                setGroupAttendance({
                                  ...groupAttendance,
                                  online: Math.max(
                                    0,
                                    Math.min(seatsCount, toInt(next))
                                  ),
                                });
                                clearErr("groupAttendance");
                              }}
                            />
                          </FormField>

                          <FormField
                            htmlFor="field-groupAttendance-not-sure"
                            label="Not Sure Yet"
                          >
                            <StepperField
                              id="field-groupAttendance-not-sure"
                              label="not decided"
                              value={groupAttendance.not_sure}
                              min={0}
                              max={seatsCount}
                              invalid={Boolean(fieldErrors.groupAttendance)}
                              describedBy={
                                fieldErrors.groupAttendance
                                  ? "field-groupAttendance-error"
                                  : undefined
                              }
                              onChange={(next) => {
                                setGroupAttendance({
                                  ...groupAttendance,
                                  not_sure: Math.max(
                                    0,
                                    Math.min(seatsCount, toInt(next))
                                  ),
                                });
                                clearErr("groupAttendance");
                              }}
                            />
                          </FormField>
                        </div>
                        <ProgressTally
                          id="field-groupAttendance-error"
                          current={groupAttendanceTotal}
                          total={seatsCount}
                          unit="participants"
                          error={fieldErrors.groupAttendance}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {ATTENDANCE_OPTIONS.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAttendanceMode(value)}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                              attendanceMode === value
                                ? "bg-[#0A101D] border-[#0A101D] text-white shadow-md shadow-slate-900/15"
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  attendanceMode === value
                                    ? "border-[#8EE3D6] bg-[#8EE3D6]"
                                    : "border-slate-300"
                                }`}
                              >
                                {attendanceMode === value && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A101D]" />
                                )}
                              </span>
                            </div>
                            <div className="font-bold text-sm leading-snug">
                              {label}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 5: Payment Currency & Fee */}
                  <div className="space-y-6">
                    <SectionStepHeader
                      n={5}
                      done={stepDone.payment}
                      title="Payment & Currency"
                      subtitle="All payments are processed securely via Paystack in your preferred currency."
                    />

                    {/* Currency Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {CURRENCY_LIST.map((c) => {
                        const price = pricesMinor[c];
                        const isSelected = currency === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            disabled={configState !== "ready"}
                            onClick={() => {
                              setCurrency(c);
                              clearErr("customNairaAmount");
                            }}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? "bg-[#0A101D] border-[#0A101D] text-white shadow-lg shadow-slate-900/15"
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <div className="text-xl mb-1">{CURRENCIES[c].flag}</div>
                            <div className="font-extrabold text-base">{c}</div>
                            <div
                              className={`text-xs mt-0.5 ${
                                isSelected ? "text-gray-300" : "text-slate-500"
                              }`}
                            >
                              {typeof price === "number"
                                ? formatMoneyMinor(price, c)
                                : "Loading..."}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Naira Custom / Standard Pricing */}
                    {currency === "NGN" ? (
                      <div className="space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <FormField
                          htmlFor="field-customNairaAmount"
                          label="Registration Amount (₦)"
                          error={fieldErrors.customNairaAmount}
                          hint={
                            isGroup
                              ? "Calculated automatically from the flat rate and your participant count."
                              : "Standard registration fee is ₦5,000 (minimum ₦2,000)."
                          }
                        >
                          <div className="relative max-w-xs">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-lg pointer-events-none">
                              ₦
                            </span>
                            <input
                              type="number"
                              id="field-customNairaAmount"
                              inputMode="numeric"
                              step="1"
                              readOnly={isGroup}
                              value={
                                isGroup
                                  ? standardGroupNairaMinor !== null
                                    ? String(standardGroupNairaMinor / 100)
                                    : ""
                                  : customNairaAmount
                              }
                              onChange={(e) => {
                                if (isGroup) return;
                                setCustomNairaAmount(e.target.value);
                                clearErr("customNairaAmount");
                              }}
                              className={`w-full h-[52px] pl-10 pr-4 rounded-xl border bg-white text-slate-900 text-lg font-bold focus:outline-none transition-all ${
                                fieldErrors.customNairaAmount
                                  ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-100"
                                  : "border-slate-300 focus:border-[#0E7A6E] focus:ring-4 focus:ring-[#0E7A6E]/12"
                              } ${isGroup ? "bg-slate-100 cursor-not-allowed text-slate-600" : ""}`}
                            />
                          </div>
                        </FormField>

                        {!isGroup && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-slate-500 mr-1">
                              Quick select:
                            </span>
                            {["5000", "10000", "20000"].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => {
                                  setCustomNairaAmount(amt);
                                  clearErr("customNairaAmount");
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                  customNairaAmount === amt
                                    ? "bg-[#0E7A6E] text-white border-[#0E7A6E]"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                ₦{Number(amt).toLocaleString()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        {typeof unitMinor === "number"
                          ? `You will pay ${formatMoneyMinor(
                              unitMinor,
                              currency
                            )} per participant (${effectiveSeats} seat${
                              effectiveSeats === 1 ? "" : "s"
                            }) in ${currency}.`
                          : `The ${currency} rate is currently loading.`}
                      </p>
                    )}
                  </div>

                  {/* Step 6: Review Summary & Submission */}
                  <div className="space-y-6">
                    <SectionStepHeader
                      n={6}
                      done={stepDone.review}
                      title="Review & Confirm Registration"
                      subtitle="Check your registration details before proceeding to the secure Paystack checkout."
                    />

                    {/* Summary Card */}
                    <div className="bg-[#0A101D] text-white rounded-2xl p-6 sm:p-7 space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                        <span className="text-gray-400">Registration Category</span>
                        <span className="font-bold">
                          {isGroup ? "Group Delegation" : "Individual Pass"}
                        </span>
                      </div>
                      {isGroup && groupName.trim() && (
                        <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                          <span className="text-gray-400">Chapter / Branch</span>
                          <span className="font-bold">{groupName.trim()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                        <span className="text-gray-400">Total Participants</span>
                        <span className="font-bold">
                          {effectiveSeats} Attendee{effectiveSeats === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                        <span className="text-gray-400">Location</span>
                        <span className="font-bold truncate max-w-[200px] text-right">
                          {selectedCountry}
                          {isNigeria
                            ? matchedState ? `, ${matchedState}` : ""
                            : state.trim() ? `, ${state.trim()}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-[#8EE3D6] block">
                            Total Payable ({currency})
                          </span>
                          <span className="text-xs text-gray-400">
                            Includes all event materials and pass
                          </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white">
                          {formattedTotal}
                        </div>
                      </div>
                    </div>

                    {/* Terms & Consent */}
                    <div className="space-y-4 pt-2">
                      <label
                        className={`flex items-start gap-3.5 p-4.5 rounded-2xl border transition-all cursor-pointer ${
                          fieldErrors.consent
                            ? "bg-rose-50/40 border-rose-300"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          id="field-consent"
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => {
                            setConsent(e.target.checked);
                            clearErr("consent");
                          }}
                          className="w-5 h-5 mt-0.5 rounded border-slate-300 text-[#0E7A6E] focus:ring-[#0E7A6E]"
                        />
                        <span className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          I confirm that the provided information is accurate. I understand that registration fees are non-refundable and contribute towards conference organization. I accept the{" "}
                          <Link
                            href="/privacy"
                            className="font-bold text-[#0E7A6E] underline hover:text-[#0B655B]"
                          >
                            Privacy Policy
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/terms"
                            className="font-bold text-[#0E7A6E] underline hover:text-[#0B655B]"
                          >
                            Terms of Service
                          </Link>.
                        </span>
                      </label>
                      {fieldErrors.consent && (
                        <p
                          id="field-consent-error"
                          role="alert"
                          className="text-xs font-semibold text-rose-600 flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.consent}</span>
                        </p>
                      )}

                      {/* Turnstile Security Check */}
                      {TURNSTILE_SITE_KEY && (
                        <div className="pt-2 space-y-2">
                          <div
                            id="field-turnstile"
                            ref={turnstileRef}
                            className={`min-h-[65px] rounded-xl overflow-hidden ${
                              fieldErrors.turnstile ? "ring-2 ring-rose-400" : ""
                            }`}
                          />
                          {fieldErrors.turnstile && (
                            <p role="alert" className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{fieldErrors.turnstile}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Errors Banner */}
                      {errorCount > 0 && (
                        <div
                          role="alert"
                          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
                        >
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold">
                              {errorCount === 1
                                ? "1 field needs your attention."
                                : `${errorCount} fields need your attention.`}
                            </span>{" "}
                            Please correct the highlighted items above and continue.
                            {firstInvalidKey && (
                              <button
                                type="button"
                                onClick={() => focusField(firstInvalidKey)}
                                className="block mt-1 font-bold text-rose-700 underline text-xs"
                              >
                                Jump to first incomplete field →
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {error && (
                        <div
                          role="alert"
                          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
                        >
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Offline / Closed Notice */}
                      {(configState === "error" ||
                        (configState === "ready" && !registrationOpen)) && (
                        <div
                          role={configState === "error" ? "alert" : "status"}
                          className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3"
                        >
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            {configState === "error"
                              ? "Registration pricing could not be reached. Please check your internet connection and refresh."
                              : "Online registration is currently closed."}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Pay Button */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={submitDisabled}
                        className="w-full h-16 rounded-2xl bg-gradient-to-r from-[#0E7A6E] to-[#0B655B] text-white font-extrabold text-base sm:text-lg shadow-xl shadow-[#0E7A6E]/25 hover:from-[#0B655B] hover:to-[#084F47] hover:shadow-2xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Connecting to Secure Checkout...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-5 h-5" />
                            <span>
                              {configState === "ready" && !registrationOpen
                                ? "Registration Closed"
                                : totalMinor === null
                                ? "Calculating Price..."
                                : `Proceed to Pay ${formattedTotal}`}
                            </span>
                          </>
                        )}
                      </button>
                      <p className="text-center text-xs text-slate-500 mt-3 flex items-center justify-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#0E7A6E]" />
                        Official payment gateway verified by Paystack. Non-refundable.
                      </p>
                    </div>

                  </div>

                </form>

              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Bottom Pay Bar for Mobile (Hidden on Desktop) */}
      <div className="lg:hidden sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-2xl">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total ({currency})
            </span>
            <span className="text-lg font-extrabold text-slate-900">
              {formattedTotal}
            </span>
          </div>
          <button
            type="submit"
            form="register-form"
            disabled={submitDisabled}
            className="flex-1 max-w-[240px] h-12 rounded-xl bg-[#0E7A6E] text-white font-bold text-sm shadow-md hover:bg-[#0B655B] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Pay {formattedTotal}</span>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
