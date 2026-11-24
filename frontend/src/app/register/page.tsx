"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Check, ChevronDown, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { COUNTRIES, NIGERIA, NIGERIAN_STATES } from "@/config/countries";
import { SupportedCurrency } from "@/config/currencies";

/* ---------- Design Tokens (Eyeballed & Tuned to Screenshots) ---------- */
// Primary emerald: #0F6E56 (hover #0D5E49)
// Page background: #F4F4F2
// Card surface: #FFFFFF, 1px border #E5E7EB, 24px radius, ~48-50px padding
// Chip background: #EEF4F1
// Text: Headings #111C18, Body/Labels #6B7280 & #374151
// Inputs & Buttons: 12px radius, 60px height

export type CurrencyConfig = {
  symbol: string;
  standard: number;
  min: number;
  quickPicks: number[];
  format: (amount: number) => string;
};

export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  NGN: {
    symbol: "₦",
    standard: 5000,
    min: 2000,
    quickPicks: [5000, 10000, 20000],
    format: (amt) => `₦${amt.toLocaleString()}`,
  },
  USD: {
    symbol: "$",
    standard: 20,
    min: 10,
    quickPicks: [20, 50, 100],
    format: (amt) => `$${amt.toLocaleString()}`,
  },
  EUR: {
    symbol: "€",
    standard: 20,
    min: 10,
    quickPicks: [20, 50, 100],
    format: (amt) => `€${amt.toLocaleString()}`,
  },
  GBP: {
    symbol: "£",
    standard: 20,
    min: 10,
    quickPicks: [20, 50, 100],
    format: (amt) => `£${amt.toLocaleString()}`,
  },
};

type FormState = {
  step: number;
  // Step 1: Category
  category: "individual" | "group";
  // Step 2: Role & Attendee Type
  role: "Brother" | "Sister";
  attendeeType: "Returning" | "First-time";
  groupName: string;
  seats: number;
  // Step 3: Contact Details
  country: string;
  state: string;
  fullName: string;
  whatsapp: string;
  // Step 4: Ministry Details & Attendance
  attendanceMode: "in_person" | "online" | "undecided";
  // Step 5: Payment
  currency: SupportedCurrency;
  amount: number;
  // Step 6: Review
  consent: boolean;
};

