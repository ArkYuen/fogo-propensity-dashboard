"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Shared palette (matches the propensity dashboard).
// ---------------------------------------------------------------------------

const C = {
  primary: "#4e79a7", // muted blue   — forecasted / increase
  accent: "#f28e2c", // soft orange  — opportunity / cutoff
  baseline: "#cbd1d8", // pale gray   — neutral / baseline
  positive: "#59a14f", // muted green — increase / favorable
  warning: "#edc949", // amber       — watch
  critical: "#e15759", // muted red   — reduce / risk
  text: "#1f2937",
  textMid: "#4b5563",
  textMuted: "#6b7280",
  textSubtle: "#9ca3af",
  border: "#e5e7eb",
  borderSoft: "#eef0f3",
  bg: "#f7f8fa",
  bgPanel: "#f3f5f7",
  bgSubtle: "#fafbfc",
};

const CHANNEL_COLORS: Record<string, string> = {
  Meta: "#4e79a7",
  Google: "#f28e2c",
  TikTok: "#e15759",
  LinkedIn: "#76b7b2",
  Snapchat: "#edc949",
  Reddit: "#af7aa1",
  Pinterest: "#ff9da7",
  Search: "#4e79a7",
  "Paid Social": "#f28e2c",
  Programmatic: "#76b7b2",
  "Retail Media": "#edc949",
  YouTube: "#e15759",
  Display: "#af7aa1",
};

const FALLBACK_CHANNEL_COLOR = "#9ca3af";
const channelColor = (ch: string) =>
  CHANNEL_COLORS[ch] ?? FALLBACK_CHANNEL_COLOR;

// ---------------------------------------------------------------------------
// Types (mirror the route handlers).
// ---------------------------------------------------------------------------

type SummaryData = {
  current_total_daily_budget: number;
  recommended_total_daily_budget: number;
  forecasted_total_conversions_14d: number;
  avg_portfolio_forecasted_cpa: number;
  channels_to_increase: number;
  channels_to_reduce: number;
  high_risk_channels: number;
};

type ForecastRow = {
  date: string;
  channel: string;
  actual_cpa: number | null;
  forecasted_cpa: number | null;
  cpa_lower: number | null;
  cpa_upper: number | null;
  actual_conversions: number | null;
  forecasted_conversions: number | null;
  conversions_lower: number | null;
  conversions_upper: number | null;
};

type RecommendationRow = {
  channel: string;
  recent_cpa: number;
  avg_forecasted_cpa_14d: number;
  forecasted_cpa_change_pct: number;
  recent_avg_daily_spend: number;
  recommended_new_daily_budget: number;
  recommended_budget_shift_pct: number;
  risk_level: string;
  recommendation: string;
};

type ExplainerRow = {
  channel: string;
  executive_summary: string;
  explanation: string;
  recommendation: string;
  risk_level: string;
};

type Source = "bigquery" | "fallback";
type Wrapped<T> = { data: T; source: Source };

// ---------------------------------------------------------------------------
// Formatters / helpers
// ---------------------------------------------------------------------------

const fullNumber = new Intl.NumberFormat("en-US");
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const wholeCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const fmtCurrency2 = (v: number) =>
  `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtSignedCurrency = (v: number) => {
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${wholeCurrency.format(Math.abs(v))}`;
};

function fmtPct(value: number, digits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function shortDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

type Action = "scale" | "modestly_increase" | "maintain" | "reduce";

function classifyAction(r: RecommendationRow): Action {
  // Prefer the literal recommendation copy when it expresses intent
  // (this is the field the user asked us to read), otherwise fall
  // back to the shift percentage.
  const text = r.recommendation.toLowerCase();
  if (text.includes("reduce")) return "reduce";
  const isScale = r.recommended_budget_shift_pct >= 15;
  const isIncrease =
    text.includes("increase") || text.includes("scale");
  if (isScale && isIncrease) return "scale";
  if (isIncrease) return "modestly_increase";
  if (r.recommended_budget_shift_pct >= 15) return "scale";
  if (r.recommended_budget_shift_pct > 0.5) return "modestly_increase";
  if (r.recommended_budget_shift_pct < -0.5) return "reduce";
  return "maintain";
}

function actionStyles(action: Action): { color: string; label: string } {
  switch (action) {
    case "scale":
      return { color: C.positive, label: "Scale" };
    case "modestly_increase":
      return { color: C.primary, label: "Modestly Increase" };
    case "maintain":
      return { color: C.textMid, label: "Maintain" };
    case "reduce":
      return { color: C.critical, label: "Reduce" };
  }
}

function riskStyles(level: string): { color: string; label: string } {
  const v = level.toLowerCase();
  if (v === "high") return { color: C.critical, label: "High risk" };
  if (v === "medium" || v === "med")
    return { color: C.warning, label: "Medium risk" };
  return { color: C.positive, label: "Low risk" };
}

function riskNumeric(level: string): number {
  const v = level.toLowerCase();
  if (v === "high") return 3;
  if (v === "medium" || v === "med") return 2;
  return 1;
}

// Spend-weighted blended CPA: total spend ÷ implied total conversions.
function blendedCpa(rows: { spend: number; cpa: number }[]): number {
  let totalSpend = 0;
  let impliedConversions = 0;
  for (const r of rows) {
    if (r.cpa <= 0 || r.spend <= 0) continue;
    totalSpend += r.spend;
    impliedConversions += r.spend / r.cpa;
  }
  if (impliedConversions === 0) return 0;
  return totalSpend / impliedConversions;
}

// ---------------------------------------------------------------------------
// Visual atoms (kept local so the propensity page stays untouched).
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7280]">
      {children}
    </p>
  );
}

function CardPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-[#e5e7eb] bg-white ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-[#e5e7eb] bg-[#fafbfc] px-4 py-2.5">
      <div>
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <p className="mt-0.5 text-[13px] font-semibold leading-tight text-[#1f2937]">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-4 text-[#6b7280]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KPICard({
  label,
  value,
  sub,
  accent = C.text,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delta?: { text: string; color?: string };
}) {
  return (
    <div className="border border-[#e5e7eb] bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-[24px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: accent }}
        >
          {value}
        </span>
        {delta ? (
          <span
            className="text-[11px] font-medium tabular-nums"
            style={{ color: delta.color ?? C.textMid }}
          >
            {delta.text}
          </span>
        ) : null}
      </div>
      {sub ? (
        <p className="mt-1 text-[11px] leading-4 text-[#6b7280]">{sub}</p>
      ) : null}
    </div>
  );
}

