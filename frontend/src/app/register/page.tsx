"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/marketing/header";
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

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const CURRENCY_LIST: SupportedCurrency[] = ["NGN", "USD", "EUR", "GBP"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INITIAL_PHONE = "+234 ";
const MIN_NGN_PER_PASS_MINOR = 200_000;
// Old versions saved drafts here. Nothing is saved any more; the key is purged on load.
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

// Same order as the fields appear on the page, so we focus the topmost problem.
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
  ["physically", "Physically"],
  ["online", "Online"],
  ["not_sure", "Not sure"],
] as const;

const ATTENDANCE_IDS = {
  physically: "field-groupAttendance",
  online: "field-attendance-online",
  not_sure: "field-attendance-not-sure",
} as const;

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

/* ---------- Design tokens + component styles ----------
 * Shares the landing page's navy surface, mint accents and restrained type.
 * The registration card stays white so the form remains calm and readable,
 * while everything around it uses the same premium site language.
 *   640px  tablet   (two-column fields)
 *   1280px desktop  (info panel beside the form)
 * Scoped to .r-root so nothing leaks to the site header or footer.
 */
const STYLES = `
.r-root{
  --r-card:#ffffff; --r-subtle:#F4FAF8; --r-tint:#E6F6F2;
  --r-border:#DCE8E5; --r-border-strong:#BCCFCA; --r-border-hover:#8FA9A3;
  --r-text:#0E1626; --r-muted:#4B5767; --r-faint:#6B7686;
  --r-primary:#0E7A6E; --r-primary-hover:#0B655B; --r-on-primary:#ffffff; --r-brand-text:#0B6B60;
  --r-active:#0B2F43; --r-active-soft:#E8F0F4; --r-active-ring:rgba(11,47,67,.3);
  --r-ring:rgba(14,122,110,.28);
  --r-danger:#B42318; --r-danger-bg:#FEF3F2; --r-danger-border:#F1A9A2;
  --r-success:#0B6B60; --r-warn:#8A4B08; --r-warn-bg:#FFF6E5; --r-warn-border:#F2CC8F;
  --r-navy:#07101E; --r-navy-2:#0B1B2B; --r-mint:#8EE3D6;
  --r-pad:16px; --r-h:46px; --r-fs:16px; --r-radius:10px;
  --r-header-h:60px;
  position:relative;
  isolation:isolate;
  color-scheme:light;
  color:var(--r-text);
  font-family:inherit;
  background-color:#07101e;
  background-image:
    linear-gradient(180deg,rgba(5,10,20,.96) 0%,rgba(7,16,30,.92) 16%,rgba(7,16,30,.78) 55%,rgba(5,10,20,.96) 100%),
    radial-gradient(circle at 82% 24%,rgba(14,122,110,.18),transparent 34%),
    radial-gradient(circle at 12% 72%,rgba(32,78,110,.16),transparent 38%);
  box-shadow:inset 0 0 180px rgba(0,0,0,.35);
}
/* Same fixed star texture as the landing, kept behind the form surface. */
.r-root::before{
  content:''; position:fixed; inset:-12%; z-index:0; pointer-events:none;
  opacity:.38;
  background-image:
    radial-gradient(circle,rgba(142,227,214,.85) 0 .8px,transparent 1.2px),
    radial-gradient(circle,rgba(255,255,255,.6) 0 .6px,transparent 1px),
    radial-gradient(circle,rgba(127,182,217,.5) 0 .7px,transparent 1.1px);
  background-size:173px 173px,241px 241px,311px 311px;
  background-position:31px 47px,118px 83px,73px 193px;
  animation:r-stars 64s ease-in-out infinite;
}
@keyframes r-stars{ 0%,100%{ transform:translate3d(0,0,0); opacity:.34; } 50%{ transform:translate3d(1.4%,-1.1%,0); opacity:.5; } }
/* A whisper of the landing hero imagery, kept behind the form surface. */
.r-root::after{ content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
  background:linear-gradient(180deg,rgba(7,16,30,.45),rgba(7,16,30,.82)),url('/images/crowd-bw_3.jpg') center/cover no-repeat;
  opacity:.16; mix-blend-mode:screen; }
@media (prefers-reduced-motion:reduce){ .r-root::before{ animation:none; } }
@media (min-width:640px){ .r-root{ --r-pad:28px; --r-h:44px; } }
@media (min-width:1024px){ .r-root{ --r-pad:32px; } }

.r-root *, .r-root *::before, .r-root *::after{ box-sizing:border-box; }
.r-root button, .r-root input{ font-family:inherit; }
.r-root h1, .r-root h2, .r-title, .r-step-title, .r-side-title{ font-family:var(--font-heading, inherit); }
.r-root button:focus-visible, .r-consent input:focus-visible{ outline:2px solid var(--r-primary); outline-offset:2px; }

/* Page layout */
.r-page{ position:relative; z-index:1; flex:1 1 auto; width:100%; padding:16px 12px 36px; }
.r-layout{ display:grid; grid-template-columns:minmax(0,1fr); gap:24px; width:100%; max-width:760px; margin:0 auto; }
@media (min-width:640px){ .r-page{ padding:24px 20px 52px; } }
@media (min-width:1280px){
  .r-page{ padding:32px 28px 60px; }
  .r-layout{ max-width:1240px; grid-template-columns:minmax(0,1fr) minmax(0,720px); align-items:start; }
}

/* Conference intro panel: compact above the form on mobile, sticky beside it on desktop */
.r-side{
  display:flex; color:#fff; border-radius:6px; overflow:hidden;
  background:linear-gradient(160deg,rgba(14,22,38,.96) 0%,rgba(7,16,30,.98) 100%);
  border:1px solid rgba(142,227,214,.22);
  box-shadow:0 30px 80px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.05);
}
.r-side-inner{ margin:0; width:100%; padding:20px 18px; text-align:center; }
.r-side-logo{ display:block; width:auto; height:30px; margin:0 auto 12px; object-fit:contain; filter:drop-shadow(0 6px 16px rgba(0,0,0,.35)); }
/* Below 1280px the countdown lives in the sticky form header; on wide screens
   the sidebar is the only header, so it keeps its countdown there. */
.r-side-label{ display:none; font-size:10px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--r-mint); }
.r-side-clock{ display:none; margin-top:10px; padding:8px 12px; border-radius:6px; background:rgba(5,10,20,.6); box-shadow:0 0 0 1px rgba(142,227,214,.16); }
@media (min-width:1280px){ .r-side-label{ display:block; } .r-side-clock{ display:inline-block; } }
.r-side-title{ margin-top:12px; font-size:18px; font-weight:800; line-height:1.2; letter-spacing:-.01em; }
.r-side-lead{ margin:8px auto 0; max-width:310px; font-size:13px; line-height:1.55; color:rgba(255,255,255,.72); }
.r-side-steps{ display:none; }
.r-side-steps li{ display:flex; gap:14px; }
.r-side-steps li + li{ margin-top:18px; }
.r-side-num{ flex:none; display:grid; place-items:center; width:27px; height:27px; border-radius:999px; font-size:12px; font-weight:800; color:var(--r-navy); background:var(--r-mint); box-shadow:0 0 18px rgba(142,227,214,.28); }
.r-side-steps b{ display:block; font-size:14px; font-weight:700; letter-spacing:-.01em; }
.r-side-steps span span{ display:block; margin-top:3px; font-size:13px; line-height:1.5; color:rgba(255,255,255,.66); }
@media (min-width:640px){
  .r-side-inner{ padding:26px 24px; }
  .r-side-title{ font-size:20px; }
  .r-side-lead{ font-size:14px; }
  .r-side-steps{ display:inline-block; margin-top:20px; padding:0; list-style:none; text-align:left; }
}
@media (min-width:1280px){
  .r-side{
    position:sticky; top:calc(var(--r-header-h) + 28px);
    height:calc(100vh - var(--r-header-h) - 56px); min-height:480px; overflow-y:auto; scrollbar-width:none;
  }
  .r-side::-webkit-scrollbar{ display:none; }
  .r-side-inner{ margin:auto; max-width:400px; padding:40px 32px; }
  .r-side-steps{ margin-top:30px; }
}
@media (max-height:700px){ .r-side-lead{ display:none; } }

/* Card */
.r-card{
  color-scheme:light;
  color:var(--r-text);
  background:#fff;
  border:1px solid rgba(142,227,214,.32);
  border-radius:6px;
  box-shadow:0 30px 80px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.9);
  overflow:clip;
}

/* Sticky header + progress (below desktop) */
.r-head{ position:sticky; top:var(--r-header-h); z-index:20; background:var(--r-navy); color:#fff; }
.r-head-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:44px; padding:4px var(--r-pad); }
.r-head-steps{ font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--r-mint); white-space:nowrap; }
.r-head-brand{ display:none; align-items:center; gap:12px; min-width:0; }
.r-head-sep{ width:1px; height:18px; background:rgba(255,255,255,.2); }
.r-head-tag{ font-size:11px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--r-mint); }
.r-head-clock{ display:flex; align-items:center; gap:8px; font-size:11.5px; font-variant-numeric:tabular-nums; color:rgba(255,255,255,.78); white-space:nowrap; }
.r-progress{ height:3px; background:rgba(255,255,255,.14); }
.r-progress span{ display:block; height:100%; background:var(--r-mint); transition:width .35s ease; }
@media (min-width:640px){ .r-head-row{ min-height:52px; } .r-head-brand{ display:flex; } .r-head-steps{ display:none; } }
@media (min-width:1280px){ .r-head{ display:none; } }

/* Steps */
.r-form{ padding:0 var(--r-pad); }
.r-step{ padding:24px 0; border-top:1px solid var(--r-border); }
.r-step-head{ margin-bottom:16px; }
.r-step-top{ display:flex; align-items:center; gap:10px; }
.r-badge{ flex:none; width:28px; height:28px; border-radius:999px; display:grid; place-items:center; font-size:12.5px; font-weight:700; background:var(--r-tint); color:var(--r-brand-text); border:1.5px solid var(--r-primary); transition:background .2s,color .2s; }
.r-badge[data-done=true]{ background:var(--r-active); color:var(--r-on-primary); }
.r-badge svg{ width:14px; height:14px; }
.r-step-title{ flex:1; min-width:0; font-size:17px; font-weight:750; line-height:1.3; letter-spacing:-.01em; }
.r-step-tag{ flex:none; font-size:12px; color:var(--r-faint); }
.r-step-tag[data-done=true]{ color:var(--r-active); font-weight:700; }
@media (max-width:379px){ .r-step-tag{ display:none; } }
.r-step-note{ margin:6px 0 0 38px; font-size:13.5px; line-height:1.5; color:var(--r-muted); }

.r-grid{ display:grid; gap:16px; grid-template-columns:minmax(0,1fr); }
@media (min-width:560px){
  .r-grid--2{ grid-template-columns:repeat(2,minmax(0,1fr)); }
  .r-grid--3{ grid-template-columns:repeat(3,minmax(0,1fr)); }
  .r-span2{ grid-column:span 2; }
}

/* Fields */
.r-field{ display:flex; flex-direction:column; gap:6px; min-width:0; }
.r-label{ font-size:13.5px; font-weight:600; line-height:1.35; }
.r-hint{ font-size:12.5px; line-height:1.4; color:var(--r-muted); }
.r-error{ display:flex; gap:6px; align-items:flex-start; font-size:12.5px; font-weight:500; line-height:1.4; color:var(--r-danger); }
.r-error svg{ width:14px; height:14px; flex:none; margin-top:1px; }
.r-wrap{ position:relative; }
.r-narrow{ max-width:280px; }

.r-input{ width:100%; min-height:var(--r-h); padding:8px 12px; font:inherit; font-size:var(--r-fs); line-height:1.3; color:var(--r-text); background:#fff; border:1px solid var(--r-border-strong); border-radius:var(--r-radius); appearance:none; transition:border-color .15s, box-shadow .15s, background .15s; }
.r-input::placeholder{ color:var(--r-faint); }
.r-input:hover:not(:disabled):not(:focus-visible):not([aria-invalid=true]){ border-color:var(--r-border-hover); }
.r-input:focus-visible{ outline:none; border-color:var(--r-primary); box-shadow:0 0 0 3px var(--r-ring); }
.r-input[aria-invalid=true]{ background:var(--r-danger-bg); border-color:var(--r-danger); }
.r-input[aria-invalid=true]:focus-visible{ box-shadow:0 0 0 3px var(--r-danger-border); }
.r-input:disabled{ cursor:not-allowed; background:var(--r-subtle); color:var(--r-faint); }
.r-input[readonly]{ background:var(--r-subtle); }
.r-input--lead{ padding-left:40px; }
.r-input--trail{ padding-right:40px; }
.r-input--lead-sm{ padding-left:30px; }
.r-lead, .r-trail{ position:absolute; top:50%; transform:translateY(-50%); display:flex; align-items:center; color:var(--r-faint); }
.r-lead{ left:12px; font-size:16px; line-height:1; pointer-events:none; }
.r-lead--text{ font-size:15px; font-weight:700; color:var(--r-text); }
.r-trail{ right:12px; }
.r-lead svg, .r-trail svg{ width:16px; height:16px; }
.r-valid{ color:var(--r-success); pointer-events:none; }
.r-chevron{ right:4px; padding:8px; border:0; background:none; border-radius:6px; color:var(--r-faint); cursor:pointer; }
.r-chevron:hover:not(:disabled){ color:var(--r-primary); }
.r-chevron:disabled{ opacity:.5; cursor:not-allowed; }
.r-chevron svg{ transition:transform .2s; }
.r-chevron[data-open=true] svg{ transform:rotate(180deg); }

/* Dropdown */
.r-list{ position:absolute; z-index:50; left:0; right:0; top:calc(100% + 4px); max-height:min(248px, 40vh); overflow:auto; padding:4px; background:#fff; border:1px solid var(--r-border-strong); border-radius:12px; box-shadow:0 16px 36px rgba(14,22,38,.18); overscroll-behavior:contain; }
.r-option{ display:flex; align-items:center; gap:10px; padding:10px; border-radius:8px; font-size:15px; cursor:pointer; }
.r-option[data-active=true]{ background:var(--r-tint); color:var(--r-brand-text); }
.r-option[aria-selected=true]{ font-weight:700; }
.r-empty{ padding:12px 10px; font-size:14px; color:var(--r-muted); }

/* Segmented control (gender, yes/no, attendance) */
.r-choices{ display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); gap:3px; padding:3px; background:var(--r-subtle); border:1px solid var(--r-border-strong); border-radius:999px; }
.r-choice{ display:flex; align-items:center; justify-content:center; min-height:calc(var(--r-h) - 8px); padding:0 10px; font:inherit; font-size:14px; font-weight:600; color:var(--r-muted); background:transparent; border:0; border-radius:999px; cursor:pointer; transition:background .15s, color .15s; }
.r-choice:hover{ color:var(--r-text); }
.r-choice[aria-pressed=true]{ color:var(--r-on-primary); background:var(--r-active); }

/* Registration type */
.r-type{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); overflow:hidden; background:#fff; border:1px solid var(--r-border-strong); border-radius:14px; }
.r-typecard{ display:flex; gap:10px; align-items:center; min-width:0; min-height:56px; padding:8px 12px; font:inherit; text-align:left; color:var(--r-text); background:#fff; border:0; border-radius:0; cursor:pointer; transition:background .15s, box-shadow .15s; }
.r-typecard + .r-typecard{ border-left:1px solid var(--r-border-strong); }
.r-typecard:hover{ background:var(--r-subtle); }
.r-typecard[aria-pressed=true]{ background:var(--r-active); color:var(--r-on-primary); box-shadow:inset 0 0 0 1.5px var(--r-active); }
.r-typecard[aria-pressed=true] .r-typesub{ color:rgba(255,255,255,.72); }
.r-typeicon{ flex:none; width:32px; height:32px; border-radius:999px; display:grid; place-items:center; background:var(--r-subtle); color:var(--r-muted); border:1px solid var(--r-border); transition:background .15s, color .15s; }
.r-typecard[aria-pressed=true] .r-typeicon{ background:rgba(255,255,255,.14); border-color:rgba(255,255,255,.28); color:var(--r-on-primary); }
.r-typeicon svg{ width:17px; height:17px; }
.r-typetitle{ display:block; font-size:14.5px; font-weight:700; line-height:1.2; }
.r-typesub{ display:none; margin-top:2px; font-size:12.5px; line-height:1.35; color:var(--r-muted); }
@media (min-width:768px){ .r-typecard{ padding:10px 12px; gap:12px; } .r-typeicon{ width:36px; height:36px; } .r-typeicon svg{ width:18px; height:18px; } .r-typesub{ display:block; } .r-typetitle{ font-size:15px; } }

/* Panels + reveal */
.r-panel{ display:flex; flex-direction:column; gap:18px; padding:14px; background:var(--r-subtle); border:1px solid var(--r-border); border-radius:16px; }
@media (min-width:640px){ .r-panel{ padding:20px; } }
.r-reveal{ animation:r-in .2s ease-out; }
@keyframes r-in{ from{ opacity:0; transform:translateY(-4px); } to{ opacity:1; transform:none; } }

/* Switch rows */
.r-switch{ display:flex; align-items:center; gap:12px; width:100%; min-height:52px; padding:10px 14px; font:inherit; text-align:left; color:var(--r-text); background:#fff; border:1px solid var(--r-border-strong); border-radius:14px; cursor:pointer; transition:border-color .15s, background .15s, box-shadow .15s; }
.r-switch:hover{ border-color:var(--r-border-hover); }
.r-switch[aria-checked=true]{ background:var(--r-active); border-color:var(--r-active); color:var(--r-on-primary); box-shadow:0 0 0 1px var(--r-active); }
.r-switch-text{ flex:1; min-width:0; font-size:14px; font-weight:600; line-height:1.35; }
.r-switch-text small{ display:block; margin-top:2px; font-size:12.5px; font-weight:400; color:var(--r-muted); }
.r-switch[aria-checked=true] .r-switch-text small{ color:rgba(255,255,255,.74); }
.r-track{ flex:none; position:relative; width:40px; height:22px; border-radius:999px; background:var(--r-border-strong); transition:background .2s; }
.r-track::after{ content:''; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.3); transition:transform .2s; }
.r-switch[aria-checked=true] .r-track{ background:rgba(255,255,255,.3); }
.r-switch[aria-checked=true] .r-track::after{ transform:translateX(18px); }

/* Number stepper */
.r-stepper{ display:flex; align-items:stretch; overflow:hidden; height:var(--r-h); background:#fff; border:1px solid var(--r-border-strong); border-radius:var(--r-radius); transition:border-color .15s, box-shadow .15s; }
.r-stepper:hover{ border-color:var(--r-border-hover); }
.r-stepper:focus-within{ border-color:var(--r-primary); box-shadow:0 0 0 3px var(--r-ring); }
.r-stepper[data-invalid=true]{ background:var(--r-danger-bg); border-color:var(--r-danger); }
.r-stepper button{ flex:none; display:grid; place-items:center; width:var(--r-h); border:0; background:var(--r-subtle); color:var(--r-text); cursor:pointer; }
.r-stepper button:hover:not(:disabled){ background:var(--r-tint); color:var(--r-brand-text); }
.r-stepper button:disabled{ opacity:.35; cursor:not-allowed; }
.r-stepper button svg{ width:16px; height:16px; }
.r-stepper input{ flex:1; width:100%; min-width:0; border:0; background:transparent; text-align:center; font:inherit; font-size:16px; font-weight:700; color:var(--r-text); -moz-appearance:textfield; appearance:textfield; }
.r-stepper input:focus{ outline:none; }
.r-stepper input::-webkit-outer-spin-button, .r-stepper input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }

/* Tally */
.r-tally{ display:flex; flex-direction:column; gap:6px; }
.r-meter{ height:4px; overflow:hidden; border-radius:999px; background:var(--r-border); }
.r-meter span{ display:block; height:100%; background:var(--r-active); transition:width .25s ease, background .2s; }
.r-tally-text{ display:flex; gap:6px; align-items:flex-start; font-size:12.5px; line-height:1.4; color:var(--r-muted); }
.r-tally-text svg{ width:14px; height:14px; flex:none; margin-top:1px; }
.r-tally[data-state=ok] .r-tally-text{ color:var(--r-success); font-weight:600; }
.r-tally[data-state=bad] .r-meter span{ background:var(--r-danger); }
.r-tally[data-state=bad] .r-tally-text{ color:var(--r-danger); font-weight:500; }

/* Chips + currency */
.r-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.r-chip{ min-height:34px; padding:0 14px; font:inherit; font-size:13px; font-weight:600; color:var(--r-muted); background:#fff; border:1px solid var(--r-border-strong); border-radius:999px; cursor:pointer; transition:border-color .15s, background .15s, color .15s; }
.r-chip:hover{ border-color:var(--r-border-hover); color:var(--r-text); }
.r-chip[aria-pressed=true]{ background:var(--r-active); color:var(--r-on-primary); border-color:var(--r-active); }
.r-cur{ display:grid; gap:10px; grid-template-columns:repeat(2,minmax(0,1fr)); }
@media (min-width:640px){ .r-cur{ grid-template-columns:repeat(4,minmax(0,1fr)); } }
.r-curbtn{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:0; padding:10px 12px; font:inherit; text-align:left; color:var(--r-text); background:#fff; border:1px solid var(--r-border-strong); border-radius:14px; cursor:pointer; transition:border-color .15s, background .15s, box-shadow .15s; }
.r-curbtn:hover:not(:disabled){ border-color:var(--r-border-hover); }
.r-curbtn[aria-pressed=true]:not(:disabled){ background:var(--r-active); border-color:var(--r-active); color:var(--r-on-primary); box-shadow:0 0 0 1px var(--r-active); }
.r-curbtn[aria-pressed=true]:not(:disabled) .r-curprice{ color:rgba(255,255,255,.75); }
.r-curbtn:disabled{ opacity:.5; cursor:not-allowed; }
.r-curcode{ display:inline-flex; align-items:center; gap:7px; font-size:14px; font-weight:700; }
.r-curprice{ max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12.5px; line-height:1.35; color:var(--r-muted); }
.r-note{ font-size:13.5px; line-height:1.5; color:var(--r-muted); }

/* Consent + summary */
.r-consent{ display:flex; gap:12px; align-items:flex-start; padding:14px; font-size:13.5px; line-height:1.5; color:var(--r-muted); background:#fff; border:1px solid var(--r-border-strong); border-radius:14px; cursor:pointer; transition:border-color .15s, background .15s; }
.r-consent:hover{ border-color:var(--r-border-hover); }
.r-consent[data-invalid=true]{ background:var(--r-danger-bg); border-color:var(--r-danger); }
.r-consent input{ flex:none; width:20px; height:20px; margin-top:1px; accent-color:var(--r-active); }
.r-consent a{ color:var(--r-brand-text); font-weight:600; text-decoration:underline; }

.r-summary{ margin:0; padding:16px; color:#fff; background:linear-gradient(135deg,var(--r-navy) 0%,var(--r-navy-2) 100%); border-radius:16px; }
.r-row{ display:flex; justify-content:space-between; gap:16px; padding:6px 0; font-size:14px; }
.r-row dt{ color:rgba(255,255,255,.7); }
.r-row dd{ margin:0; min-width:0; font-weight:600; text-align:right; overflow-wrap:anywhere; }
.r-total{ display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin-top:8px; padding-top:14px; border-top:1px dashed rgba(142,227,214,.4); }
.r-total-label{ font-size:13px; color:var(--r-mint); }
.r-total-value{ font-size:26px; font-weight:800; line-height:1; letter-spacing:-.02em; overflow-wrap:anywhere; text-align:right; }

/* Alerts */
.r-alert{ display:flex; gap:8px; align-items:flex-start; padding:12px 14px; font-size:13.5px; line-height:1.45; color:var(--r-danger); background:var(--r-danger-bg); border:1px solid var(--r-danger-border); border-radius:12px; }
.r-alert svg{ width:16px; height:16px; flex:none; margin-top:1px; }
.r-alert--warn{ color:var(--r-warn); background:var(--r-warn-bg); border-color:var(--r-warn-border); }
.r-linkbtn{ padding:0; font:inherit; font-weight:700; color:inherit; text-decoration:underline; background:none; border:0; cursor:pointer; }

/* Sticky pay bar */
.r-bar{ position:sticky; bottom:0; z-index:25; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px var(--r-pad) max(10px, env(safe-area-inset-bottom)); background:rgba(255,255,255,.94); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-top:1px solid var(--r-border); }
.r-bar-total{ display:flex; flex-direction:column; flex:none; min-width:0; line-height:1.2; }
.r-bar-total small{ font-size:11.5px; color:var(--r-muted); }
.r-bar-total strong{ font-size:17px; font-weight:800; white-space:nowrap; }
.r-pay{ flex:1 1 auto; min-width:0; max-width:340px; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:48px; padding:0 20px; font:inherit; font-size:15px; font-weight:650; color:#fff; background:linear-gradient(135deg,#0E7A6E,#0B655B); border:0; border-radius:999px; box-shadow:0 10px 24px rgba(14,122,110,.3); cursor:pointer; transition:background .15s, transform .1s, box-shadow .15s; }
.r-pay span{ min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.r-pay:hover:not(:disabled){ background:linear-gradient(135deg,#0B655B,#084F47); }
.r-pay:active:not(:disabled){ transform:scale(.99); }
.r-pay:focus-visible{ outline:2px solid var(--r-primary); outline-offset:3px; }
.r-pay:disabled{ opacity:.55; cursor:not-allowed; box-shadow:none; }
.r-pay svg{ flex:none; width:16px; height:16px; }
.r-spin{ flex:none; width:16px; height:16px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:r-spin .7s linear infinite; }
@keyframes r-spin{ to{ transform:rotate(360deg); } }

@media (min-width:640px){ .r-card{ border-radius:6px; } }

@media (prefers-reduced-motion:reduce){
  .r-root *, .r-root *::before, .r-root *::after{ animation:none !important; transition:none !important; }
}
`;

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

function SearchIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </Icon>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
    </Icon>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

/* ---------- Shared form pieces ---------- */

const inputCls = (extra = "") => `r-input ${extra}`.trim();

const normaliseSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toInt = (value: string) => Number.parseInt(value, 10) || 0;

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
    <div className="r-field">
      <label htmlFor={htmlFor} className="r-label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="r-hint">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="r-error">
          <AlertIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function StepHeader({ n, done, title, note }: { n: number; done: boolean; title: string; note?: string }) {
  return (
    <div className="r-step-head">
      <div className="r-step-top">
        <span className="r-badge" data-done={done ? "true" : "false"} aria-hidden>
          {done ? <CheckIcon /> : n}
        </span>
        <h2 className="r-step-title">
          {title}
          {done && <span className="sr-only"> (complete)</span>}
        </h2>
        <span className="r-step-tag" data-done={done ? "true" : "false"} aria-hidden>
          {done ? "Complete" : `Step ${n} of ${TOTAL_STEPS}`}
        </span>
      </div>
      {note && <p className="r-step-note">{note}</p>}
    </div>
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
      className="r-switch"
    >
      <span className="r-switch-text">
        {label}
        {description && <small>{description}</small>}
      </span>
      <span className="r-track" aria-hidden />
    </button>
  );
}