/* ---------- Reusable Component: <SummaryChip> ---------- */
function SummaryChip({
  text,
  onEdit,
}: {
  text: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-[#EEF4F1] rounded-[12px] mb-3 last:mb-6">
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <Check className="w-4 h-4 text-[#0F6E56] shrink-0 stroke-[2.5]" />
        <span className="text-[14px] font-medium text-[#111C18] truncate">
          {text}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-[14px] font-semibold text-[#0F6E56] hover:underline shrink-0 transition-colors"
      >
        Edit
      </button>
    </div>
  );
}

/* ---------- Reusable Component: <StepProgress> ---------- */
function StepProgress({ step }: { step: number }) {
  return (
    <div className="w-full mb-6" aria-label={`Step ${step} of 6`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[14px] font-semibold text-[#0F6E56]">
          Step {step} of 6
        </span>
        <span className="text-[14px] font-normal text-[#6B7280]">
          Registration
        </span>
      </div>
      <div className="grid grid-cols-6 gap-2 w-full">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`h-[4px] rounded-full transition-all duration-300 ${
              i <= step ? "bg-[#0F6E56]" : "bg-[#D1D5DB]"
            }`}
            aria-current={i === step ? "step" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Reusable Component: <Field> ---------- */
function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 w-full">
      <label
        htmlFor={htmlFor}
        className="block text-[14px] font-medium text-[#111C18]"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[13px] font-medium text-rose-600 flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/* ---------- Reusable Component: <RegistrationLayout> ---------- */
function RegistrationLayout({
  step,
  hintBelowCard,
  children,
}: {
  step: number;
  hintBelowCard?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2]">
      {/* 1. Main Website Navbar (kept as requested) */}
      <Header />

      {/* 2. Flow Header: white, ~96px tall, 1px bottom border */}
      <div className="w-full bg-white border-b border-[#E5E7EB] h-[80px] sm:h-[96px] flex items-center px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1360px] w-full mx-auto flex items-center justify-between">
          {/* Left: 40px green circle with white "IH", then "IHGC 2026" */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-bold text-sm shrink-0">
              IH
            </div>
            <span className="text-[17px] sm:text-[18px] font-semibold text-[#111C18] tracking-tight">
              IHGC 2026
            </span>
          </Link>

          {/* Right: muted text "Begins in 14 days" + green link "View schedule" */}
          <div className="flex items-center gap-3 sm:gap-4 text-[13px] sm:text-[14px]">
            <span className="text-[#6B7280]">Begins in 14 days</span>
            <Link
              href="/programme"
              className="font-medium text-[#0F6E56] hover:underline"
            >
              View schedule
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Centered Body: ~700px wide */}
      <main className="flex-1 py-10 sm:py-14 px-4 flex flex-col items-center justify-start">
        <div className="w-full max-w-[700px] flex flex-col items-center">
          {/* Progress Indicator */}
          <StepProgress step={step} />

          {/* White Card: 24px radius, 1px border, ~50px padding */}
          <div className="w-full bg-white border border-[#E5E7EB] rounded-[24px] p-6 sm:p-12 shadow-sm">
            {children}
          </div>

          {/* Hint Below Card */}
          {hintBelowCard && (
            <div className="mt-6 text-[13px] sm:text-[14px] text-[#6B7280] text-center">
              {hintBelowCard}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* =========================================================================
 * Main Component: RegisterPage (6-Step Registration Flow)
 * ========================================================================= */

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormState>({
    step: 3, // Initialized at Step 3 to match the primary screenshot, fully navigable 1-6
    category: "individual",
    role: "Brother",
    attendeeType: "Returning",
    groupName: "",
    seats: 1,
    country: "Nigeria",
    state: "Akwa Ibom",
    fullName: "",
    whatsapp: "",
    attendanceMode: "in_person",
    currency: "NGN",
    amount: 5000,
    consent: false,
  });

  const [customAmountText, setCustomAmountText] = useState("5,000");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currencyMeta = CURRENCY_CONFIG[formData.currency] || CURRENCY_CONFIG.NGN;
  const isNigeria = formData.country.toLowerCase() === "nigeria";

  // Keep amount synced with quick pick or custom text
  const handleAmountInputChange = (raw: string) => {
    // Strip non-digits
    const cleanDigits = raw.replace(/\D/g, "");
    const numeric = cleanDigits ? parseInt(cleanDigits, 10) : 0;
    setCustomAmountText(numeric > 0 ? numeric.toLocaleString() : "");
    setFormData((prev) => ({ ...prev, amount: numeric }));
    if (fieldErrors.amount) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.amount;
        return next;
      });
    }
  };

  const handleQuickPick = (pick: number) => {
    setCustomAmountText(pick.toLocaleString());
    setFormData((prev) => ({ ...prev, amount: pick }));
    if (fieldErrors.amount) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.amount;
        return next;
      });
    }
  };

  const handleCurrencyChange = (curr: SupportedCurrency) => {
    const meta = CURRENCY_CONFIG[curr];
    setFormData((prev) => ({
      ...prev,
      currency: curr,
      amount: meta.standard,
    }));
    setCustomAmountText(meta.standard.toLocaleString());
  };

  // Strip leading 0 from WhatsApp when country is Nigeria
  const handleWhatsAppChange = (val: string) => {
    let clean = val.replace(/[^\d\s-]/g, "");
    if (isNigeria && clean.startsWith("0")) {
      clean = clean.replace(/^0+/, "");
    }
    setFormData((prev) => ({ ...prev, whatsapp: clean }));
    if (fieldErrors.whatsapp) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.whatsapp;
        return next;
      });
    }
  };

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.category) errors.category = "Please select a category.";
    } else if (currentStep === 2) {
      if (formData.category === "group") {
        if (!formData.groupName.trim())
          errors.groupName = "Enter your group or chapter name.";
        if (formData.seats < 2)
          errors.seats = "Group must have at least 2 participants.";
      }
    } else if (currentStep === 3) {
      if (!formData.country.trim()) errors.country = "Select your country.";
      if (!formData.state.trim()) errors.state = "Provide your state or region.";
      if (!formData.fullName.trim()) errors.fullName = "Enter your full name.";
      if (!formData.whatsapp.trim() || formData.whatsapp.replace(/\D/g, "").length < 7) {
        errors.whatsapp = "Enter a valid WhatsApp phone number.";
      }
    } else if (currentStep === 4) {
      if (!formData.attendanceMode)
        errors.attendanceMode = "Please select your attendance mode.";
    } else if (currentStep === 5) {
      if (formData.amount < currencyMeta.min) {
        errors.amount = `Minimum registration amount is ${currencyMeta.format(
          currencyMeta.min
        )}.`;
      }
    } else if (currentStep === 6) {
      if (!formData.consent) {
        errors.consent = "You must confirm and accept the terms to proceed.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(formData.step)) {
      setFormData((prev) => ({
        ...prev,
        step: Math.min(6, prev.step + 1),
      }));
    }
  };

  const prevStep = () => {
    setFormData((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1),
    }));
  };

  const jumpToStep = (targetStep: number) => {
    setFormData((prev) => ({ ...prev, step: targetStep }));
  };

  // Stub function as explicitly requested: "Step 6's 'Pay' should call a stub function initPaystack(payload) that I'll wire up later. Don't implement the Paystack integration yet."
  const initPaystack = (payload: unknown) => {
    console.log("Paystack init stub called with payload:", payload);
    alert(
      `Paystack stub called: Ready to pay ${currencyMeta.format(
        formData.amount
      )}. (Stub ready for live wiring)`
    );
  };

  /* -----------------------------------------------------------------------
   * STEP 1: Registration Category (Scaffolded Placeholder)
   * ----------------------------------------------------------------------- */
  if (formData.step === 1) {
    return (
      <RegistrationLayout
        step={1}
        hintBelowCard="Next: About you & role"
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-[30px] sm:text-[34px] font-bold text-[#111C18] tracking-tight">
              Registration category
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#6B7280] mt-1.5">
              Select how you will be attending IHGC 2026.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {[
              {
                id: "individual",
                title: "Individual pass",
                desc: "Registering for myself as a single attendee.",
              },
              {
                id: "group",
                title: "Group delegation",
                desc: "Registering multiple participants for a church branch or zone.",
              },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    category: cat.id as "individual" | "group",
                  }))
                }
                className={`w-full text-left p-5 rounded-[12px] border transition-all ${
                  formData.category === cat.id
                    ? "border-[#0F6E56] bg-[#EEF4F1]/60 ring-2 ring-[#0F6E56]/15"
                    : "border-[#D1D5DB] hover:border-gray-400 bg-white"
                }`}
              >
                <div className="font-semibold text-[16px] text-[#111C18]">
                  {cat.title}
                </div>
                <div className="text-[13px] text-[#6B7280] mt-0.5">
                  {cat.desc}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
            <Link
              href="/"
              className="text-[14px] font-semibold text-[#111C18] hover:text-black py-3 px-1"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={nextStep}
              className="h-[60px] px-8 rounded-[12px] bg-[#0F6E56] text-white font-bold text-[16px] hover:bg-[#0D5E49] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </RegistrationLayout>
    );
  }

  /* -----------------------------------------------------------------------
   * STEP 2: About You / Role (Scaffolded Placeholder)
   * ----------------------------------------------------------------------- */
  if (formData.step === 2) {
    return (
      <RegistrationLayout
        step={2}
        hintBelowCard="Next: Your contact details"
      >
        <div className="space-y-6">
          <SummaryChip
            text={
              formData.category === "group"
                ? "Group delegation"
                : "Individual pass"
            }
            onEdit={() => jumpToStep(1)}
          />

          <div>
            <h1 className="text-[30px] sm:text-[34px] font-bold text-[#111C18] tracking-tight">
              About you
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#6B7280] mt-1.5">
              Specify your title and attendance background.
            </p>
          </div>

          {formData.category === "individual" ? (
            <div className="space-y-6 pt-2">
              <Field label="Title / Gender" htmlFor="role-select">
                <div className="grid grid-cols-2 gap-3">
                  {(["Brother", "Sister"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: r }))}
                      className={`h-[60px] rounded-[12px] font-semibold text-[15px] border transition-all ${
                        formData.role === r
                          ? "bg-[#0F6E56] text-white border-[#0F6E56]"
                          : "bg-white border-[#D1D5DB] text-[#111C18] hover:border-gray-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Attendance history" htmlFor="history-select">
                <div className="grid grid-cols-2 gap-3">
                  {(["Returning", "First-time"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, attendeeType: t }))
                      }
                      className={`h-[60px] rounded-[12px] font-semibold text-[15px] border transition-all ${
                        formData.attendeeType === t
                          ? "bg-[#0F6E56] text-white border-[#0F6E56]"
                          : "bg-white border-[#D1D5DB] text-[#111C18] hover:border-gray-400"
                      }`}
                    >
                      {t} attendee
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <Field
                label="Chapter / Branch name"
                htmlFor="group-name"
                error={fieldErrors.groupName}
              >
                <input
                  id="group-name"
                  type="text"
                  placeholder="e.g. Horemow Lagos Central"
                  value={formData.groupName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      groupName: e.target.value,
                    }))
                  }
                  className="w-full h-[60px] px-4 rounded-[12px] border border-[#D1D5DB] text-[#111C18] text-[16px] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all"
                />
              </Field>

              <Field
                label="Number of participants"
                htmlFor="seats-count"
                error={fieldErrors.seats}
              >
                <input
                  id="seats-count"
                  type="number"
                  min={2}
                  max={500}
                  value={formData.seats || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      seats: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full h-[60px] px-4 rounded-[12px] border border-[#D1D5DB] text-[#111C18] text-[16px] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all"
                />
              </Field>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={prevStep}
              className="text-[14px] font-semibold text-[#111C18] hover:text-black py-3 px-1"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="h-[60px] px-8 rounded-[12px] bg-[#0F6E56] text-white font-bold text-[16px] hover:bg-[#0D5E49] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </RegistrationLayout>
    );
  }

  /* -----------------------------------------------------------------------
   * STEP 3: "Your contact details" (PIXEL-FAITHFUL TO form (1).jpeg)
   * ----------------------------------------------------------------------- */
  if (formData.step === 3) {
    const summaryText =
      formData.category === "group"
        ? `Group delegation · ${formData.groupName || "Branch"} · ${formData.seats} attendees`
        : `Individual pass · ${formData.role} · ${formData.attendeeType} attendee`;

    return (
      <RegistrationLayout
        step={3}
        hintBelowCard="Next: Ministry details"
      >
        <div className="space-y-6">
          {/* Summary Chip */}
          <SummaryChip text={summaryText} onEdit={() => jumpToStep(2)} />

          {/* Heading & Subtitle */}
          <div>
            <h1 className="text-[30px] sm:text-[34px] font-bold text-[#111C18] tracking-tight">
              Your contact details
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#6B7280] mt-1.5">
              Your digital pass and check-in barcode will be sent here.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {/* Field: Country of residence */}
            <Field
              label="Country of residence"
              htmlFor="field-country"
              error={fieldErrors.country}
            >
              <div className="relative">
                <select
                  id="field-country"
                  value={formData.country}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    const nextIsNigeria = nextCountry.toLowerCase() === "nigeria";
                    setFormData((prev) => ({
                      ...prev,
                      country: nextCountry,
                      state: nextIsNigeria ? "Akwa Ibom" : "",
                    }));
                  }}
                  className="w-full h-[60px] px-4 pr-10 rounded-[12px] border border-[#D1D5DB] text-[#111C18] text-[16px] bg-white appearance-none focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </Field>

            {/* Field: State of residence (Option select for Nigeria, text for others) */}
            <Field
              label="State of residence"
              htmlFor="field-state"
              error={fieldErrors.state}
            >
              {isNigeria ? (
                <div className="relative">
                  <select
                    id="field-state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className="w-full h-[60px] px-4 pr-10 rounded-[12px] border border-[#D1D5DB] text-[#111C18] text-[16px] bg-white appearance-none focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all cursor-pointer"
                  >
                    <option value="">Select a Nigerian state</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <input
                  id="field-state"
                  type="text"
                  placeholder="e.g. California, Ontario, London"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                  className="w-full h-[60px] px-4 rounded-[12px] border border-[#D1D5DB] text-[#111C18] text-[16px] bg-white focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all"
                />
              )}
            </Field>

            {/* Field: Full name */}
            <Field
              label="Full name"
              htmlFor="field-name"
              error={fieldErrors.fullName}
            >
              <input
                id="field-name"
                type="text"
                placeholder="e.g. Bro. John Doe"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                }
                className="w-full h-[60px] px-4 rounded-[12px] border border-[#D1D5DB] text-[#111C18] text-[16px] bg-white placeholder:text-gray-400 focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all"
              />
            </Field>

            {/* Field: WhatsApp number with gray left addon */}
            <Field
              label="WhatsApp number"
              htmlFor="field-whatsapp"
              error={fieldErrors.whatsapp}
            >
              <div className="flex h-[60px] w-full rounded-[12px] border border-[#D1D5DB] overflow-hidden focus-within:border-[#0F6E56] focus-within:ring-2 focus-within:ring-[#0F6E56]/20 transition-all">
                <div className="w-[80px] bg-[#F4F4F2] border-r border-[#D1D5DB] flex items-center justify-center text-[15px] sm:text-[16px] font-medium text-[#111C18] shrink-0 select-none">
                  {isNigeria ? "+234" : "+"}
                </div>
                <input
                  id="field-whatsapp"
                  type="tel"
                  placeholder="801 234 5678"
                  value={formData.whatsapp}
                  onChange={(e) => handleWhatsAppChange(e.target.value)}
                  className="flex-1 px-4 h-full text-[16px] text-[#111C18] placeholder:text-gray-400 bg-white focus:outline-none"
                />
              </div>
            </Field>
          </div>

          {/* Footer row: Back on left, green Continue button on right */}
          <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={prevStep}
              className="text-[14px] font-semibold text-[#111C18] hover:text-black py-3 px-1 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="h-[60px] px-8 rounded-[12px] bg-[#0F6E56] text-white font-bold text-[16px] hover:bg-[#0D5E49] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </RegistrationLayout>
    );
  }

  /* -----------------------------------------------------------------------
   * STEP 4: "Ministry details & Attendance" (Scaffolded Placeholder)
   * ----------------------------------------------------------------------- */
  if (formData.step === 4) {
    return (
      <RegistrationLayout
        step={4}
        hintBelowCard="Next: Payment"
      >
        <div className="space-y-6">
          <SummaryChip
            text={`Individual pass · ${formData.role} · ${formData.attendeeType}`}
            onEdit={() => jumpToStep(2)}
          />

          <div>
            <h1 className="text-[30px] sm:text-[34px] font-bold text-[#111C18] tracking-tight">
              Ministry details
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#6B7280] mt-1.5">
              Select your attendance mode and camp accommodation.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            <Field
              label="Attendance mode"
              htmlFor="attendance-mode"
              error={fieldErrors.attendanceMode}
            >
              <div className="space-y-3">
                {[
                  {
                    id: "in_person",
                    label: "Attending in person",
                    sub: "Holiness Campground, Kwali, Abuja",
                  },
                  {
                    id: "online",
                    label: "Attending online",
                    sub: "Live streaming worldwide",
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        attendanceMode: m.id as "in_person" | "online",
                      }))
                    }
                    className={`w-full text-left p-5 rounded-[12px] border transition-all ${
                      formData.attendanceMode === m.id
                        ? "border-[#0F6E56] bg-[#EEF4F1]/60 ring-2 ring-[#0F6E56]/15"
                        : "border-[#D1D5DB] hover:border-gray-400 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-[16px] text-[#111C18]">
                      {m.label}
                    </div>
                    <div className="text-[13px] text-[#6B7280] mt-0.5">
                      {m.sub}
                    </div>
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={prevStep}
              className="text-[14px] font-semibold text-[#111C18] hover:text-black py-3 px-1"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="h-[60px] px-8 rounded-[12px] bg-[#0F6E56] text-white font-bold text-[16px] hover:bg-[#0D5E49] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </RegistrationLayout>
    );
  }

  /* -----------------------------------------------------------------------
   * STEP 5: "Payment" (PIXEL-FAITHFUL TO form (3).jpeg)
   * ----------------------------------------------------------------------- */
  if (formData.step === 5) {
    const attendanceLabel =
      formData.attendanceMode === "in_person"
        ? "Attending in person"
        : "Attending online";

    return (
      <RegistrationLayout
        step={5}
        hintBelowCard="Next: Review and pay"
      >
        <div className="space-y-6">
          {/* Two Stacked Summary Chips */}
          <div>
            <SummaryChip
              text={`Individual pass · ${formData.role} · ${formData.attendeeType}`}
              onEdit={() => jumpToStep(2)}
            />
            <SummaryChip
              text={attendanceLabel}
              onEdit={() => jumpToStep(4)}
            />
          </div>

          {/* Heading & Subtitle */}
          <div>
            <h1 className="text-[30px] sm:text-[34px] font-bold text-[#111C18] tracking-tight">
              Payment
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#6B7280] mt-1.5">
              Choose your currency and registration amount.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {/* Label: Currency */}
            <div className="space-y-2">
              <label className="block text-[14px] font-medium text-[#111C18]">
                Currency
              </label>
              <div className="flex items-center gap-3">
                {(["NGN", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((c) => {
                  const isSelected = formData.currency === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCurrencyChange(c)}
                      className={`h-[50px] w-[72px] sm:w-[76px] rounded-[12px] font-semibold text-[15px] transition-all flex items-center justify-center ${
                        isSelected
                          ? "bg-[#0F6E56] text-white font-bold shadow-sm"
                          : "bg-white border border-[#D1D5DB] text-[#374151] hover:border-gray-400"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Label: Registration amount */}
            <Field
              label="Registration amount"
              htmlFor="field-amount"
              error={fieldErrors.amount}
            >
              <div className="flex h-[60px] w-full rounded-[12px] border border-[#D1D5DB] overflow-hidden focus-within:border-[#0F6E56] focus-within:ring-2 focus-within:ring-[#0F6E56]/20 transition-all">
                <div className="w-[50px] bg-[#F4F4F2] border-r border-[#D1D5DB] flex items-center justify-center text-[18px] font-bold text-[#111C18] shrink-0 select-none">
                  {currencyMeta.symbol}
                </div>
                <input
                  id="field-amount"
                  type="text"
                  inputMode="numeric"
                  value={customAmountText}
                  onChange={(e) => handleAmountInputChange(e.target.value)}
                  className="flex-1 px-4 h-full text-[18px] sm:text-[20px] font-bold text-[#111C18] bg-white focus:outline-none"
                />
              </div>
              <p className="text-[12px] sm:text-[13px] text-[#6B7280] mt-1.5">
                Standard fee is {currencyMeta.format(currencyMeta.standard)}. Minimum is{" "}
                {currencyMeta.format(currencyMeta.min)}.
              </p>
            </Field>

            {/* Quick-pick chips */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {currencyMeta.quickPicks.map((pick) => {
                const isSelected = formData.amount === pick;
                return (
                  <button
                    key={pick}
                    type="button"
                    onClick={() => handleQuickPick(pick)}
                    className={`h-[46px] px-5 rounded-[12px] text-[14px] font-bold transition-all ${
                      isSelected
                        ? "bg-[#0F6E56] text-white shadow-sm"
                        : "bg-white border border-[#D1D5DB] text-[#374151] hover:border-gray-400"
                    }`}
                  >
                    {currencyMeta.format(pick)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={prevStep}
              className="text-[14px] font-semibold text-[#111C18] hover:text-black py-3 px-1 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="h-[60px] px-8 rounded-[12px] bg-[#0F6E56] text-white font-bold text-[16px] hover:bg-[#0D5E49] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </RegistrationLayout>
    );
  }

  /* -----------------------------------------------------------------------
   * STEP 6: "Review and confirm" (PIXEL-FAITHFUL TO form (2).jpeg)
   * ----------------------------------------------------------------------- */
  return (
    <RegistrationLayout
      step={6}
      hintBelowCard={
        <div className="flex items-center justify-center gap-1.5 text-[12px] sm:text-[13px] text-[#6B7280]">
          <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>256-bit SSL encrypted checkout · Paystack certified</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Title & Subtitle (No summary chips on this step as per screenshot) */}
        <div>
          <h1 className="text-[30px] sm:text-[34px] font-bold text-[#111C18] tracking-tight">
            Review and confirm
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#6B7280] mt-1.5">
            Check your details before the secure Paystack checkout.
          </p>
        </div>

        {/* Key/Value Rows with 1px dividers */}
        <div className="divide-y divide-[#E5E7EB] pt-2">
          <div className="py-3.5 flex items-center justify-between text-[15px]">
            <span className="text-[#6B7280]">Category</span>
            <span className="font-bold text-[#111C18]">
              {formData.category === "group"
                ? "Group delegation"
                : "Individual pass"}
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between text-[15px]">
            <span className="text-[#6B7280]">Participants</span>
            <span className="font-bold text-[#111C18]">
              {formData.category === "group"
                ? `${formData.seats} attendees`
                : "1 attendee"}
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between text-[15px]">
            <span className="text-[#6B7280]">Attendance</span>
            <span className="font-bold text-[#111C18]">
              {formData.attendanceMode === "in_person"
                ? "In person, Kwali Camp"
                : "Online live stream"}
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between text-[15px]">
            <span className="text-[#6B7280]">Location</span>
            <span className="font-bold text-[#111C18]">
              {formData.country}
              {formData.state ? `, ${formData.state}` : ""}
            </span>
          </div>
        </div>

        {/* Total Payable Row */}
        <div className="pt-4 pb-2 flex items-baseline justify-between border-t border-[#E5E7EB]">
          <div>
            <div className="text-[17px] sm:text-[18px] font-bold text-[#111C18]">
              Total payable
            </div>
            <div className="text-[12px] sm:text-[13px] text-[#6B7280] mt-0.5">
              Includes all event materials and pass
            </div>
          </div>
          <div className="text-[34px] sm:text-[40px] font-extrabold text-[#111C18] tracking-tight">
            {currencyMeta.format(formData.amount)}
          </div>
        </div>

        {/* Checkbox Row: ONE normal inline paragraph with underlined green links */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.consent}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, consent: e.target.checked }));
                if (fieldErrors.consent) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.consent;
                    return next;
                  });
                }
              }}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#0F6E56] focus:ring-[#0F6E56] accent-[#0F6E56]"
            />
            <span className="text-[13px] sm:text-[14px] text-[#6B7280] leading-relaxed">
              I confirm my information is correct. I understand fees are
              non-refundable and accept the{" "}
              <Link
                href="/privacy"
                className="text-[#0F6E56] underline font-medium hover:text-[#0D5E49]"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="text-[#0F6E56] underline font-medium hover:text-[#0D5E49]"
              >
                Terms of Service
              </Link>
              .
            </span>
          </label>
          {fieldErrors.consent && (
            <p className="text-[13px] font-medium text-rose-600 flex items-center gap-1.5 mt-2 pl-8">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.consent}</span>
            </p>
          )}
        </div>

        {/* Footer row: Back on left, Pay button on right */}
        <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={prevStep}
            className="text-[14px] font-semibold text-[#111C18] hover:text-black py-3 px-1 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!formData.consent}
            onClick={() => {
              if (validateStep(6)) {
                initPaystack({
                  category: formData.category,
                  role: formData.role,
                  attendeeType: formData.attendeeType,
                  fullName: formData.fullName,
                  email: "",
                  whatsapp: formData.whatsapp,
                  country: formData.country,
                  state: formData.state,
                  attendanceMode: formData.attendanceMode,
                  currency: formData.currency,
                  amount: formData.amount,
                });
              }
            }}
            className="h-[60px] px-8 rounded-[12px] bg-[#0F6E56] text-white font-bold text-[16px] hover:bg-[#0D5E49] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
          >
            Pay {currencyMeta.format(formData.amount)} with Paystack
          </button>
        </div>
      </div>
    </RegistrationLayout>
  );
}