function Pill({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[10px] font-medium leading-none"
      style={{ color, borderColor: color, background: `${color}10` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: { label: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium"
      style={{ color: status.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: status.color }}
      />
      {status.label}
    </span>
  );
}

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="group relative flex h-7 items-center gap-2 border border-[#e5e7eb] bg-white px-2.5 text-[11px] text-[#4b5563] hover:border-[#9ca3af]">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[#9ca3af]">
        {label}
      </span>
      <span className="font-medium text-[#1f2937]">{value}</span>
      <svg
        viewBox="0 0 12 12"
        className="ml-1 h-2.5 w-2.5 text-[#9ca3af]"
        aria-hidden
      >
        <path
          d="M3 4.5l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ModeledTag() {
  return (
    <span className="inline-flex items-center gap-1 border border-[#e5e7eb] bg-white px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#6b7280]">
      <span className="h-1 w-1 rounded-full bg-[#9ca3af]" />
      Modeled estimate
    </span>
  );
}

type TooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter(
    (p) =>
      typeof p.dataKey !== "string" ||
      (!p.dataKey.endsWith("_band_lower") &&
        !p.dataKey.endsWith("_band_offset")),
  );
  return (
    <div className="border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] shadow-sm">
      {label !== undefined && label !== "" ? (
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">
          {typeof label === "string" ? shortDate(label) : label}
        </div>
      ) : null}
      {visible.map((entry, idx) => (
        <div
          key={`${entry.dataKey ?? idx}`}
          className="flex items-center gap-2.5 py-0.5"
        >
          <span
            className="h-2 w-2"
            style={{ background: entry.color ?? C.text }}
          />
          <span className="text-[#4b5563]">{entry.name ?? entry.dataKey}</span>
          <span className="ml-auto font-medium tabular-nums text-[#1f2937]">
            {typeof entry.value === "number"
              ? format(entry.value)
              : String(entry.value ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BudgetReallocationPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [forecast, setForecast] = useState<ForecastRow[] | null>(null);
  const [recs, setRecs] = useState<RecommendationRow[] | null>(null);
  const [explainers, setExplainers] = useState<ExplainerRow[] | null>(null);
  const [bqStatus, setBqStatus] = useState<
    "loading" | "connected" | "fallback"
  >("loading");
  const [forecastChannel, setForecastChannel] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const sources: Source[] = [];

    async function load<T>(url: string): Promise<T | null> {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Wrapped<T>;
        if (json.source) sources.push(json.source);
        return json.data ?? null;
      } catch {
        sources.push("fallback");
        return null;
      }
    }

    Promise.all([
      load<SummaryData>("/api/timesfm/summary"),
      load<ForecastRow[]>("/api/timesfm/forecast"),
      load<RecommendationRow[]>("/api/timesfm/recommendations"),
      load<ExplainerRow[]>("/api/timesfm/explainer"),
    ]).then(([s, f, r, e]) => {
      if (cancelled) return;
      setSummary(s);
      setForecast(f);
      setRecs(r);
      setExplainers(e);
      const allLive =
        sources.length > 0 && sources.every((src) => src === "bigquery");
      setBqStatus(allLive ? "connected" : "fallback");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const allChannels = useMemo(() => {
    const set = new Set<string>();
    forecast?.forEach((r) => set.add(r.channel));
    recs?.forEach((r) => set.add(r.channel));
    return Array.from(set).filter(Boolean);
  }, [forecast, recs]);

  useEffect(() => {
    if (forecastChannel || !forecast?.length) return;
    const first = Array.from(new Set(forecast.map((r) => r.channel)))[0];
    if (first) setForecastChannel(first);
  }, [forecast, forecastChannel]);

  // -------------------------------------------------------------------------
  // Decision-derived values
  // -------------------------------------------------------------------------

  type EnrichedRec = RecommendationRow & {
    action: Action;
    budget_change: number;
  };

  const enriched: EnrichedRec[] = useMemo(() => {
    return (recs ?? []).map((r) => ({
      ...r,
      action: classifyAction(r),
      budget_change: r.recommended_new_daily_budget - r.recent_avg_daily_spend,
    }));
  }, [recs]);

  const reduceChannels = enriched.filter((r) => r.action === "reduce");
  const increaseChannels = enriched.filter(
    (r) => r.action === "scale" || r.action === "modestly_increase",
  );
  const maintainChannels = enriched.filter((r) => r.action === "maintain");

  const totalReducedPerDay = reduceChannels.reduce(
    (s, r) => s + Math.abs(r.budget_change),
    0,
  );
  const totalIncreasedPerDay = increaseChannels.reduce(
    (s, r) => s + r.budget_change,
    0,
  );
  const reallocatedPerDay = Math.max(totalReducedPerDay, totalIncreasedPerDay);
  const netDailyChange = totalIncreasedPerDay - totalReducedPerDay;

  const currentDailyBudget = enriched.reduce(
    (s, r) => s + r.recent_avg_daily_spend,
    0,
  );
  const recommendedDailyBudget = enriched.reduce(
    (s, r) => s + r.recommended_new_daily_budget,
    0,
  );
  const current14dBudget = currentDailyBudget * 14;
  const recommended14dBudget = recommendedDailyBudget * 14;

  const currentBlendedCpa = useMemo(
    () =>
      blendedCpa(
        enriched.map((r) => ({
          spend: r.recent_avg_daily_spend,
          cpa: r.recent_cpa,
        })),
      ),
    [enriched],
  );
  const recommendedBlendedCpa = useMemo(
    () =>
      blendedCpa(
        enriched.map((r) => ({
          spend: r.recommended_new_daily_budget,
          cpa: r.avg_forecasted_cpa_14d,
        })),
      ),
    [enriched],
  );
  const cpaImprovementPct =
    currentBlendedCpa > 0
      ? ((recommendedBlendedCpa - currentBlendedCpa) / currentBlendedCpa) * 100
      : 0;

  // Implied 14d conversions under each scenario.
  const currentImpliedConversions =
    currentBlendedCpa > 0 ? current14dBudget / currentBlendedCpa : 0;
  const recommendedImpliedConversions =
    recommendedBlendedCpa > 0
      ? recommended14dBudget / recommendedBlendedCpa
      : 0;
  const conversionLift =
    recommendedImpliedConversions - currentImpliedConversions;

  const highRiskCount = enriched.filter(
    (r) => r.risk_level.toLowerCase() === "high",
  ).length;
  const mediumRiskCount = enriched.filter((r) =>
    ["medium", "med"].includes(r.risk_level.toLowerCase()),
  ).length;
  const channelsToWatch = highRiskCount + mediumRiskCount;

  // -------------------------------------------------------------------------
  // Hero narrative
  // -------------------------------------------------------------------------

  const heroSentence = useMemo(() => {
    if (!enriched.length)
      return "Loading recommended action…";
    if (!reduceChannels.length && !increaseChannels.length) {
      return "No reallocation recommended for the next planning cycle — channel efficiency is forecast to stay near baseline.";
    }
    const fromList = joinList(reduceChannels.map((r) => r.channel));
    const toList = joinList(increaseChannels.map((r) => r.channel));
    const dollarLine = reallocatedPerDay
      ? `Shift ${wholeCurrency.format(
          reallocatedPerDay,
        )}/day in flexible budget`
      : "Hold the current allocation";
    const fromTo =
      fromList && toList
        ? ` away from ${fromList} into ${toList}`
        : fromList
          ? ` away from ${fromList}`
          : toList
            ? ` toward ${toList}`
            : "";
    const cpaPart =
      cpaImprovementPct < -0.5
        ? `lower blended CPA (${fmtPct(cpaImprovementPct)})`
        : cpaImprovementPct > 0.5
          ? `slightly higher blended CPA (${fmtPct(cpaImprovementPct)})`
          : "stable blended CPA";
    const convPart =
      conversionLift > 5
        ? ` and ~${compactNumber.format(
            conversionLift,
          )} more conversions over the 14-day forecast window`
        : conversionLift < -5
          ? ` and ~${compactNumber.format(
              Math.abs(conversionLift),
            )} fewer conversions over the 14-day forecast window`
          : " with stable conversion volume over the 14-day forecast window";
    return `${dollarLine}${fromTo} for the next 7 days. Expected result: ${cpaPart}${convPart}.`;
  }, [
    enriched.length,
    reduceChannels,
    increaseChannels,
    reallocatedPerDay,
    cpaImprovementPct,
    conversionLift,
  ]);

  // -------------------------------------------------------------------------
  // Section data: waterfall, ranking, quadrant, forecast slice
  // -------------------------------------------------------------------------

  const waterfallData = useMemo(
    () =>
      enriched
        .slice()
        .sort((a, b) => b.budget_change - a.budget_change)
        .map((r) => ({ ...r, name: r.channel })),
    [enriched],
  );

  // Symmetric domain so positive and negative bars are visually comparable.
  const waterfallDomain = useMemo(() => {
    const max = Math.max(
      1,
      ...waterfallData.map((r) => Math.abs(r.budget_change)),
    );
    const padded = Math.ceil(max / 500) * 500;
    return [-padded, padded] as [number, number];
  }, [waterfallData]);

  const actionRank = (a: Action) =>
    a === "scale" || a === "modestly_increase" ? 0 : a === "maintain" ? 1 : 2;

  const rankedRows = useMemo(() => {
    return enriched
      .slice()
      .sort((a, b) => {
        const ar = actionRank(a.action);
        const br = actionRank(b.action);
        if (ar !== br) return ar - br;
        if (ar === 0) {
          // Increases: lowest forecasted CPA first
          return a.avg_forecasted_cpa_14d - b.avg_forecasted_cpa_14d;
        }
        if (ar === 1) {
          // Maintain: lowest forecasted CPA first
          return a.avg_forecasted_cpa_14d - b.avg_forecasted_cpa_14d;
        }
        // Reduce: highest CPA deterioration first, fall back to highest CPA
        if (a.forecasted_cpa_change_pct !== b.forecasted_cpa_change_pct)
          return b.forecasted_cpa_change_pct - a.forecasted_cpa_change_pct;
        return b.avg_forecasted_cpa_14d - a.avg_forecasted_cpa_14d;
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [enriched]);

  // Quadrant points (CPA × risk) with explainer copy for tooltip.
  const explainerByChannel = useMemo(() => {
    const map = new Map<string, ExplainerRow>();
    explainers?.forEach((e) => map.set(e.channel, e));
    return map;
  }, [explainers]);

  type QuadPoint = {
    channel: string;
    cpa: number;
    risk: number;
    riskLabel: string;
    action: Action;
    explanation: string;
  };
  const quadrantPoints: QuadPoint[] = useMemo(
    () =>
      enriched.map((r) => ({
        channel: r.channel,
        cpa: r.avg_forecasted_cpa_14d,
        risk: riskNumeric(r.risk_level),
        riskLabel: riskStyles(r.risk_level).label,
        action: r.action,
        explanation:
          explainerByChannel.get(r.channel)?.executive_summary ?? "",
      })),
    [enriched, explainerByChannel],
  );

  const cpaMedian = useMemo(() => {
    if (!quadrantPoints.length) return 0;
    const arr = quadrantPoints.map((p) => p.cpa).sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
  }, [quadrantPoints]);

  // Per-channel forecast slice, with derived band columns for the area.
  const channelForecast = useMemo(() => {
    if (!forecast || !forecastChannel) return [];
    return forecast
      .filter((r) => r.channel === forecastChannel)
      .map((r) => ({
        ...r,
        cpa_band_lower: r.cpa_lower,
        cpa_band_offset:
          r.cpa_lower != null && r.cpa_upper != null
            ? r.cpa_upper - r.cpa_lower
            : null,
        conv_band_lower: r.conversions_lower,
        conv_band_offset:
          r.conversions_lower != null && r.conversions_upper != null
            ? r.conversions_upper - r.conversions_lower
            : null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [forecast, forecastChannel]);

  const snapshotDate = useMemo(() => {
    const all: string[] = [];
    forecast?.forEach((r) => all.push(r.date));
    if (!all.length) return "";
    return shortDate(all.sort().at(-1)!);
  }, [forecast]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#1f2937]">
      {/* Status strip */}
      <div className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex h-9 max-w-[1440px] items-center gap-3 px-6 text-[11px] text-[#6b7280]">
          <span className="font-semibold tracking-tight text-[#1f2937]">
            tombras-demo
          </span>
          <span className="text-[#d1d5db]">/</span>
          <span>timesfm_staging</span>
          <span className="text-[#d1d5db]">/</span>
          <span>budget-reallocation</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background:
                    bqStatus === "connected"
                      ? C.positive
                      : bqStatus === "loading"
                        ? C.baseline
                        : C.warning,
                }}
              />
              {bqStatus === "connected"
                ? "BigQuery connected"
                : bqStatus === "loading"
                  ? "Loading…"
                  : "Using demo data"}
            </span>
            {snapshotDate ? (
              <>
                <span className="text-[#d1d5db]">·</span>
                <span className="tabular-nums">Snapshot {snapshotDate}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>TimesFM · Media decisioning</SectionLabel>
              <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-[#1f2937]">
                TimesFM Budget Reallocation
              </h1>
              <p className="mt-0.5 max-w-2xl text-xs leading-5 text-[#6b7280]">
                Forecasted channel efficiency, recommended budget movement,
                and expected media impact for the next planning cycle.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button className="h-7 border border-[#1f2937] bg-[#1f2937] px-3 text-[11px] font-medium text-white hover:bg-[#374151]">
                Export plan
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-5 px-6 py-5">
        {/* ===== Section 1 — Recommended Action Hero =================== */}
        <section className="space-y-3">
          <CardPanel className="bg-gradient-to-br from-white to-[#fafbfc]">
            <div className="px-5 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <SectionLabel>Recommended action</SectionLabel>
                {enriched.length ? <ModeledTag /> : null}
              </div>
              <p className="mt-2 max-w-4xl text-[16px] font-medium leading-7 tracking-tight text-[#1f2937]">
                {heroSentence}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#4b5563]">
                {reduceChannels.length ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: C.critical }}
                    />
                    Reducing {reduceChannels.length} channel
                    {reduceChannels.length === 1 ? "" : "s"} ·{" "}
                    {wholeCurrency.format(totalReducedPerDay)}/day
                  </span>
                ) : null}
                {increaseChannels.length ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: C.positive }}
                    />
                    Increasing {increaseChannels.length} channel
                    {increaseChannels.length === 1 ? "" : "s"} ·{" "}
                    {wholeCurrency.format(totalIncreasedPerDay)}/day
                  </span>
                ) : null}
                {maintainChannels.length ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: C.baseline }}
                    />
                    Maintaining {maintainChannels.length} channel
                    {maintainChannels.length === 1 ? "" : "s"}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: netDailyChange >= 0 ? C.primary : C.accent,
                    }}
                  />
                  Net daily change {fmtSignedCurrency(netDailyChange)}
                </span>
              </div>
            </div>
          </CardPanel>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Budget reallocated / day"
              value={wholeCurrency.format(reallocatedPerDay)}
              accent={C.text}
              sub={`Out of ${wholeCurrency.format(currentDailyBudget)} current daily portfolio.`}
              delta={
                netDailyChange !== 0
                  ? {
                      text: `Net ${fmtSignedCurrency(netDailyChange)}`,
                      color: netDailyChange >= 0 ? C.primary : C.accent,
                    }
                  : undefined
              }
            />
            <KPICard
              label="Expected 14-day conversions"
              value={
                summary
                  ? compactNumber.format(
                      summary.forecasted_total_conversions_14d,
                    )
                  : "—"
              }
              accent={C.primary}
              sub="Portfolio forecast over the 14-day horizon."
              delta={
                conversionLift !== 0 && summary
                  ? {
                      text: `${conversionLift >= 0 ? "+" : "−"}${compactNumber.format(
                        Math.abs(conversionLift),
                      )} vs current`,
                      color: conversionLift >= 0 ? C.positive : C.critical,
                    }
                  : undefined
              }
            />
            <KPICard
              label="Avg forecasted CPA"
              value={
                summary
                  ? fmtCurrency2(summary.avg_portfolio_forecasted_cpa)
                  : "—"
              }
              accent={C.text}
              sub="Spend-weighted across recommended channels."
              delta={
                Math.abs(cpaImprovementPct) > 0.1 && summary
                  ? {
                      text: `${fmtPct(cpaImprovementPct)} vs current`,
                      color: cpaImprovementPct < 0 ? C.positive : C.critical,
                    }
                  : undefined
              }
            />
            <KPICard
              label="Channels to watch"
              value={String(channelsToWatch)}
              accent={highRiskCount > 0 ? C.critical : C.warning}
              sub={`${highRiskCount} high · ${mediumRiskCount} medium · ${
                enriched.length - channelsToWatch
              } low`}
            />
          </div>
        </section>

        {/* ===== Section 2 — Do Nothing vs Recommended Shift ============ */}
        <CardPanel>
          <PanelHeader
            eyebrow="Step 2 · Scenario comparison"
            title="Do nothing vs. recommended shift"
            description="Side-by-side view of the current allocation and the TimesFM-recommended shift. Lift figures are directional modeled estimates."
            action={<ModeledTag />}
          />
          <div className="grid gap-0 md:grid-cols-2">
            <ScenarioColumn
              title="Scenario A · Current allocation"
              eyebrow="Hold the line"
              accent={C.baseline}
              dailyBudget={currentDailyBudget}
              budget14d={current14dBudget}
              forecastConversions={currentImpliedConversions}
              forecastCpa={currentBlendedCpa}
              note="Continues the current daily mix unchanged."
            />
            <ScenarioColumn
              title="Scenario B · Recommended shift"
              eyebrow="TimesFM plan"
              accent={C.primary}
              dailyBudget={recommendedDailyBudget}
              budget14d={recommended14dBudget}
              forecastConversions={recommendedImpliedConversions}
              forecastCpa={recommendedBlendedCpa}
              comparison={{
                cpaDeltaPct: cpaImprovementPct,
                conversionLift,
              }}
              border="md:border-l border-[#e5e7eb]"
              note="Applies the per-channel recommended_new_daily_budget."
            />
          </div>
          <p className="border-t border-[#eef0f3] bg-[#fafbfc] px-4 py-2 text-[10px] text-[#6b7280]">
            CPA blended from spend ÷ implied conversions. Lift =
            recommended_14d_budget ÷ avg_forecasted_cpa_14d −
            current_14d_budget ÷ recent_cpa.
          </p>
        </CardPanel>

        {/* ===== Section 3 — Budget Movement Waterfall ================== */}
        <CardPanel>
          <PanelHeader
            eyebrow="Step 3 · Budget movement"
            title="Per-channel daily budget change"
            description="Recommended new daily budget minus recent average daily spend, sorted by largest increase to largest reduction."
          />
          <div className="grid gap-4 p-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="h-72">
                {waterfallData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[11px] text-[#9ca3af]">
                    Loading…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={waterfallData}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        stroke={C.borderSoft}
                      />
                      <XAxis
                        type="number"
                        domain={waterfallDomain}
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          (v as number) >= 0
                            ? wholeCurrency.format(v as number)
                            : `−${wholeCurrency.format(Math.abs(v as number))}`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={C.textSubtle}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={110}
                      />
                      <ReferenceLine x={0} stroke={C.text} strokeWidth={1} />
                      <Tooltip
                        cursor={{ fill: C.bgPanel }}
                        content={
                          <ChartTooltip format={(v) => fmtSignedCurrency(v)} />
                        }
                      />
                      <Bar
                        dataKey="budget_change"
                        name="Daily Δ"
                        radius={[0, 0, 0, 0]}
                        barSize={18}
                      >
                        {waterfallData.map((row) => (
                          <Cell
                            key={row.channel}
                            fill={
                              row.budget_change > 0
                                ? C.positive
                                : row.budget_change < 0
                                  ? C.critical
                                  : C.baseline
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="budget_change"
                          position="right"
                          formatter={(v) =>
                            typeof v === "number"
                              ? fmtSignedCurrency(v)
                              : String(v ?? "")
                          }
                          style={{ fill: C.textMid, fontSize: 10 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[10px] text-[#6b7280]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-3"
                    style={{ background: C.positive }}
                  />
                  Increase
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-3"
                    style={{ background: C.critical }}
                  />
                  Reduce
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-3"
                    style={{ background: C.baseline }}
                  />
                  No change
                </span>
              </div>
            </div>

            <div className="border-t border-[#eef0f3] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <SectionLabel>Movement detail</SectionLabel>
              <div className="mt-2 divide-y divide-[#eef0f3] border-y border-[#eef0f3]">
                {waterfallData.map((row) => (
                  <div
                    key={row.channel}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-2"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: channelColor(row.channel) }}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[#1f2937]">
                        {row.channel}
                      </div>
                      <div className="text-[10px] tabular-nums text-[#9ca3af]">
                        {wholeCurrency.format(row.recent_avg_daily_spend)} →{" "}
                        {wholeCurrency.format(row.recommended_new_daily_budget)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-[11px] font-semibold tabular-nums"
                        style={{
                          color:
                            row.budget_change > 0
                              ? C.positive
                              : row.budget_change < 0
                                ? C.critical
                                : C.textMid,
                        }}
                      >
                        {fmtSignedCurrency(row.budget_change)}
                      </div>
                      <div className="text-[10px] tabular-nums text-[#9ca3af]">
                        {fmtPct(row.recommended_budget_shift_pct)}
                      </div>
                    </div>
                  </div>
                ))}
                {!waterfallData.length ? (
                  <p className="py-3 text-[11px] text-[#9ca3af]">
                    Loading…
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </CardPanel>

        {/* ===== Section 4 — From / To Reallocation Map ================= */}
        <CardPanel>
          <PanelHeader
            eyebrow="Step 4 · From / to map"
            title="Reduce here · reallocate there"
            description="A planning view: channels recommended for reduction sit on the left; channels recommended for increase sit on the right. Pairings are directional, not exact dollar transfers."
            action={<ModeledTag />}
          />
          <div className="grid gap-0 md:grid-cols-2">
            <FromToColumn
              title="Reduce budget from"
              accent={C.critical}
              direction="from"
              rows={reduceChannels}
              explainerByChannel={explainerByChannel}
            />
            <div className="border-t border-[#e5e7eb] md:border-l md:border-t-0">
              <FromToColumn
                title="Reallocate toward"
                accent={C.positive}
                direction="to"
                rows={increaseChannels}
                explainerByChannel={explainerByChannel}
              />
            </div>
          </div>
          <p className="border-t border-[#eef0f3] bg-[#fafbfc] px-4 py-2 text-[10px] text-[#6b7280]">
            Total reducing: {wholeCurrency.format(totalReducedPerDay)}/day ·
            Total increasing: {wholeCurrency.format(totalIncreasedPerDay)}/day
            · Net: {fmtSignedCurrency(netDailyChange)}/day.
          </p>
        </CardPanel>

        {/* ===== Section 5 — Channel Opportunity Ranking ================ */}
        <CardPanel>
          <PanelHeader
            eyebrow="Step 5 · Opportunity ranking"
            title="Ranked actions by channel"
            description="Increase candidates first (sorted by lowest forecasted CPA), then maintain, then reduce (sorted by largest CPA deterioration)."
          />
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#e5e7eb] hover:bg-transparent">
                <TableHead className="h-8 px-3 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Rank
                </TableHead>
                <TableHead className="h-8 px-3 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Channel
                </TableHead>
                <TableHead className="h-8 px-3 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Action
                </TableHead>
                <TableHead className="h-8 px-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Recent CPA
                </TableHead>
                <TableHead className="h-8 px-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Forecast CPA
                </TableHead>
                <TableHead className="h-8 px-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  CPA Δ
                </TableHead>
                <TableHead className="h-8 px-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Current $/day
                </TableHead>
                <TableHead className="h-8 px-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Recommended $/day
                </TableHead>
                <TableHead className="h-8 px-3 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Δ $/day
                </TableHead>
                <TableHead className="h-8 px-3 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Risk
                </TableHead>
                <TableHead className="h-8 px-3 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Reason
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedRows.map((row) => {
                const action = actionStyles(row.action);
                const risk = riskStyles(row.risk_level);
                return (
                  <TableRow
                    key={row.channel}
                    className="border-b border-[#eef0f3] last:border-b-0 hover:bg-[#fafbfc]"
                  >
                    <TableCell className="px-3 py-2 text-[11px] tabular-nums text-[#9ca3af]">
                      {row.rank}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-[11px] font-medium text-[#1f2937]">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: channelColor(row.channel) }}
                        />
                        {row.channel}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Pill label={action.label} color={action.color} />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-[11px] tabular-nums text-[#4b5563]">
                      {fmtCurrency2(row.recent_cpa)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-[11px] font-medium tabular-nums text-[#1f2937]">
                      {fmtCurrency2(row.avg_forecasted_cpa_14d)}
                    </TableCell>
                    <TableCell
                      className="px-3 py-2 text-right text-[11px] font-medium tabular-nums"
                      style={{
                        color:
                          row.forecasted_cpa_change_pct < 0
                            ? C.positive
                            : row.forecasted_cpa_change_pct > 0
                              ? C.critical
                              : C.textMid,
                      }}
                    >
                      {fmtPct(row.forecasted_cpa_change_pct)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-[11px] tabular-nums text-[#4b5563]">
                      {wholeCurrency.format(row.recent_avg_daily_spend)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-[11px] font-medium tabular-nums text-[#1f2937]">
                      {wholeCurrency.format(row.recommended_new_daily_budget)}
                    </TableCell>
                    <TableCell
                      className="px-3 py-2 text-right text-[11px] font-medium tabular-nums"
                      style={{
                        color:
                          row.budget_change > 0
                            ? C.positive
                            : row.budget_change < 0
                              ? C.critical
                              : C.textMid,
                      }}
                    >
                      {fmtSignedCurrency(row.budget_change)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Pill label={risk.label} color={risk.color} />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-[11px] leading-4 text-[#4b5563]">
                      {row.recommendation}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rankedRows.length ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="px-4 py-6 text-center text-[11px] text-[#9ca3af]"
                  >
                    Loading recommendations…
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardPanel>

        {/* ===== Section 6 — Risk vs Reward Quadrant ==================== */}
        <CardPanel>
          <PanelHeader
            eyebrow="Step 6 · Risk vs reward"
            title="Forecasted CPA × modeled risk"
            description="Bottom-left is the safest place to scale. Top-right is where to pull back. Median forecasted CPA splits efficient from inefficient."
          />
          <div className="grid gap-4 p-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="h-80">
                {quadrantPoints.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[11px] text-[#9ca3af]">
                    Loading…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 12, right: 16, left: 0, bottom: 16 }}
                    >
                      <CartesianGrid stroke={C.borderSoft} />
                      <XAxis
                        type="number"
                        dataKey="cpa"
                        name="Forecasted CPA"
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${Math.round(v as number)}`}
                        label={{
                          value:
                            "Forecasted CPA →  (lower = more efficient)",
                          position: "insideBottom",
                          offset: -6,
                          fill: C.textMuted,
                          fontSize: 10,
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="risk"
                        name="Risk"
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={[0.5, 3.5]}
                        ticks={[1, 2, 3]}
                        tickFormatter={(v) =>
                          v === 1 ? "Low" : v === 2 ? "Med" : "High"
                        }
                        label={{
                          value: "Risk ↑",
                          position: "insideLeft",
                          angle: -90,
                          fill: C.textMuted,
                          fontSize: 10,
                          dy: 18,
                        }}
                      />
                      <ZAxis range={[120, 120]} />
                      {cpaMedian > 0 ? (
                        <ReferenceLine
                          x={cpaMedian}
                          stroke={C.border}
                          strokeDasharray="4 3"
                        />
                      ) : null}
                      <ReferenceLine
                        y={2}
                        stroke={C.border}
                        strokeDasharray="4 3"
                      />
                      <Tooltip
                        cursor={{ stroke: C.border, strokeDasharray: "3 3" }}
                        content={<QuadrantTooltip />}
                      />
                      <Scatter data={quadrantPoints}>
                        {quadrantPoints.map((p) => (
                          <Cell
                            key={p.channel}
                            fill={
                              p.action === "scale" ||
                              p.action === "modestly_increase"
                                ? C.positive
                                : p.action === "reduce"
                                  ? C.critical
                                  : C.textMid
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="channel"
                          position="right"
                          style={{ fill: C.textMid, fontSize: 10 }}
                        />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 self-start lg:grid-cols-1">
              <QuadrantLegend
                label="Scale Now"
                hint="Low CPA · Low risk"
                color={C.positive}
                description="Efficient and stable — the strongest place to add budget."
              />
              <QuadrantLegend
                label="Efficient but Volatile"
                hint="Low CPA · Higher risk"
                color={C.warning}
                description="Good efficiency, but uncertainty is high — scale cautiously."
              />
              <QuadrantLegend
                label="Stable but Inefficient"
                hint="High CPA · Low risk"
                color={C.textMid}
                description="Predictable but expensive — hold or trim."
              />
              <QuadrantLegend
                label="Reduce / Monitor"
                hint="High CPA · High risk"
                color={C.critical}
                description="Worst-case quadrant — the model recommends pulling back."
              />
            </div>
          </div>
        </CardPanel>

        {/* ===== Section 7 — Forecast Charts (secondary) ================ */}
        <CardPanel>
          <PanelHeader
            eyebrow="Step 7 · Forecast support"
            title="Actuals vs. TimesFM forecast"
            description="Forecasts are used to estimate near-term CPA and conversion movement. Recommendations above are based on expected efficiency, budget shift constraints, and modeled risk."
            action={
              allChannels.length ? (
                <FilterPill
                  label="Channel"
                  value={forecastChannel || allChannels[0]}
                  options={allChannels}
                  onChange={setForecastChannel}
                />
              ) : null
            }
          />
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <ForecastChart
              title="Conversions: actual vs forecast"
              data={channelForecast}
              actualKey="actual_conversions"
              forecastKey="forecasted_conversions"
              bandLowerKey="conv_band_lower"
              bandOffsetKey="conv_band_offset"
              yFormat={(v) => compactNumber.format(v)}
              tooltipFormat={(v) => fullNumber.format(Math.round(v))}
            />
            <ForecastChart
              title="CPA: actual vs forecast"
              data={channelForecast}
              actualKey="actual_cpa"
              forecastKey="forecasted_cpa"
              bandLowerKey="cpa_band_lower"
              bandOffsetKey="cpa_band_offset"
              yFormat={(v) => `$${Math.round(v)}`}
              tooltipFormat={fmtCurrency2}
            />
          </div>
        </CardPanel>

        {/* ===== Section 8 — Executive Explanation ====================== */}
        <section className="space-y-3">
          <CardPanel>
            <PanelHeader
              eyebrow="Step 8 · Executive narrative"
              title="What the model is telling the media team"
              description="One paragraph summary across all channels, then per-channel detail below."
            />
            <div className="space-y-2 px-5 py-4 text-[12px] leading-6 text-[#1f2937]">
              <p>
                <strong className="font-semibold">Reduce:</strong>{" "}
                {reduceChannels.length
                  ? joinList(reduceChannels.map((r) => r.channel))
                  : "no channels this cycle"}
                {reduceChannels.length
                  ? ` (${wholeCurrency.format(totalReducedPerDay)}/day combined).`
                  : "."}
              </p>
              <p>
                <strong className="font-semibold">Increase:</strong>{" "}
                {increaseChannels.length
                  ? joinList(increaseChannels.map((r) => r.channel))
                  : "no channels this cycle"}
                {increaseChannels.length
                  ? ` (${wholeCurrency.format(totalIncreasedPerDay)}/day combined).`
                  : "."}
              </p>
              <p>
                <strong className="font-semibold">Why:</strong> Forecasted CPA
                is improving where the model recommends increases and
                deteriorating where it recommends reductions; competitor
                pressure and band width determine the assigned risk level for
                each channel.
              </p>
              <p>
                <strong className="font-semibold">Watch next:</strong>{" "}
                {channelsToWatch
                  ? `${channelsToWatch} channel${
                      channelsToWatch === 1 ? "" : "s"
                    } sit in medium-or-higher risk — `
                  : "no channels are flagged at elevated risk — "}
                re-check forecast vs. actuals every 3–4 days and
                recalibrate before the next planning cycle.
              </p>
            </div>
          </CardPanel>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(explainers ?? []).map((row) => {
              const matchingRec = enriched.find(
                (r) => r.channel === row.channel,
              );
              const risk = riskStyles(row.risk_level);
              return (
                <CardPanel key={row.channel}>
                  <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] bg-[#fafbfc] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2"
                        style={{ background: channelColor(row.channel) }}
                      />
                      <p className="text-[13px] font-semibold leading-tight text-[#1f2937]">
                        {row.channel}
                      </p>
                    </div>
                    <StatusBadge status={risk} />
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="text-[12px] font-medium leading-5 text-[#1f2937]">
                      {row.executive_summary}
                    </p>
                    <div>
                      <SectionLabel>Why</SectionLabel>
                      <p className="mt-1 text-[11px] leading-5 text-[#4b5563]">
                        {row.explanation}
                      </p>
                    </div>
                    {matchingRec ? (
                      <div className="grid grid-cols-2 gap-2 border-t border-[#eef0f3] pt-3">
                        <div>
                          <SectionLabel>Daily shift</SectionLabel>
                          <p
                            className="mt-1 text-[12px] font-semibold tabular-nums"
                            style={{
                              color:
                                matchingRec.recommended_budget_shift_pct > 0
                                  ? C.positive
                                  : matchingRec.recommended_budget_shift_pct < 0
                                    ? C.critical
                                    : C.textMid,
                            }}
                          >
                            {fmtPct(matchingRec.recommended_budget_shift_pct)}
                          </p>
                        </div>
                        <div>
                          <SectionLabel>New $/day</SectionLabel>
                          <p className="mt-1 text-[12px] font-semibold tabular-nums text-[#1f2937]">
                            {wholeCurrency.format(
                              matchingRec.recommended_new_daily_budget,
                            )}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="border-t border-[#eef0f3] pt-3">
                      <SectionLabel>Recommendation</SectionLabel>
                      <p className="mt-1 text-[11px] font-medium leading-5 text-[#1f2937]">
                        {row.recommendation}
                      </p>
                    </div>
                  </div>
                </CardPanel>
              );
            })}
            {!explainers?.length ? (
              <p className="text-[11px] text-[#9ca3af]">
                Loading explanations…
              </p>
            ) : null}
          </div>
        </section>

        <footer className="border-t border-[#e5e7eb] pt-4 pb-2 text-[10px] text-[#9ca3af]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Story flow: recommended action → scenarios → budget movement →
              from/to map → ranking → risk vs reward → forecast support →
              executive narrative.
            </span>
            <span className="tabular-nums">
              tombras-demo · timesfm_staging · v2
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Section sub-components
// ---------------------------------------------------------------------------

function ScenarioColumn({
  title,
  eyebrow,
  accent,
  dailyBudget,
  budget14d,
  forecastConversions,
  forecastCpa,
  comparison,
  border = "",
  note,
}: {
  title: string;
  eyebrow: string;
  accent: string;
  dailyBudget: number;
  budget14d: number;
  forecastConversions: number;
  forecastCpa: number;
  comparison?: { cpaDeltaPct: number; conversionLift: number };
  border?: string;
  note?: string;
}) {
  return (
    <div className={`p-4 ${border}`}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2" style={{ background: accent }} />
        <SectionLabel>{eyebrow}</SectionLabel>
      </div>
      <p className="mt-1 text-[14px] font-semibold leading-tight text-[#1f2937]">
        {title}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <ScenarioStat label="Daily budget" value={wholeCurrency.format(dailyBudget)} />
        <ScenarioStat
          label="14-day budget"
          value={wholeCurrency.format(budget14d)}
        />
        <ScenarioStat
          label="Forecasted conversions"
          value={
            forecastConversions > 0
              ? compactNumber.format(forecastConversions)
              : "—"
          }
          highlight={comparison ? accent : undefined}
        />
        <ScenarioStat
          label="Blended forecast CPA"
          value={forecastCpa > 0 ? fmtCurrency2(forecastCpa) : "—"}
          highlight={comparison ? accent : undefined}
        />
      </dl>

      {comparison ? (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#eef0f3] pt-3">
          <ScenarioStat
            label="CPA improvement"
            value={
              Math.abs(comparison.cpaDeltaPct) < 0.05
                ? "≈ 0%"
                : fmtPct(comparison.cpaDeltaPct)
            }
            sub="vs. current"
            highlight={
              comparison.cpaDeltaPct < 0
                ? C.positive
                : comparison.cpaDeltaPct > 0
                  ? C.critical
                  : C.textMid
            }
          />
          <ScenarioStat
            label="Conversion lift"
            value={
              Math.abs(comparison.conversionLift) < 1
                ? "≈ 0"
                : `${comparison.conversionLift >= 0 ? "+" : "−"}${compactNumber.format(
                    Math.abs(comparison.conversionLift),
                  )}`
            }
            sub="14-day est."
            highlight={
              comparison.conversionLift > 0
                ? C.positive
                : comparison.conversionLift < 0
                  ? C.critical
                  : C.textMid
            }
          />
        </div>
      ) : null}

      {note ? (
        <p className="mt-3 text-[10px] leading-4 text-[#9ca3af]">{note}</p>
      ) : null}
    </div>
  );
}

function ScenarioStat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
        {label}
      </p>
      <p
        className="mt-0.5 text-[15px] font-semibold tabular-nums"
        style={{ color: highlight ?? C.text }}
      >
        {value}
      </p>
      {sub ? <p className="text-[10px] text-[#9ca3af]">{sub}</p> : null}
    </div>
  );
}

function FromToColumn({
  title,
  accent,
  direction,
  rows,
  explainerByChannel,
}: {
  title: string;
  accent: string;
  direction: "from" | "to";
  rows: (RecommendationRow & { budget_change: number })[];
  explainerByChannel: Map<string, ExplainerRow>;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2" style={{ background: accent }} />
        <SectionLabel>{title}</SectionLabel>
        <span className="ml-auto text-[10px] tabular-nums text-[#9ca3af]">
          {rows.length} channel{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => {
          const explainer = explainerByChannel.get(row.channel);
          const risk = riskStyles(row.risk_level);
          return (
            <div
              key={row.channel}
              className="border border-[#eef0f3] bg-[#fafbfc] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2"
                    style={{ background: channelColor(row.channel) }}
                  />
                  <span className="text-[12px] font-semibold text-[#1f2937]">
                    {row.channel}
                  </span>
                </div>
                <StatusBadge status={risk} />
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#9ca3af]">
                    Recent CPA
                  </p>
                  <p className="font-medium tabular-nums text-[#1f2937]">
                    {fmtCurrency2(row.recent_cpa)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#9ca3af]">
                    Forecast CPA
                  </p>
                  <p className="font-medium tabular-nums text-[#1f2937]">
                    {fmtCurrency2(row.avg_forecasted_cpa_14d)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#9ca3af]">
                    Daily Δ
                  </p>
                  <p
                    className="font-semibold tabular-nums"
                    style={{
                      color: direction === "to" ? C.positive : C.critical,
                    }}
                  >
                    {fmtSignedCurrency(row.budget_change)}
                  </p>
                </div>
              </div>
              {explainer?.executive_summary ? (
                <p className="mt-2 text-[10px] leading-4 text-[#4b5563]">
                  {explainer.executive_summary}
                </p>
              ) : null}
            </div>
          );
        })}
        {!rows.length ? (
          <p className="text-[11px] text-[#9ca3af]">
            No channels recommended for this direction.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function QuadrantLegend({
  label,
  hint,
  color,
  description,
}: {
  label: string;
  hint: string;
  color: string;
  description: string;
}) {
  return (
    <div className="border border-[#eef0f3] p-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2" style={{ background: color }} />
        <p className="text-[11px] font-semibold text-[#1f2937]">{label}</p>
      </div>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">
        {hint}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[#4b5563]">
        {description}
      </p>
    </div>
  );
}

function QuadrantTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as Record<string, unknown> | undefined;
  if (!p) return null;
  const channel = String(p.channel ?? "");
  const cpa = typeof p.cpa === "number" ? p.cpa : Number(p.cpa ?? 0);
  const riskLabel = String(p.riskLabel ?? "");
  const explanation = String(p.explanation ?? "");
  return (
    <div className="max-w-xs border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
        {channel}
      </div>
      <div className="mt-0.5 flex items-center gap-3 tabular-nums text-[#1f2937]">
        <span>CPA {fmtCurrency2(cpa)}</span>
        <span className="text-[#9ca3af]">·</span>
        <span>{riskLabel}</span>
      </div>
      {explanation ? (
        <p className="mt-1 text-[10px] leading-4 text-[#4b5563]">
          {explanation}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forecast chart (used in Section 7)
// ---------------------------------------------------------------------------

type ForecastChartProps = {
  title: string;
  data: (ForecastRow & {
    cpa_band_lower: number | null;
    cpa_band_offset: number | null;
    conv_band_lower: number | null;
    conv_band_offset: number | null;
  })[];
  actualKey: keyof ForecastRow;
  forecastKey: keyof ForecastRow;
  bandLowerKey: "cpa_band_lower" | "conv_band_lower";
  bandOffsetKey: "cpa_band_offset" | "conv_band_offset";
  yFormat: (v: number) => string;
  tooltipFormat: (v: number) => string;
};

function ForecastChart({
  title,
  data,
  actualKey,
  forecastKey,
  bandLowerKey,
  bandOffsetKey,
  yFormat,
  tooltipFormat,
}: ForecastChartProps) {
  const cutoff = useMemo(() => {
    let last = "";
    for (const row of data) {
      if (row[actualKey] != null) last = row.date;
    }
    return last;
  }, [data, actualKey]);

  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-2 h-72">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-[#9ca3af]">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke={C.borderSoft} />
              <XAxis
                dataKey="date"
                stroke={C.textSubtle}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => shortDate(String(v))}
                minTickGap={28}
              />
              <YAxis
                stroke={C.textSubtle}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => yFormat(v as number)}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: C.border, strokeWidth: 1 }}
                content={<ChartTooltip format={tooltipFormat} />}
              />
              <Area
                type="monotone"
                dataKey={bandLowerKey}
                stackId="band"
                stroke="transparent"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey={bandOffsetKey}
                stackId="band"
                stroke="transparent"
                fill={C.primary}
                fillOpacity={0.12}
                name="Confidence band"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey={actualKey as string}
                name="Actual"
                stroke={C.text}
                strokeWidth={1.8}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey={forecastKey as string}
                name="Forecast"
                stroke={C.primary}
                strokeWidth={1.8}
                strokeDasharray="4 3"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {cutoff ? (
                <ReferenceLine
                  x={cutoff}
                  stroke={C.accent}
                  strokeDasharray="3 3"
                  label={{
                    value: "Today",
                    position: "top",
                    fill: C.accent,
                    fontSize: 10,
                  }}
                />
              ) : null}
              <Legend
                verticalAlign="bottom"
                height={20}
                wrapperStyle={{ fontSize: 10, color: C.textMid }}
                iconSize={10}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
