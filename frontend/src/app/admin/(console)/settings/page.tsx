"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Plus, Trash2, GripVertical } from "lucide-react";
import {
  CURRENCIES as CURRENCY_CONFIG,
  CURRENCY_LIST,
  type SupportedCurrency,
} from "@/config/currencies";

type Settings = {
  eventName?: string;
  theme?: string;
  datesText?: string;
  heroDatesLabel?: string;
  openingTimeLabel?: string;
  registrationFeeLabel?: string;
  whyAttendIntro?: string;
  flyerDescription?: string;
  startsAt?: string;
  endsAt?: string;
  registrationDeadline?: string;
  venueName?: string;
  venueAddress?: string;
  venueMapUrl?: string;
  contactPhone?: string;
  contactEmail?: string | null;
  capacityLimit?: number | null;
  capacityAlertThresholds?: string;
};

type Route = {
  currency: string;
  primaryProvider: string;
  isEnabled: boolean;
  feePolicy: string;
};

type Price = { currency: string; amountMinor: number };

type ProgrammeItem = {
  id?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  title: string;
  speakerOrLeader: string;
  description: string;
  sortOrder: number;
};

const CURRENCIES = CURRENCY_LIST;
const PROVIDERS = ["paystack", "flutterwave"] as const;

const EMPTY_PROGRAMME: ProgrammeItem = {
  eventDate: "",
  startTime: "",
  endTime: "",
  title: "",
  speakerOrLeader: "",
  description: "",
  sortOrder: 0,
};

function getStaffToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)staff_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getStaffToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

