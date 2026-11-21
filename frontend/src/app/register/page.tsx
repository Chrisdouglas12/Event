"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { SITE_CONFIG } from "@/config/site";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";
import { HeroBackground } from "@/components/marketing/hero-background";
import { Countdown } from "@/components/ui/countdown";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const CURRENCY_LIST: SupportedCurrency[] = ["NGN", "USD", "EUR", "GBP"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INITIAL_PHONE = "+234 ";
const MIN_NGN_PER_PASS_MINOR = 200_000;
// Old versions saved drafts here. Nothing is saved any more; the key is purged on load.
const LEGACY_DRAFT_KEY = "ihgc_draft_registration";

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
  | "firstTimeCounts"
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

// Same order as the fields appear on the page, so we focus the topmost problem.
const FIELD_ORDER: FieldKey[] = [
  "groupName",
  "seats",
  "inviteeCount",
  "genderCounts",
  "firstTimeCounts",
  "hasChildren",
  "childCount",
  "gender",
  "firstTime",
  "payerName",
  "payerPhone",
  "payerEmail",
  "country",
  "state",
  "guardianName",
  "guardianPhone",
  "customNairaAmount",
  "groupAttendance",
  "consent",
  "turnstile",
];

const ATTENDANCE_OPTIONS = [
  ["physically", "Physically"],
  ["online", "Online"],
  ["not_sure", "Not Sure"],
] as const;

const ATTENDANCE_IDS = {
  physically: "field-groupAttendance",
  online: "field-attendance-online",
  not_sure: "field-attendance-not-sure",
} as const;

const PASS_BENEFITS = ["4-day all-access participant badge", "Gate check-in with your QR ticket", "Instant QR ticket"];

// Mirrors the backend normaliser so users get a clear error before checkout.
// Accepts 08012345678, 8012345678, 2348012345678, +234 (0) 801 234 5678,
// 00234 801 234 5678 and normal international numbers.
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

/* ---------- Inline icons ---------- */

function Icon({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.2a5.5 5.5 0 0 1 5.5 5.3" />
    </Icon>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2v.01" />
    </Icon>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Icon>
  );
}

/* ---------- Shared form pieces ---------- */

const inputBase =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#111320] placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2";
const inputOk = "border-gray-200 bg-[#F9FAFB] focus:border-[#1FA396] focus:bg-white focus:ring-[#8EE3D6]/40";
const inputBad = "border-red-400 bg-red-50 focus:border-red-500 focus:bg-white focus:ring-red-200";
const inputCls = (bad: boolean, extra = "") => `${inputBase} ${bad ? inputBad : inputOk} ${extra}`;

function Field({
  htmlFor,
  label,
  error,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-[#111320]">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-500">{hint}</p>}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-[11px] font-medium text-red-600"
        >
          <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h2>
      {note && <p className="mt-1 text-[11px] text-gray-500">{note}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  // Mode: Individual vs Group
  const [isGroup, setIsGroup] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>("NGN");

  // Config loaded from Express
  const [pricesMinor, setPricesMinor] = useState<Partial<Record<SupportedCurrency, number>>>({});
  const [currencyAvailable, setCurrencyAvailable] = useState<Record<SupportedCurrency, boolean>>({
    NGN: false,
    USD: false,
    EUR: false,
    GBP: false,
  });
  const [providerByCurrency, setProviderByCurrency] = useState<Record<SupportedCurrency, string>>({
    NGN: "paystack",
    USD: "paypal",
    EUR: "paypal",
    GBP: "paypal",
  });
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [configState, setConfigState] = useState<"loading" | "ready" | "error">("loading");

  // Form state (never persisted)
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState(INITIAL_PHONE);
  const [payerEmail, setPayerEmail] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [chapterZone, setChapterZone] = useState("");
  const [groupName, setGroupName] = useState("");
  // Kept as a string so clearing the field to type "50" does not snap to 2.
  const [seatsInput, setSeatsInput] = useState("5");
  const seatsCount = Math.max(2, Number.parseInt(seatsInput, 10) || 2);
  const [attendanceMode, setAttendanceMode] = useState<"physically" | "online" | "not_sure">("physically");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [firstTime, setFirstTime] = useState<"yes" | "no">("no");
  const [inviteeCount, setInviteeCount] = useState("0");
  const [genderCounts, setGenderCounts] = useState({ male: 0, female: 0 });
  const [firstTimeCounts, setFirstTimeCounts] = useState({ yes: 0, no: 0 });
  const [hasChildren, setHasChildren] = useState(false);
  const [childCount, setChildCount] = useState(0);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [customNairaAmount, setCustomNairaAmount] = useState("5000");
  const [groupAttendance, setGroupAttendance] = useState({ physically: 0, online: 0, not_sure: 0 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // server / network errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({}); // per-input validation errors

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const checkoutAttempt = useRef<{ payload: string; key: string } | null>(null);

  const errorCount = Object.keys(fieldErrors).length;
  const isNigeria = country.trim().toLowerCase() === "nigeria";

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
    setChapterZone("");
    setGroupName("");
    setSeatsInput("5");
    setAttendanceMode("physically");
    setGender("male");
    setFirstTime("no");
    setInviteeCount("0");
    setGenderCounts({ male: 0, female: 0 });
    setFirstTimeCounts({ yes: 0, no: 0 });
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

  // Props shared by every text input: id, invalid state, error wiring and styling.
  const fp = (key: FieldKey, extra = "") => ({
    id: `field-${key}`,
    "aria-invalid": fieldErrors[key] ? true : undefined,
    "aria-describedby": fieldErrors[key] ? `field-${key}-error` : undefined,
    className: inputCls(Boolean(fieldErrors[key]), extra),
  });

  const focusField = (key: FieldKey) => {
    const el = document.getElementById(`field-${key}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (key !== "turnstile") el.focus({ preventScroll: true });
  };

  /* ---------- Effects ---------- */

  // Purge drafts saved by older versions of this page.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch (_) {}
  }, []);

  // Coming back from the payment page can restore this page from the browser's
  // back/forward cache with the old values. Start clean instead.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetForm();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [resetForm]);

  // Fetch config from Express
  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/register`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Config unavailable");
        if (cancelled) return;

        const available: Record<SupportedCurrency, boolean> = { NGN: false, USD: false, EUR: false, GBP: false };
        for (const c of CURRENCY_LIST) available[c] = Boolean(data.currencyAvailable?.[c]);

        setPricesMinor(data.pricesMinor || {});
        setCurrencyAvailable(available);
        setProviderByCurrency((prev) => ({ ...prev, ...(data.providerByCurrency || {}) }));
        setRegistrationOpen(Boolean(data.registrationOpen));

        // Fall back to the first available currency
        const firstAvailable = CURRENCY_LIST.find((c) => available[c]);
        setCurrency((prev) => (available[prev] ? prev : firstAvailable ?? prev));

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

  // Load Turnstile
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
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
  }, []);

  /* ---------- Pricing ---------- */

  const effectiveSeats = isGroup ? seatsCount : 1;
  const unitMinor = pricesMinor[currency];
  const minimumNairaMinor = effectiveSeats * MIN_NGN_PER_PASS_MINOR;
  const customNairaMajor = Number(customNairaAmount);
  const customNairaMinor =
    currency === "NGN" && Number.isFinite(customNairaMajor) ? Math.round(customNairaMajor * 100) : null;
  const totalMinor =
    currency === "NGN" ? customNairaMinor : typeof unitMinor === "number" ? effectiveSeats * unitMinor : null;
  const formattedTotal = totalMinor !== null ? formatMoneyMinor(totalMinor, currency) : "—";
  const checkoutProvider = providerByCurrency[currency] === "paystack" ? "Paystack" : "PayPal";

  /* ---------- Validation ---------- */

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    const parsedSeats = Number.parseInt(seatsInput, 10);
    const seatsValid = Number.isInteger(parsedSeats) && parsedSeats >= 2 && parsedSeats <= 500;

    if (isGroup) {
      if (!groupName.trim()) errs.groupName = "Enter your chapter or zone name.";
      if (!seatsValid) errs.seats = "Enter a number between 2 and 500.";
      if (!Number.isInteger(Number(inviteeCount)) || Number(inviteeCount) < 0 || Number(inviteeCount) > seatsCount) {
        errs.inviteeCount = `Enter a number between 0 and ${seatsCount}.`;
      }
      if (genderCounts.male + genderCounts.female !== seatsCount) {
        errs.genderCounts = `Male and Female must add up to ${seatsCount} paid seats (children included).`;
      }
      if (firstTimeCounts.yes + firstTimeCounts.no !== seatsCount) {
        errs.firstTimeCounts = `First-time Yes and No must add up to ${seatsCount} paid seats.`;
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
      errs.payerPhone = "Enter a valid phone number, e.g. +234 801 234 5678 or 08012345678.";
    }
    if (!EMAIL_RE.test(payerEmail.trim())) {
      errs.payerEmail = "Enter a valid email address, e.g. name@example.com.";
    }
    if (!country.trim()) errs.country = "Enter your country of residence.";
    if (isNigeria && !state.trim()) errs.state = "Enter your state of residence.";

    if (!isGroup && isMinor) {
      if (!guardianName.trim()) errs.guardianName = "Enter a parent or guardian name.";
      if (!guardianPhone.trim()) errs.guardianPhone = "Enter a parent or guardian phone number.";
    }

    if (currency === "NGN") {
      if (
        !Number.isInteger(customNairaMajor) ||
        customNairaMinor === null ||
        customNairaMinor < minimumNairaMinor
      ) {
        errs.customNairaAmount = `Enter a whole-naira amount of at least ${formatMoneyMinor(minimumNairaMinor, "NGN")}.`;
      }
    }

    if (isGroup && seatsValid) {
      const counted = groupAttendance.physically + groupAttendance.online + groupAttendance.not_sure;
      if (counted !== parsedSeats) {
        errs.groupAttendance = `The three counts must add up to ${parsedSeats} participants (currently ${counted}).`;
      }
    }

    if (!consent) errs.consent = "Please accept the terms and consent to continue.";
    if (TURNSTILE_SITE_KEY && !turnstileToken) errs.turnstile = "Please complete the verification check.";

    return errs;
  };

  /* ---------- Submit ---------- */

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
    if (!payerPhoneE164) return; // already covered by validate()

    setLoading(true);

    try {
      const minor = !isGroup && isMinor;

      const checkoutPayload = {
        currency,
        isGroup,
        payer: {
          name: payerName.trim(),
          phoneE164: payerPhoneE164,
          // Legacy key kept for older API versions.
          phone: payerPhone.trim(),
          email: payerEmail.trim().toLowerCase(),
        },
        country: country.trim(),
        state: isNigeria ? state.trim() : undefined,
        chapterZone: chapterZone.trim() || undefined,
        attendanceMode,
        gender: isGroup ? undefined : gender,
        firstTime: isGroup ? undefined : firstTime === "yes",
        isMinor: minor,
        guardianName: minor ? guardianName.trim() : undefined,
        guardianPhone: minor ? guardianPhone.trim() : undefined,
        group: isGroup ? { name: groupName.trim(), totalSeats: seatsCount } : undefined,
        inviteeCount: isGroup ? Number(inviteeCount) : undefined,
        genderCounts: isGroup ? genderCounts : undefined,
        firstTimeCounts: isGroup ? firstTimeCounts : undefined,
        hasChildren: isGroup ? hasChildren : undefined,
        childCount: isGroup && hasChildren ? childCount : undefined,
        turnstileToken: turnstileToken || undefined,
        consent,
        customAmountMinor: currency === "NGN" ? customNairaMinor : undefined,
        groupAttendance: isGroup ? groupAttendance : undefined,
      };

      const { turnstileToken: _t, ...fingerprintSource } = checkoutPayload;
      const fingerprint = JSON.stringify(fingerprintSource);
      if (!checkoutAttempt.current || checkoutAttempt.current.payload !== fingerprint) {
        checkoutAttempt.current = { payload: fingerprint, key: crypto.randomUUID() };
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

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/payment/status?ref=${data.reference}`);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "An unexpected error occurred. Please try again.");
      setLoading(false);
      resetTurnstile();
    }
  };

  const groupAttendanceTotal = groupAttendance.physically + groupAttendance.online + groupAttendance.not_sure;
  const submitDisabled =
    loading || configState !== "ready" || !currencyAvailable[currency] || !registrationOpen || totalMinor === null;

  return (
    <div className="flex min-h-screen flex-col bg-[#07101e]">
      <Header />

      {/* Fixed globe on the left, registration on the right. */}
      <section className="relative w-full overflow-hidden px-4 pb-20 pt-[340px] sm:px-8 sm:pt-[400px] lg:min-h-[calc(100vh-60px)] lg:px-6 lg:pb-24 lg:pt-[5px]">
        <div className="fixed inset-0 z-0 opacity-60">
          <HeroBackground align="left" desktopLift={-10} shrinkOnScroll richAtmosphere />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#0E1020]/20 to-[#0E1020]/50" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1240px] grid-cols-1 lg:grid-cols-12 lg:gap-8">
          <div className="hidden lg:block lg:col-span-5" />
          <div data-hero-content className="space-y-6 lg:col-span-7">
            {/* Form card */}
            <div className="overflow-hidden rounded-[4px] border border-gray-100 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              {/* Compact, unique form header. */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-[#0E1020] px-5 py-3">
                <div className="flex items-center gap-3">
                  <Image
                    src={SITE_CONFIG.logo.src}
                    alt="Horemow"
                    width={96}
                    height={30}
                    className="h-6 w-auto object-contain"
                    style={{ width: "auto" }}
                  />
                  <span className="h-5 w-px bg-white/20" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8EE3D6]">
                    Registration
                  </span>
                </div>

                <div className="flex items-center gap-1.5 rounded-full bg-white/10 p-1">
                  {CURRENCY_LIST.map((c) => {
                    const isAvailable = configState === "ready" && currencyAvailable[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={configState !== "ready"}
                        aria-pressed={currency === c}
                        onClick={() => {
                          setCurrency(c);
                          clearErr("customNairaAmount");
                        }}
                        className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                          currency === c
                            ? "bg-white text-[#0E1020] shadow-xs"
                            : configState !== "ready" || isAvailable
                              ? "text-white/60 hover:text-white"
                              : "cursor-not-allowed text-white/30 line-through"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#151829] px-5 py-2 sm:px-8">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8EE3D6]">
                  Conference starts in
                </span>
                <Countdown compact />
              </div>

              <div className="px-5 pb-4 pt-4 sm:px-8">
                <h1 className="text-xl font-extrabold leading-tight tracking-tight text-[#111320] sm:text-2xl">
                  Register For IHGC 2026
                </h1>
                <p className="mt-1.5 text-xs text-gray-500 sm:text-sm">
                  8 – 11 Dec 2026 <span className="mx-1.5 text-gray-300">•</span> Kwali, Abuja
                  <span className="mx-1.5 text-gray-300">•</span> Instant QR Ticket
                </p>
              </div>

            {/* Form body */}
            <form
              id="register-form"
              noValidate
              onSubmit={handleSubmit}
              className="space-y-8 p-6 sm:p-8 lg:p-10"
            >
              {/* Participant type */}
              <div>
                <div className="grid grid-cols-2 gap-3 rounded-[4px] bg-[#F3F4F6] p-1" role="group" aria-label="Registration type">
                  <button
                    type="button"
                    aria-pressed={!isGroup}
                    onClick={() => switchMode(false)}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-[4px] py-3 text-xs font-bold transition-all sm:text-sm ${
                      !isGroup ? "bg-white text-[#0E1020] shadow-2xs" : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Individual Participant</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={isGroup}
                    onClick={() => switchMode(true)}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-[4px] py-3 text-xs font-bold transition-all sm:text-sm ${
                      isGroup ? "bg-white text-[#0E1020] shadow-2xs" : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <UsersIcon className="h-4 w-4" />
                    <span>Group Participant</span>
                  </button>
                </div>

                {/* Group extra fields */}
                {isGroup && (
                  <div className="animate-in fade-in space-y-4 rounded-[16px] border border-[#CDEFEA] bg-[#EAF9F7] p-5 duration-200">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
                      Group Configuration
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field htmlFor="field-groupName" label="Chapter / Zone Name *" error={fieldErrors.groupName}>
                        <input
                          type="text"
                          placeholder="e.g. Horemow Lagos Central"
                          value={groupName}
                          onChange={(e) => {
                            setGroupName(e.target.value);
                            clearErr("groupName");
                          }}
                          {...fp("groupName")}
                        />
                      </Field>

                      <Field htmlFor="field-seats" label="Number of Paid Seats *" error={fieldErrors.seats}>
                        <input
                          type="number"
                          min={2}
                          max={500}
                          value={seatsInput}
                          onChange={(e) => {
                            setSeatsInput(e.target.value);
                            clearErr("seats");
                            clearErr("groupAttendance");
                            clearErr("genderCounts");
                            clearErr("firstTimeCounts");
                          }}
                          onBlur={() => {
                            const parsed = Number.parseInt(seatsInput, 10);
                            setSeatsInput(String(Math.min(500, Math.max(2, Number.isFinite(parsed) ? parsed : 2))));
                          }}
                          {...fp("seats")}
                        />
                      </Field>

                      <Field
                        htmlFor="field-inviteeCount"
                        label="Number of Invitees *"
                        error={fieldErrors.inviteeCount}
                        hint="People personally invited by the group leader. Counted within the paid seats."
                      >
                        <input
                          type="number"
                          min={0}
                          max={seatsCount}
                          value={inviteeCount}
                          onChange={(e) => {
                            setInviteeCount(e.target.value);
                            clearErr("inviteeCount");
                          }}
                          {...fp("inviteeCount")}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        htmlFor="field-genderCounts"
                        label="Male Count *"
                        error={fieldErrors.genderCounts}
                        hint="Include male children in this count."
                      >
                        <input
                          type="number"
                          min={0}
                          max={seatsCount}
                          value={genderCounts.male}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(seatsCount, Number.parseInt(e.target.value, 10) || 0));
                            setGenderCounts((prev) => ({ ...prev, male: value }));
                            clearErr("genderCounts");
                          }}
                          {...fp("genderCounts")}
                        />
                      </Field>
                      <Field htmlFor="field-genderCounts-female" label="Female Count *">
                        <input
                          id="field-genderCounts-female"
                          type="number"
                          min={0}
                          max={seatsCount}
                          value={genderCounts.female}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(seatsCount, Number.parseInt(e.target.value, 10) || 0));
                            setGenderCounts((prev) => ({ ...prev, female: value }));
                            clearErr("genderCounts");
                          }}
                          className={inputCls(Boolean(fieldErrors.genderCounts))}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        htmlFor="field-firstTimeCounts"
                        label="First Time — Yes *"
                        error={fieldErrors.firstTimeCounts}
                        hint="First time attending a conference in HOREMOW."
                      >
                        <input
                          type="number"
                          min={0}
                          max={seatsCount}
                          value={firstTimeCounts.yes}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(seatsCount, Number.parseInt(e.target.value, 10) || 0));
                            setFirstTimeCounts((prev) => ({ ...prev, yes: value }));
                            clearErr("firstTimeCounts");
                          }}
                          {...fp("firstTimeCounts")}
                        />
                      </Field>
                      <Field htmlFor="field-firstTimeCounts-no" label="First Time — No *">
                        <input
                          id="field-firstTimeCounts-no"
                          type="number"
                          min={0}
                          max={seatsCount}
                          value={firstTimeCounts.no}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(seatsCount, Number.parseInt(e.target.value, 10) || 0));
                            setFirstTimeCounts((prev) => ({ ...prev, no: value }));
                            clearErr("firstTimeCounts");
                          }}
                          className={inputCls(Boolean(fieldErrors.firstTimeCounts))}
                        />
                      </Field>
                    </div>

                    <div className="space-y-3 rounded-[12px] border border-[#CDEFEA] bg-white/70 p-4">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0E7A6E]">
                        <input
                          id="field-hasChildren"
                          type="checkbox"
                          checked={hasChildren}
                          aria-invalid={fieldErrors.hasChildren ? true : undefined}
                          aria-describedby={fieldErrors.hasChildren ? "field-hasChildren-error" : undefined}
                          onChange={(e) => {
                            setHasChildren(e.target.checked);
                            setChildCount(e.target.checked ? 1 : 0);
                            clearErr("hasChildren");
                            clearErr("childCount");
                          }}
                          className="rounded border-[#8EE3D6] text-[#0E7A6E] focus:ring-[#8EE3D6]"
                        />
                        Children are attending with the group
                      </label>
                      {fieldErrors.hasChildren && (
                        <p id="field-hasChildren-error" role="alert" className="text-[11px] font-medium text-red-600">
                          {fieldErrors.hasChildren}
                        </p>
                      )}
                      {hasChildren && (
                        <Field
                          htmlFor="field-childCount"
                          label="Number of Children *"
                          error={fieldErrors.childCount}
                          hint="Children are included in paid seats and in every count above."
                        >
                          <input
                            type="number"
                            min={1}
                            max={seatsCount}
                            value={childCount}
                            onChange={(e) => {
                              setChildCount(Math.max(0, Math.min(seatsCount, Number.parseInt(e.target.value, 10) || 0)));
                              clearErr("childCount");
                            }}
                            {...fp("childCount", "sm:max-w-xs")}
                          />
                        </Field>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isGroup && (
                <div className="space-y-4 border-t border-gray-100 pt-8">
                  <SectionTitle
                    title="Attendee details"
                    note="These answers are part of the paid registration record."
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field htmlFor="field-gender" label="Gender *" error={fieldErrors.gender}>
                      <div id="field-gender" className="grid grid-cols-2 gap-2" tabIndex={-1}>
                        {(["male", "female"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={gender === value}
                            onClick={() => {
                              setGender(value);
                              clearErr("gender");
                            }}
                            className={`cursor-pointer rounded-xl border px-3 py-3 text-xs font-bold transition-all ${
                              gender === value
                                ? "border-[#1FA396] bg-[#EAF9F7] text-[#0E7A6E] shadow-sm"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {value === "male" ? "Male" : "Female"}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field
                      htmlFor="field-firstTime"
                      label="Is it your first time attending a conference in HOREMOW? *"
                      error={fieldErrors.firstTime}
                    >
                      <div id="field-firstTime" className="grid grid-cols-2 gap-2" tabIndex={-1}>
                        {(["yes", "no"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={firstTime === value}
                            onClick={() => {
                              setFirstTime(value);
                              clearErr("firstTime");
                            }}
                            className={`cursor-pointer rounded-xl border px-3 py-3 text-xs font-bold transition-all ${
                              firstTime === value
                                ? "border-[#1FA396] bg-[#EAF9F7] text-[#0E7A6E] shadow-sm"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {value === "yes" ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
              )}

              {/* Contact information */}
              <div className="space-y-4 border-t border-gray-100 pt-8">
                <SectionTitle title={isGroup ? "Group leader details" : "Personal information"} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field htmlFor="field-payerName" label="Full Name *" error={fieldErrors.payerName}>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Brother / Sister Full Name"
                      value={payerName}
                      onChange={(e) => {
                        setPayerName(e.target.value);
                        clearErr("payerName");
                      }}
                      {...fp("payerName")}
                    />
                  </Field>

                  <Field htmlFor="field-payerPhone" label="Phone Number *" error={fieldErrors.payerPhone}>
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="+234 801 234 5678"
                      value={payerPhone}
                      onChange={(e) => {
                        setPayerPhone(e.target.value);
                        clearErr("payerPhone");
                      }}
                      {...fp("payerPhone")}
                    />
                  </Field>

                  <Field htmlFor="field-payerEmail" label="Email Address *" error={fieldErrors.payerEmail}>
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={payerEmail}
                      onChange={(e) => {
                        setPayerEmail(e.target.value);
                        clearErr("payerEmail");
                      }}
                      {...fp("payerEmail")}
                    />
                  </Field>

                  <Field htmlFor="field-country" label="Country of Residence *" error={fieldErrors.country}>
                    <input
                      type="text"
                      autoComplete="country-name"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        clearErr("country");
                        clearErr("state");
                      }}
                      {...fp("country")}
                    />
                  </Field>

                  {isNigeria && (
                    <>
                      <Field htmlFor="field-state" label="State of Residence *" error={fieldErrors.state}>
                        <input
                          type="text"
                          placeholder="e.g. FCT Abuja, Lagos"
                          value={state}
                          onChange={(e) => {
                            setState(e.target.value);
                            clearErr("state");
                          }}
                          {...fp("state")}
                        />
                      </Field>

                      <Field htmlFor="field-chapterZone" label="Chapter/Zone (Optional)">
                        <input
                          id="field-chapterZone"
                          type="text"
                          placeholder="e.g. Horemow Kwali Chapter"
                          value={chapterZone}
                          onChange={(e) => setChapterZone(e.target.value)}
                          className={inputCls(false)}
                        />
                      </Field>
                    </>
                  )}
                </div>

                {/* Minor checkbox */}
                {!isGroup && (
                  <div className="space-y-3 pt-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={isMinor}
                        onChange={(e) => {
                          setIsMinor(e.target.checked);
                          clearErr("guardianName");
                          clearErr("guardianPhone");
                        }}
                        className="rounded border-gray-300 text-[#0E1020] focus:ring-[#8EE3D6]"
                      />
                      <span>Participant is under 18 years of age</span>
                    </label>

                    {isMinor && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field
                          htmlFor="field-guardianName"
                          label="Parent / Guardian Name *"
                          error={fieldErrors.guardianName}
                        >
                          <input
                            type="text"
                            placeholder="Parent / Guardian Name"
                            value={guardianName}
                            onChange={(e) => {
                              setGuardianName(e.target.value);
                              clearErr("guardianName");
                            }}
                            {...fp("guardianName")}
                          />
                        </Field>
                        <Field
                          htmlFor="field-guardianPhone"
                          label="Parent / Guardian Phone *"
                          error={fieldErrors.guardianPhone}
                        >
                          <input
                            type="tel"
                            placeholder="Parent / Guardian Phone"
                            value={guardianPhone}
                            onChange={(e) => {
                              setGuardianPhone(e.target.value);
                              clearErr("guardianPhone");
                            }}
                            {...fp("guardianPhone")}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NGN contribution amount */}
              {currency === "NGN" && (
                <div className="space-y-3 border-t border-gray-100 pt-8">
                  <SectionTitle title="Contribution" />
                  <Field
                    htmlFor="field-customNairaAmount"
                    label={isGroup ? "Total Group Contribution (₦) *" : "Contribution Amount (₦) *"}
                    error={fieldErrors.customNairaAmount}
                    hint={`Minimum ${formatMoneyMinor(minimumNairaMinor, "NGN")} for ${effectiveSeats} ${
                      effectiveSeats === 1 ? "participant" : "participants"
                    }.`}
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      value={customNairaAmount}
                      onChange={(e) => {
                        setCustomNairaAmount(e.target.value);
                        clearErr("customNairaAmount");
                      }}
                      {...fp("customNairaAmount", "font-bold sm:max-w-xs")}
                    />
                  </Field>
                </div>
              )}

              {/* Attendance mode */}
              <div className="space-y-3 border-t border-gray-100 pt-8">
                {isGroup ? (
                  <>
                    <SectionTitle
                      title="How will the group attend? *"
                      note={`Enter a count for each mode. The counts must add up to all ${seatsCount} participants.`}
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {ATTENDANCE_OPTIONS.map(([key, label]) => {
                        const id = ATTENDANCE_IDS[key];
                        const bad = Boolean(fieldErrors.groupAttendance);
                        return (
                          <Field key={key} htmlFor={id} label={label}>
                            <input
                              id={id}
                              type="number"
                              min={0}
                              max={seatsCount}
                              value={groupAttendance[key]}
                              aria-invalid={bad ? true : undefined}
                              aria-describedby={bad ? "field-groupAttendance-error" : undefined}
                              onChange={(e) => {
                                setGroupAttendance({
                                  ...groupAttendance,
                                  [key]: Math.max(0, Math.min(seatsCount, parseInt(e.target.value, 10) || 0)),
                                });
                                clearErr("groupAttendance");
                              }}
                              className={inputCls(bad, "font-bold")}
                            />
                          </Field>
                        );
                      })}
                    </div>
                    {fieldErrors.groupAttendance ? (
                      <p
                        id="field-groupAttendance-error"
                        role="alert"
                        className="flex items-start gap-1.5 text-[11px] font-medium text-red-600"
                      >
                        <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
                        <span>{fieldErrors.groupAttendance}</span>
                      </p>
                    ) : (
                      <div className="text-xs text-gray-500">
                        Counted: <strong className="text-[#111320]">{groupAttendanceTotal}</strong> / {seatsCount}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <SectionTitle title="How will you attend? *" />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {ATTENDANCE_OPTIONS.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={attendanceMode === value}
                          onClick={() => setAttendanceMode(value)}
                          className={`cursor-pointer rounded-xl border px-3 py-3 text-xs font-bold transition-all ${
                            attendanceMode === value
                              ? "border-[#1FA396] bg-[#EAF9F7] text-[#0E7A6E] shadow-sm"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Consent */}
              <div className="space-y-2 border-t border-gray-100 pt-8">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-xs leading-snug transition-colors ${
                    fieldErrors.consent
                      ? "border-red-400 bg-red-50 text-red-800"
                      : "border-gray-200 bg-[#F9FAFB] text-gray-600"
                  }`}
                >
                  <input
                    id="field-consent"
                    type="checkbox"
                    checked={consent}
                    aria-invalid={fieldErrors.consent ? true : undefined}
                    aria-describedby={fieldErrors.consent ? "field-consent-error" : undefined}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      clearErr("consent");
                    }}
                    className="mt-0.5 rounded border-gray-300 text-[#0E1020] focus:ring-[#8EE3D6]"
                  />
                  <span>
                    I understand that registration fees are non-refundable. I consent to personal data processing
                    under the{" "}
                    <Link href="/privacy" className="font-semibold text-black underline">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms" className="font-semibold text-black underline">
                      Terms
                    </Link>
                    .
                  </span>
                </label>
                {fieldErrors.consent && (
                  <p
                    id="field-consent-error"
                    role="alert"
                    className="flex items-start gap-1.5 text-[11px] font-medium text-red-600"
                  >
                    <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.consent}</span>
                  </p>
                )}
              </div>

              {/* Turnstile */}
              {TURNSTILE_SITE_KEY && (
                <div className="space-y-2">
                  <div
                    id="field-turnstile"
                    ref={turnstileRef}
                    className={`min-h-[65px] rounded-lg ${fieldErrors.turnstile ? "ring-2 ring-red-300" : ""}`}
                  />
                  {fieldErrors.turnstile && (
                    <p role="alert" className="flex items-start gap-1.5 text-[11px] font-medium text-red-600">
                      <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.turnstile}</span>
                    </p>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Order summary (sticky on desktop) */}
          <aside>
            <div className="rounded-[4px] border border-gray-100 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:p-8 lg:sticky lg:top-24">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Order summary</h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Registration</dt>
                  <dd className="font-semibold text-[#111320]">{isGroup ? "Group" : "Individual"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">{effectiveSeats === 1 ? "Participant pass" : "Participant passes"}</dt>
                  <dd className="font-semibold text-[#111320]">{effectiveSeats}</dd>
                </div>
                {currency !== "NGN" && typeof unitMinor === "number" && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-gray-500">Price per pass</dt>
                    <dd className="font-semibold text-[#111320]">{formatMoneyMinor(unitMinor, currency)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Pay with</dt>
                  <dd className="font-semibold text-[#111320]">{checkoutProvider}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-end justify-between gap-4 border-t border-gray-100 pt-5">
                <span className="text-sm text-gray-500">Total ({currency})</span>
                <span className="text-3xl font-black tracking-tight text-[#111320]">{formattedTotal}</span>
              </div>

              <ul className="mt-5 space-y-2 text-xs text-gray-600">
                {PASS_BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[#1FA396]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Messages */}
              <div className="mt-6 space-y-3">
                {errorCount > 0 && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
                  >
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {errorCount === 1 ? "1 field needs" : `${errorCount} fields need`} your attention. Correct the
                      highlighted {errorCount === 1 ? "field" : "fields"} and try again.
                    </span>
                  </div>
                )}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
                  >
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {configState === "error" && (
                  <p role="alert" className="text-xs text-red-700">
                    Registration pricing could not be loaded.
                  </p>
                )}
                {configState === "ready" && !registrationOpen && (
                  <p role="status" className="text-xs text-amber-800">
                    Online registration is closed.
                  </p>
                )}
                {configState === "ready" && !currencyAvailable[currency] && (
                  <p role="status" className="text-xs text-amber-800">
                    Checkout is unavailable for {currency} right now.
                  </p>
                )}
              </div>

              <button
                type="submit"
                form="register-form"
                disabled={submitDisabled}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[#0E1020] px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-md transition-all duration-200 hover:bg-[#1A1D36] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LockIcon className="h-4 w-4 text-[#8EE3D6]" />
                <span>
                  {loading
                    ? "Initializing Secure Checkout..."
                    : totalMinor === null
                      ? "Loading price..."
                      : `Pay ${formattedTotal} via ${checkoutProvider}`}
                </span>
              </button>
            </div>
          </aside>
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}