/** Number input with large − / + buttons. Typing still works. */
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
    <div className="r-stepper" data-invalid={invalid ? "true" : undefined}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${label}`}
        disabled={!canDecrease}
        onClick={() => onChange(String(Math.max(min, current - 1)))}
      >
        <MinusIcon />
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
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${label}`}
        disabled={!canIncrease}
        onClick={() => onChange(String(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, current + 1))))}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

/** Live "x of y" meter for counts that must add up to the participant total. */
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
  const state = error ? "bad" : matched ? "ok" : "idle";

  let text: string;
  if (total <= 0) text = "Enter the number of participants first.";
  else if (matched) text = `All ${total} ${unit} assigned`;
  else if (current < total) text = `${total - current} of ${total} ${unit} still to assign`;
  else text = `${current - total} over. Reduce a count so the total is ${total}.`;

  return (
    <div className="r-tally" data-state={state}>
      <div className="r-meter" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      {error ? (
        <p id={id} role="alert" className="r-tally-text">
          <AlertIcon />
          <span>{error}</span>
        </p>
      ) : (
        <p className="r-tally-text" aria-live="polite">
          {matched && <CheckIcon />}
          <span>{text}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Searchable dropdown. The input stays focused while filtering, the list
 * opens on focus/typing, and arrow keys + Enter select without replacing
 * whatever the user is doing elsewhere in the form.
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

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
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
      className="r-wrap"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          resetToValue();
        }
      }}
    >
      <div className="r-lead">
        {renderLeading?.(value) ?? (disabled ? <LockIcon /> : <SearchIcon />)}
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
      />

      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        data-open={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (disabled) return;
          setOpen((wasOpen) => !wasOpen);
          setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
          inputRef.current?.focus();
        }}
        className="r-trail r-chevron"
      >
        <ChevronDownIcon />
      </button>

      {open && !disabled && (
        <div ref={listRef} id={`${id}-options`} role="listbox" className="r-list">
          {filtered.length === 0 ? (
            <div className="r-empty">{emptyMessage}</div>
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
                className="r-option"
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

export default function RegisterPage() {
  const router = useRouter();

  // Mode: Individual vs Group
  const [isGroup, setIsGroup] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>("NGN");

  // Config loaded from Express. Every supported currency is routed through
  // Paystack, so availability only depends on the configured price.
  const [pricesMinor, setPricesMinor] = useState<Partial<Record<SupportedCurrency, number>>>({});
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [configState, setConfigState] = useState<"loading" | "ready" | "error">("loading");

  // Form state (never persisted)
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState(INITIAL_PHONE);
  const [payerEmail, setPayerEmail] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [groupName, setGroupName] = useState("");
  // Kept as a string so the group leader types the count manually. Submission
  // is blocked until it is at least 2 (the backend enforces the same rule).
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
  const [customNairaAmount, setCustomNairaAmount] = useState("5000");
  const [groupAttendance, setGroupAttendance] = useState({ physically: 0, online: 0, not_sure: 0 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // server / network errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({}); // per-input validation errors

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const checkoutAttempt = useRef<{ payload: string; key: string } | null>(null);

  const errorCount = Object.keys(fieldErrors).length;
  const matchedCountry = findCountry(country);
  const matchedState = findNigerianState(state);
  const isNigeria = matchedCountry === NIGERIA || country.trim().toLowerCase() === "nigeria";
  const selectedCountry = findCountry(country) ?? country;
  const selectedDial = countryDialCode(selectedCountry);
  const selectedFlag = countryFlag(selectedCountry);
  const inviteeNumber = hasInvitees ? Number(inviteeCount) || 0 : 0;
  const returningCount = Math.max(0, seatsCount - inviteeNumber);
  const groupAttendanceTotal = groupAttendance.physically + groupAttendance.online + groupAttendance.not_sure;

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

  // Validates a single field when the user leaves it, so mistakes show up
  // straight away instead of only after pressing Pay.
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

  // Props shared by every text input: id, invalid state, error wiring and styling.
  const fp = (key: FieldKey, extra = "", validateOnBlur = true) => ({
    id: `field-${key}`,
    "aria-invalid": fieldErrors[key] ? true : undefined,
    "aria-describedby": fieldErrors[key] ? `field-${key}-error` : undefined,
    className: inputCls(extra),
    ...(validateOnBlur ? { onBlur: () => blurValidate(key) } : {}),
  });

  // Same wiring for the stepper inputs.
  const nf = (key: FieldKey) => ({
    id: `field-${key}`,
    invalid: Boolean(fieldErrors[key]),
    describedBy: fieldErrors[key] ? `field-${key}-error` : undefined,
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
  const standardGroupNairaMinor = typeof pricesMinor.NGN === "number" ? pricesMinor.NGN * seatsCount : null;
  const customNairaMajor = Number(customNairaAmount);
  const customNairaMinor =
    currency === "NGN" && Number.isFinite(customNairaMajor) ? Math.round(customNairaMajor * 100) : null;
  const totalMinor =
    currency === "NGN"
      ? isGroup
        ? standardGroupNairaMinor
        : customNairaMinor
      : typeof unitMinor === "number"
        ? effectiveSeats * unitMinor
        : null;
  const formattedTotal = totalMinor !== null ? formatMoneyMinor(totalMinor, currency) : "—";

  /* ---------- Validation ---------- */

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    const seatsValid = Number.isInteger(parsedSeats) && parsedSeats >= 2 && parsedSeats <= 500;

    if (isGroup) {
      if (!groupName.trim()) errs.groupName = "Enter your chapter or zone name.";
      if (!seatsValid) errs.seats = "Enter a number between 2 and 500.";
      if (
        hasInvitees &&
        (!Number.isInteger(Number(inviteeCount)) || Number(inviteeCount) < 1 || Number(inviteeCount) > seatsCount)
      ) {
        errs.inviteeCount = `Enter a number between 1 and ${seatsCount}.`;
      }
      if (genderCounts.male + genderCounts.female !== seatsCount) {
        errs.genderCounts = `Brothers and Sisters must add up to ${seatsCount} participants (children included).`;
      }
      if (hasChildren && (childCount < 1 || childCount > seatsCount)) {
        errs.childCount = `Enter a child count between 1 and ${seatsCount}.`;
      }
    } else {
      if (gender !== "male" && gender !== "female") errs.gender = "Select Brother or Sister.";
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
    if (isNigeria && !matchedState) errs.state = "Select a state from the list.";

    if (!isGroup && isMinor) {
      if (!guardianName.trim()) errs.guardianName = "Enter a parent or guardian name.";
      if (!guardianPhone.trim()) errs.guardianPhone = "Enter a parent or guardian phone number.";
    }

    if (!isGroup && currency === "NGN") {
      if (
        !Number.isInteger(customNairaMajor) ||
        customNairaMinor === null ||
        customNairaMinor < minimumNairaMinor
      ) {
        errs.customNairaAmount = "Enter a valid whole-naira amount.";
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

  /* ---------- Live completion (drives the step badges + progress bar) ---------- */

  const live = validate();
  const hasErr = (...keys: FieldKey[]) => keys.some((k) => live[k]);
  const seatsOk = Number.isInteger(parsedSeats) && parsedSeats >= 2 && parsedSeats <= 500;
  const stepDone = {
    type: true,
    details: isGroup
      ? !hasErr("groupName", "seats", "country", "state", "inviteeCount", "hasChildren", "childCount", "genderCounts")
      : !hasErr("gender", "firstTime"),
    contact:
      !hasErr("payerName", "payerPhone", "payerEmail", "guardianName", "guardianPhone") &&
      (isGroup || !hasErr("country", "state")),
    attendance: isGroup ? seatsOk && !hasErr("groupAttendance") && groupAttendanceTotal === parsedSeats : true,
    payment: totalMinor !== null && !hasErr("customNairaAmount"),
    review: !hasErr("consent", "turnstile"),
  };
  const doneCount = Object.values(stepDone).filter(Boolean).length;
  const progress = Math.round((doneCount / TOTAL_STEPS) * 100);
  const firstInvalidKey = FIELD_ORDER.find((k) => fieldErrors[k]);

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
        country: matchedCountry || country.trim(),
        state: isNigeria && matchedState ? matchedState : undefined,
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
        customAmountMinor: !isGroup && currency === "NGN" ? customNairaMinor : undefined,
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
    if (findCountry(next) !== NIGERIA) setState("");
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
          inputProps={fp("country", "r-input--lead r-input--trail", false)}
          onTyping={() => {
            clearErr("country");
            clearErr("state");
          }}
          onChange={handleCountryChange}
          renderLeading={(value) => <span aria-hidden>{countryFlag(value)}</span>}
          renderOption={(option) => {
            const flag = countryFlag(option);
            const badge = countryCurrencyBadge(option);
            return (
              <>
                <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
                  {flag}
                </span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {option}
                </span>
                <span aria-hidden style={{ marginLeft: "auto", opacity: 0.6 }}>
                  {badge}
                </span>
              </>
            );
          }}
        />
      </Field>

      <Field
        htmlFor="field-state"
        label={isGroup ? "Group state" : "State of residence"}
        error={fieldErrors.state}
        hint={
          isNigeria
            ? isGroup
              ? "Applied to every participant in this group."
              : undefined
            : "Enabled when your country is Nigeria."
        }
      >
        <SearchableSelect
          id="field-state"
          value={state}
          options={NIGERIAN_STATES}
          placeholder={isNigeria ? "Search Nigerian states..." : "Select Nigeria first"}
          emptyMessage="No states match your search"
          disabled={!isNigeria}
          inputProps={fp("state", "r-input--lead r-input--trail", false)}
          onTyping={() => clearErr("state")}
          onChange={(next) => {
            setState(next);
            clearErr("state");
          }}
        />
      </Field>
    </>
  );

  const phoneValid = Boolean(toE164Phone(payerPhone));
  const emailValid = EMAIL_RE.test(payerEmail.trim());
  const nairaChips: { label: string; minor: number }[] =
    typeof pricesMinor.NGN === "number" && pricesMinor.NGN !== minimumNairaMinor
      ? [{ label: "Standard", minor: pricesMinor.NGN }]
      : [];

  return (
    <div className="r-root flex min-h-screen flex-col">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Header />

      <main className="r-page">
        <div className="r-layout">
          {/* Desktop (1280px+): info panel stays in view while the form scrolls */}
          <aside className="r-side" aria-label="Conference information">
            <div className="r-side-inner">
              <Image
                src={SITE_CONFIG.logo.src}
                alt={SITE_CONFIG.logo.alt}
                width={132}
                height={44}
                className="r-side-logo"
                style={{ width: "auto" }}
                priority
              />
              <span className="r-side-label">Conference starts in</span>
              <div>
                <div className="r-side-clock">
                  <Countdown compact />
                </div>
              </div>
              <h2 className="r-side-title">{`REGISTER FOR THE ${SITE_CONFIG.eventTitle.toUpperCase()}`}</h2>
              <p className="r-side-lead">Register yourself or your whole chapter in a few minutes.</p>
              <ol className="r-side-steps">
                {[
                  ["Fill in the form", "Register one person, or a chapter or zone of 2 to 500."],
                  [
                    "Pay online",
                    `Pay in ${CURRENCY_LIST.slice(0, -1).join(", ")} or ${CURRENCY_LIST[CURRENCY_LIST.length - 1]}.`,
                  ],
                  ["Get your QR ticket", "It is issued instantly."],
                ].map(([title, text], index) => (
                  <li key={title}>
                    <span className="r-side-num">{index + 1}</span>
                    <span>
                      <b>{title}</b>
                      <span>{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div data-hero-content>
            <div className="r-card">
              {/* Sticky header with completion progress (hidden on desktop) */}
              <div className="r-head">
                <div className="r-head-row">
                  <span className="r-head-steps">
                    {doneCount} of {TOTAL_STEPS} done
                  </span>
                  <div className="r-head-brand">
                    <Image
                      src={SITE_CONFIG.logo.src}
                      alt="Horemow"
                      width={96}
                      height={33}
                      className="h-7 w-auto object-contain"
                      style={{ width: "auto" }}
                      priority
                    />
                    <span className="r-head-sep" />
                    <span className="r-head-tag">Registration</span>
                  </div>
                  <div className="r-head-clock">
                    <span className="sm:hidden max-[400px]:hidden">Starts in</span>
                    <span className="hidden sm:inline">Conference starts in</span>
                    <Countdown compact />
                  </div>
                </div>
                <div
                  className="r-progress"
                  role="progressbar"
                  aria-label="Registration progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>

              <form id="register-form" noValidate onSubmit={handleSubmit} className="r-form">
                {/* Step 1: type */}
                <div className="r-step" style={{ borderTop: 0 }}>
                  <div className="r-type" role="group" aria-label="Registration type">
                    <button
                      type="button"
                      className="r-typecard"
                      aria-pressed={!isGroup}
                      onClick={() => switchMode(false)}
                    >
                      <span className="r-typeicon">
                        <UserIcon />
                      </span>
                      <span>
                        <span className="r-typetitle">Individual</span>
                        <span className="r-typesub">Register one person</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="r-typecard"
                      aria-pressed={isGroup}
                      onClick={() => switchMode(true)}
                    >
                      <span className="r-typeicon">
                        <UsersIcon />
                      </span>
                      <span>
                        <span className="r-typetitle">Group</span>
                        <span className="r-typesub">Register a chapter or zone together</span>
                      </span>
                    </button>
                  </div>

                </div>

                {/* Step 2: group details / attendee details */}
                <div className="r-step">
                  <StepHeader
                    n={2}
                    done={stepDone.details}
                    title={isGroup ? "Group details" : "About you"}
                    note={
                      isGroup
                        ? "Tell us about your chapter or zone."
                        : "These answers are part of the paid registration record."
                    }
                  />

                  {isGroup ? (
                    <div className="r-panel r-reveal">
                      <div className="r-grid r-grid--2">
                        <Field htmlFor="field-groupName" label="Chapter / zone name" error={fieldErrors.groupName}>
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

                        <Field
                          htmlFor="field-seats"
                          label="Number of participants"
                          error={fieldErrors.seats}
                          hint="Everyone attending, children included."
                        >
                          <NumberField
                            {...nf("seats")}
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
                              else setFieldErrors((prev) => ({ ...prev, seats: "Enter a number between 2 and 500." }));
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
                              ? `${inviteeNumber} first-time · ${returningCount} returning attendant${returningCount === 1 ? "" : "s"}`
                              : `All ${seatsCount} participants will be recorded as returning attendants.`
                          }
                        />
                        {hasInvitees && (
                          <div className="r-reveal r-narrow">
                            <Field
                              htmlFor="field-inviteeCount"
                              label="Number of new comers / invitees"
                              error={fieldErrors.inviteeCount}
                              hint="These participants are recorded as first-time attendees."
                            >
                              <NumberField
                                {...nf("inviteeCount")}
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
                          </div>
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
                        />
                        {fieldErrors.hasChildren && (
                          <p id="field-hasChildren-error" role="alert" className="r-error">
                            <AlertIcon />
                            <span>{fieldErrors.hasChildren}</span>
                          </p>
                        )}
                        {hasChildren && (
                          <div className="r-reveal r-narrow">
                            <Field
                              htmlFor="field-childCount"
                              label="Number of children"
                              error={fieldErrors.childCount}
                              hint="Children are included in the participant count."
                            >
                              <NumberField
                                {...nf("childCount")}
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
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="r-grid r-grid--2">
                          <Field
                            htmlFor="field-genderCounts"
                            label="Number of males"
                            hint="Include boys in this count."
                          >
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
                    <div className="r-grid r-grid--2">
                      <Field htmlFor="field-gender" label="Gender" error={fieldErrors.gender}>
                        <div id="field-gender" role="group" aria-label="Gender" className="r-choices" tabIndex={-1}>
                          {(["male", "female"] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              className="r-choice"
                              aria-pressed={gender === value}
                              onClick={() => {
                                setGender(value);
                                clearErr("gender");
                              }}
                            >
                              {value === "male" ? "Male" : "Female"}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field
                        htmlFor="field-firstTime"
                        label="Are you a first timer or invitee?"
                        error={fieldErrors.firstTime}
                      >
                        <div
                          id="field-firstTime"
                          role="group"
                          aria-label="First timer or invitee"
                          className="r-choices"
                          tabIndex={-1}
                        >
                          {(["yes", "no"] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              className="r-choice"
                              aria-pressed={firstTime === value}
                              onClick={() => {
                                setFirstTime(value);
                                clearErr("firstTime");
                              }}
                            >
                              {value === "yes" ? "Yes" : "No"}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  )}
                </div>

                {/* Step 3: contact */}
                <div className="r-step">
                  <StepHeader
                    n={3}
                    done={stepDone.contact}
                    title={isGroup ? "Group leader details" : "Your contact details"}
                    note={isGroup ? "The person registering and paying for the group." : undefined}
                  />

                  <div className="r-grid r-grid--2">
                    {!isGroup && locationFields}

                    <Field htmlFor="field-payerName" label="Full name" error={fieldErrors.payerName}>
                      <div className="r-wrap">
                        <input
                          type="text"
                          autoComplete="name"
                          placeholder="Brother / Sister Full Name"
                          value={payerName}
                          onChange={(e) => {
                            setPayerName(e.target.value);
                            clearErr("payerName");
                          }}
                          {...fp("payerName", "r-input--trail")}
                        />
                        {payerName.trim() && !fieldErrors.payerName && (
                          <span className="r-trail r-valid">
                            <CheckIcon />
                          </span>
                        )}
                      </div>
                    </Field>

                    <Field
                      htmlFor="field-payerPhone"
                      label="Phone number"
                      error={fieldErrors.payerPhone}
                      hint={`${selectedFlag} ${selectedDial} for ${selectedCountry || "your selected country"}`}
                    >
                      <div className="r-wrap">
                        <span className="r-lead" aria-hidden>
                          {selectedFlag}
                        </span>
                        <input
                          type="tel"
                          autoComplete="tel"
                          placeholder={`${selectedDial} 801 234 5678`}
                          value={payerPhone}
                          onChange={(e) => {
                            setPayerPhone(e.target.value);
                            clearErr("payerPhone");
                          }}
                          {...fp("payerPhone", "r-input--lead r-input--trail")}
                        />
                        {phoneValid && !fieldErrors.payerPhone && (
                          <span className="r-trail r-valid">
                            <CheckIcon />
                          </span>
                        )}
                      </div>
                    </Field>

                    <div className="r-span2">
                      <Field htmlFor="field-payerEmail" label="Email address" error={fieldErrors.payerEmail}>
                        <div className="r-wrap">
                          <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            placeholder="name@example.com"
                            value={payerEmail}
                            onChange={(e) => {
                              setPayerEmail(e.target.value);
                              clearErr("payerEmail");
                            }}
                            {...fp("payerEmail", "r-input--trail")}
                          />
                          {emailValid && !fieldErrors.payerEmail && (
                            <span className="r-trail r-valid">
                              <CheckIcon />
                            </span>
                          )}
                        </div>
                      </Field>
                    </div>
                  </div>

                  {!isGroup && (
                    <div className="space-y-4" style={{ marginTop: 20 }}>
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
                        <div className="r-panel r-reveal">
                          <div className="r-grid r-grid--2">
                            <Field
                              htmlFor="field-guardianName"
                              label="Parent / guardian name"
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
                              label="Parent / guardian phone"
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
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 4: attendance */}
                <div className="r-step">
                  <StepHeader
                    n={4}
                    done={stepDone.attendance}
                    title={isGroup ? "How will the group attend?" : "How will you attend?"}
                    note={
                      isGroup
                        ? seatsCount > 0
                          ? `Enter a count for each mode. The counts must add up to all ${seatsCount} participants.`
                          : "Set the number of participants in step 2 first."
                        : undefined
                    }
                  />

                  {isGroup ? (
                    <div className="space-y-3">
                      <div className="r-grid r-grid--3">
                        {ATTENDANCE_OPTIONS.map(([key, label]) => {
                          const id = ATTENDANCE_IDS[key];
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
                    <div className="r-choices" role="group" aria-label="Attendance mode">
                      {ATTENDANCE_OPTIONS.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className="r-choice"
                          aria-pressed={attendanceMode === value}
                          onClick={() => setAttendanceMode(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 5: payment */}
                <div className="r-step">
                  <StepHeader
                    n={5}
                    done={stepDone.payment}
                    title="Payment"
                    note="Choose the currency you want to pay in. Standard prices are per participant."
                  />

                  <div className="r-cur" role="group" aria-label="Payment currency">
                    {CURRENCY_LIST.map((c) => {
                      const price = pricesMinor[c];
                      return (
                        <button
                          key={c}
                          type="button"
                          className="r-curbtn"
                          disabled={configState !== "ready"}
                          aria-pressed={currency === c}
                          title={CURRENCIES[c].label}
                          onClick={() => {
                            setCurrency(c);
                            clearErr("customNairaAmount");
                          }}
                        >
                          <span className="r-curcode">
                            <span aria-hidden>{CURRENCIES[c].flag}</span>
                            {c}
                          </span>
                          {typeof price === "number" && (
                            <span className="r-curprice">{formatMoneyMinor(price, c)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 20 }}>
                    {currency === "NGN" ? (
                      <>
                        <Field
                          htmlFor="field-customNairaAmount"
                          label="Payment amount"
                          error={fieldErrors.customNairaAmount}
                          hint={
                            isGroup
                              ? "Calculated automatically from the standard price and your participant count."
                              : undefined
                          }
                        >
                          <div className="r-wrap r-narrow">
                            <span className="r-lead r-lead--text" aria-hidden>
                              ₦
                            </span>
                            <input
                              type="number"
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
                              {...fp("customNairaAmount", "r-input--lead-sm")}
                              style={{ fontWeight: 700 }}
                            />
                          </div>
                        </Field>

                        {!isGroup && nairaChips.length > 0 && (
                          <div className="r-chips" role="group" aria-label="Quick amounts">
                            {nairaChips.map((chip) => (
                              <button
                                key={chip.label}
                                type="button"
                                className="r-chip"
                                aria-pressed={customNairaMinor === chip.minor}
                                onClick={() => {
                                  setCustomNairaAmount(String(chip.minor / 100));
                                  clearErr("customNairaAmount");
                                }}
                              >
                                {chip.label} {formatMoneyMinor(chip.minor, "NGN")}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="r-note">
                        {typeof unitMinor === "number"
                          ? `You will pay ${formatMoneyMinor(unitMinor, currency)} per participant in ${currency}.`
                          : `The ${currency} price is not available right now.`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 6: review */}
                <div className="r-step">
                  <StepHeader n={6} done={stepDone.review} title="Review and pay" />

                  <dl className="r-summary">
                    <div className="r-row">
                      <dt>Registration</dt>
                      <dd>{isGroup ? "Group" : "Individual"}</dd>
                    </div>
                    {isGroup && groupName.trim() && (
                      <div className="r-row">
                        <dt>Chapter / zone</dt>
                        <dd>{groupName.trim()}</dd>
                      </div>
                    )}
                    <div className="r-row">
                      <dt>{effectiveSeats === 1 ? "Participant" : "Participants"}</dt>
                      <dd>{effectiveSeats}</dd>
                    </div>
                    {(currency !== "NGN" || isGroup) && typeof unitMinor === "number" && (
                      <div className="r-row">
                        <dt>Standard price per participant</dt>
                        <dd>{formatMoneyMinor(unitMinor, currency)}</dd>
                      </div>
                    )}
                    <div className="r-total">
                      <span className="r-total-label">Total ({currency})</span>
                      <span className="r-total-value">{formattedTotal}</span>
                    </div>
                  </dl>

                  <div style={{ marginTop: 20 }} className="space-y-3">
                    <label className="r-consent" data-invalid={fieldErrors.consent ? "true" : undefined}>
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
                      />
                      <span>
                        I understand that registration fees are non-refundable. I consent to personal data
                        processing under the <Link href="/privacy">Privacy Policy</Link> and{" "}
                        <Link href="/terms">Terms</Link>.
                      </span>
                    </label>
                    {fieldErrors.consent && (
                      <p id="field-consent-error" role="alert" className="r-error">
                        <AlertIcon />
                        <span>{fieldErrors.consent}</span>
                      </p>
                    )}

                    {TURNSTILE_SITE_KEY && (
                      <div className="space-y-2">
                        <div
                          id="field-turnstile"
                          ref={turnstileRef}
                          style={{ minHeight: 65, maxWidth: "100%", overflow: "hidden", borderRadius: 10 }}
                          className={fieldErrors.turnstile ? "ring-2 ring-red-400" : ""}
                        />
                        {fieldErrors.turnstile && (
                          <p role="alert" className="r-error">
                            <AlertIcon />
                            <span>{fieldErrors.turnstile}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {errorCount > 0 && (
                      <div role="alert" className="r-alert">
                        <AlertIcon />
                        <span>
                          {errorCount === 1 ? "1 field needs" : `${errorCount} fields need`} your attention. Correct
                          the highlighted {errorCount === 1 ? "field" : "fields"} and try again.{" "}
                          {firstInvalidKey && (
                            <button type="button" className="r-linkbtn" onClick={() => focusField(firstInvalidKey)}>
                              Go to the first one
                            </button>
                          )}
                        </span>
                      </div>
                    )}
                    {error && (
                      <div role="alert" className="r-alert">
                        <AlertIcon />
                        <span>{error}</span>
                      </div>
                    )}

                    <p className="r-note">You will be taken to our secure checkout to complete your payment.</p>

                    {(configState === "error" || (configState === "ready" && !registrationOpen)) && (
                      <div
                        role={configState === "error" ? "alert" : "status"}
                        className={`r-alert ${configState === "error" ? "" : "r-alert--warn"}`}
                      >
                        <AlertIcon />
                        <span>
                          {configState === "error"
                            ? "Registration pricing could not be loaded. Refresh the page to try again."
                            : "Online registration is closed."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </form>

              {/* Pay bar: follows you down the form, then rests here at the end. */}
              <div className="r-bar">
                <div className="r-bar-total">
                  <small>Total ({currency})</small>
                  <strong>{formattedTotal}</strong>
                </div>
                <button type="submit" form="register-form" disabled={submitDisabled} className="r-pay">
                  {loading ? (
                    <>
                      <span className="r-spin" aria-hidden />
                      <span>Initializing secure checkout...</span>
                    </>
                  ) : (
                    <>
                      <LockIcon />
                      <span>
                        {configState === "ready" && !registrationOpen
                          ? "Registration closed"
                          : totalMinor === null
                            ? "Loading price..."
                            : `Pay ${formattedTotal}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