function toLocalInput(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [routes, setRoutes] = useState<Route[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [programme, setProgramme] = useState<ProgrammeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProgramme, setSavingProgramme] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    apiFetch("/admin/settings")
      .then((d) => {
        if (d.settings) {
          const s = d.settings;
          setSettings({
            eventName: s.eventName,
            theme: s.theme,
            datesText: s.datesText,
            heroDatesLabel: s.heroDatesLabel,
            openingTimeLabel: s.openingTimeLabel,
            registrationFeeLabel: s.registrationFeeLabel,
            whyAttendIntro: s.whyAttendIntro,
            flyerDescription: s.flyerDescription,
            startsAt: toLocalInput(s.startsAt),
            endsAt: toLocalInput(s.endsAt),
            registrationDeadline: toLocalInput(s.registrationDeadline),
            venueName: s.venueName,
            venueAddress: s.venueAddress,
            venueMapUrl: s.venueMapUrl || "",
            contactPhone: s.contactPhone,
            contactEmail: s.contactEmail || "",
            capacityLimit: s.capacityLimit,
            capacityAlertThresholds: Array.isArray(s.capacityAlertThresholds)
              ? s.capacityAlertThresholds.join(", ")
              : s.capacityAlertThresholds,
          });
        }
        if (d.routes) setRoutes(d.routes);
        if (d.prices) setPrices(d.prices);
        if (d.programme) setProgramme(d.programme);
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to load settings." }))
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = (key: keyof Settings, value: unknown) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const updateRoute = (currency: string, field: keyof Route, value: unknown) =>
    setRoutes((prev) => {
      const existing = prev.find((r) => r.currency === currency);
      if (existing) {
        return prev.map((r) => (r.currency === currency ? { ...r, [field]: value } : r));
      }
      return [
        ...prev,
        {
          currency,
          primaryProvider:
            CURRENCY_CONFIG[currency as SupportedCurrency]?.defaultProvider ?? "paystack",
          isEnabled: true,
          feePolicy: "organizer_absorbs",
          [field]: value,
        } as Route,
      ];
    });

  const minorUnits = (currency: string) =>
    CURRENCY_CONFIG[currency as SupportedCurrency]?.minorUnitMultiplier ?? 100;

  const updatePrice = (currency: string, amountMajor: number) =>
    setPrices((prev) => {
      const existing = prev.find((p) => p.currency === currency);
      const amountMinor = Math.round(amountMajor * minorUnits(currency));
      if (existing) {
        return prev.map((p) => (p.currency === currency ? { ...p, amountMinor } : p));
      }
      return [...prev, { currency, amountMinor }];
    });

  const getPriceMajor = (currency: string) => {
    const p = prices.find((x) => x.currency === currency);
    return p ? p.amountMinor / minorUnits(currency) : 0;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          settings: {
            ...settings,
            capacityLimit:
              settings.capacityLimit === null ||
              settings.capacityLimit === undefined ||
              settings.capacityLimit === ("" as unknown)
                ? null
                : Number(settings.capacityLimit),
          },
          routes,
          prices,
        }),
      });
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const updateProgramme = (index: number, field: keyof ProgrammeItem, value: unknown) =>
    setProgramme((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const addProgramme = () => {
    const firstDay =
      settings.startsAt && settings.startsAt.length >= 10
        ? settings.startsAt.slice(0, 10)
        : "";
    setProgramme((prev) => [
      ...prev,
      { ...EMPTY_PROGRAMME, eventDate: firstDay, sortOrder: prev.length },
    ]);
  };

  const removeProgramme = async (index: number) => {
    const item = programme[index];
    if (!item) return;
    if (item.id) {
      try {
        await apiFetch(`/settings/programme/${item.id}`, { method: "DELETE" });
      } catch (err: any) {
        setMessage({ type: "error", text: err?.message || "Failed to delete programme item." });
        return;
      }
    }
    setProgramme((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProgramme = async () => {
    setSavingProgramme(true);
    setMessage(null);
    try {
      let next = [...programme];
      for (let i = 0; i < next.length; i++) {
        const item = next[i];
        if (!item.eventDate || !item.startTime || !item.title) {
          throw new Error(`Programme row ${i + 1} needs a date, start time, and title.`);
        }
        const payload = {
          eventDate: item.eventDate,
          startTime: item.startTime,
          endTime: item.endTime || null,
          title: item.title,
          speakerOrLeader: item.speakerOrLeader || null,
          description: item.description || null,
          sortOrder: item.sortOrder || i,
        };
        if (item.id) {
          await apiFetch(`/settings/programme/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          const data = await apiFetch("/settings/programme", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          next[i] = {
            ...item,
            id: data.programmeItem?._id || data.programmeItem?.id,
          };
        }
      }
      setProgramme(next);
      setMessage({ type: "success", text: "Programme saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to save programme." });
    } finally {
      setSavingProgramme(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-[8px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none";
  const labelCls = "text-xs font-semibold text-[#111320] block mb-1";

  if (loading) {
    return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="h-14 bg-[#0E1020] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-bold text-white text-sm">Admin — Settings</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#8EE3D6] text-[#0E1020] text-xs font-bold hover:bg-[#7BD4C7] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-10 space-y-8">
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-2 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Event Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Event Name</label>
              <input className={inputCls} value={settings.eventName || ""} onChange={(e) => updateSetting("eventName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Theme</label>
              <input className={inputCls} value={settings.theme || ""} onChange={(e) => updateSetting("theme", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Starts At</label>
              <input type="datetime-local" className={inputCls} value={settings.startsAt || ""} onChange={(e) => updateSetting("startsAt", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Ends At</label>
              <input type="datetime-local" className={inputCls} value={settings.endsAt || ""} onChange={(e) => updateSetting("endsAt", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Registration Deadline</label>
              <input type="datetime-local" className={inputCls} value={settings.registrationDeadline || ""} onChange={(e) => updateSetting("registrationDeadline", e.target.value)} />
              <p className="mt-1 text-[11px] text-gray-400">
                Registration stays open until Ends At (the last conference day), including after the event starts.
              </p>
            </div>
            <div>
              <label className={labelCls}>Capacity Limit (blank = uncapped)</label>
              <input type="number" className={inputCls} value={settings.capacityLimit ?? ""} onChange={(e) => updateSetting("capacityLimit", e.target.value === "" ? null : Number(e.target.value))} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#111320]">Landing Page Content</h2>
            <p className="mt-1 text-xs text-gray-500">
              These fields appear on the public landing page. Changes go live as soon as you save — no redeploy needed.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Dates Text</label>
              <input className={inputCls} value={settings.datesText || ""} onChange={(e) => updateSetting("datesText", e.target.value)} placeholder="Tuesday 8 December to Friday 11 December 2026" />
            </div>
            <div>
              <label className={labelCls}>Short Date Badge</label>
              <input className={inputCls} value={settings.heroDatesLabel || ""} onChange={(e) => updateSetting("heroDatesLabel", e.target.value)} placeholder="December 8 – 11, 2026" />
            </div>
            <div>
              <label className={labelCls}>Opening Time</label>
              <input className={inputCls} value={settings.openingTimeLabel || ""} onChange={(e) => updateSetting("openingTimeLabel", e.target.value)} placeholder="4:00 PM WAT" />
            </div>
            <div>
              <label className={labelCls}>Registration Fee Label</label>
              <input className={inputCls} value={settings.registrationFeeLabel || ""} onChange={(e) => updateSetting("registrationFeeLabel", e.target.value)} placeholder="₦5,000 / $20 / €20 / £20" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Why Attend — Intro Paragraph</label>
              <textarea rows={3} className={inputCls} value={settings.whyAttendIntro || ""} onChange={(e) => updateSetting("whyAttendIntro", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Official Flyer — Description</label>
              <textarea rows={3} className={inputCls} value={settings.flyerDescription || ""} onChange={(e) => updateSetting("flyerDescription", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#111320]">Conference Programme</h2>
              <p className="mt-1 text-xs text-gray-500">
                Add and edit the schedule shown on the public programme page.
              </p>
            </div>
            <button
              type="button"
              onClick={addProgramme}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-[#111320] hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Session
            </button>
          </div>

          {programme.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              No programme sessions yet. Click “Add Session” to create the first one.
            </div>
          ) : (
            <div className="space-y-4">
              {programme.map((item, index) => (
                <div key={item.id || `new-${index}`} className="rounded-[14px] border border-gray-100 bg-[#FAFAFA] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <GripVertical className="w-4 h-4" /> Session {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProgramme(index)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>Date</label>
                      <input type="date" className={inputCls} value={item.eventDate} onChange={(e) => updateProgramme(index, "eventDate", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Start</label>
                      <input type="time" className={inputCls} value={item.startTime} onChange={(e) => updateProgramme(index, "startTime", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>End</label>
                      <input type="time" className={inputCls} value={item.endTime} onChange={(e) => updateProgramme(index, "endTime", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Order</label>
                      <input type="number" className={inputCls} value={item.sortOrder} onChange={(e) => updateProgramme(index, "sortOrder", Number(e.target.value))} />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className={labelCls}>Session Title</label>
                      <input className={inputCls} value={item.title} onChange={(e) => updateProgramme(index, "title", e.target.value)} placeholder="e.g. Opening Service" />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className={labelCls}>Speaker / Leader (optional)</label>
                      <input className={inputCls} value={item.speakerOrLeader} onChange={(e) => updateProgramme(index, "speakerOrLeader", e.target.value)} />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className={labelCls}>Description (optional)</label>
                      <textarea rows={2} className={inputCls} value={item.description} onChange={(e) => updateProgramme(index, "description", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveProgramme}
            disabled={savingProgramme || programme.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0E1020] text-white text-xs font-bold hover:bg-[#1a1d33] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {savingProgramme ? "Saving..." : "Save Programme"}
          </button>
        </section>

        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Venue & Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Venue Name</label>
              <input className={inputCls} value={settings.venueName || ""} onChange={(e) => updateSetting("venueName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Venue Address</label>
              <input className={inputCls} value={settings.venueAddress || ""} onChange={(e) => updateSetting("venueAddress", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <input className={inputCls} value={settings.contactPhone || ""} onChange={(e) => updateSetting("contactPhone", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact Email (optional)</label>
              <input type="email" className={inputCls} value={settings.contactEmail || ""} onChange={(e) => updateSetting("contactEmail", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Venue Map Embed URL</label>
              <input className={inputCls} value={settings.venueMapUrl || ""} onChange={(e) => updateSetting("venueMapUrl", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Registration Prices</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CURRENCIES.map((c) => (
              <div key={c}>
                <label className={labelCls}>{c}</label>
                <input
                  type="number"
                  step={minorUnits(c) === 1 ? "1" : "0.01"}
                  min="0"
                  className={inputCls}
                  value={getPriceMajor(c) || ""}
                  onChange={(e) => updatePrice(c, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">Amounts are per participant, flat rate. Stored in minor units (kobo/cents/pence). The fee label on the landing page is edited separately above.</p>
        </section>

        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Payment Provider Routing</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Currency</th>
                  <th className="pb-3 pr-4">Provider</th>
                  <th className="pb-3 pr-4">Enabled</th>
                  <th className="pb-3">Fee Policy</th>
                </tr>
              </thead>
              <tbody>
                {CURRENCIES.map((c) => {
                  const route = routes.find((r) => r.currency === c) || {
                    currency: c,
                    primaryProvider:
                      CURRENCY_CONFIG[c as SupportedCurrency]?.defaultProvider ?? "paystack",
                    isEnabled: true,
                    feePolicy: "organizer_absorbs",
                  };
                  return (
                    <tr key={c} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-bold text-[#111320]">{c}</td>
                      <td className="py-3 pr-4">
                        <select
                          className={inputCls}
                          value={route.primaryProvider}
                          onChange={(e) => updateRoute(c, "primaryProvider", e.target.value)}
                        >
                          {PROVIDERS.map((p) => (
                            <option key={p} value={p}>{p.replace("_", " ")}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={route.isEnabled}
                          onChange={(e) => updateRoute(c, "isEnabled", e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-3">
                        <select
                          className={inputCls}
                          value={route.feePolicy}
                          onChange={(e) => updateRoute(c, "feePolicy", e.target.value)}
                        >
                          <option value="organizer_absorbs">Organizer absorbs</option>
                          <option value="pass_to_customer">Pass to customer</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
