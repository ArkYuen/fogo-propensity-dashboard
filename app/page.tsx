"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Mock data (validated counts kept exact; everything else is placeholder).
// ---------------------------------------------------------------------------

// Validated audience counts — canonical numbers from the model run.
const TOTAL_SCORED_CUSTOMERS = 200000;
const PERSUADABLE_AUDIENCE_COUNT = 20036;
const LOOKALIKE_SEED_AUDIENCE_COUNT = 20267;

const audienceData = [
  { name: "Customer universe", customers: 200000, accent: false },
  { name: "HVC segments", customers: 200000, accent: false },
  { name: "Persuadable", customers: 20036, accent: true },
  { name: "Lookalike seed", customers: 20267, accent: true },
];

// Model validation: predicted probability vs. observed conversion rate
// per propensity decile (D1 = highest). Mocked but realistic — actual
// roughly tracks predicted with mild over- and under-shoot.
const validationData = [
  { decile: "D1", predicted: 0.185, actual: 0.179 },
  { decile: "D2", predicted: 0.158, actual: 0.151 },
  { decile: "D3", predicted: 0.134, actual: 0.127 },
  { decile: "D4", predicted: 0.112, actual: 0.109 },
  { decile: "D5", predicted: 0.091, actual: 0.086 },
  { decile: "D6", predicted: 0.074, actual: 0.071 },
  { decile: "D7", predicted: 0.058, actual: 0.052 },
  { decile: "D8", predicted: 0.042, actual: 0.046 },
  { decile: "D9", predicted: 0.031, actual: 0.028 },
  { decile: "D10", predicted: 0.019, actual: 0.021 },
];

const dmaData = [
  { dma: "New York", customers: 4380, share: 21.9, avgScore: 0.84 },
  { dma: "Miami–Ft. Lauderdale", customers: 3165, share: 15.8, avgScore: 0.82 },
  { dma: "Dallas–Ft. Worth", customers: 2940, share: 14.7, avgScore: 0.8 },
  { dma: "Houston", customers: 2610, share: 13.0, avgScore: 0.79 },
  { dma: "Chicago", customers: 2245, share: 11.2, avgScore: 0.77 },
  { dma: "Atlanta", customers: 1890, share: 9.4, avgScore: 0.75 },
  { dma: "Los Angeles", customers: 1640, share: 8.2, avgScore: 0.74 },
];

const hvcSegments = [
  {
    segment: "Premium loyalists",
    customers: 42100,
    revenue: 18400000,
    visits: 8.7,
    avgCheck: 74,
    share: 21.1,
  },
  {
    segment: "High-spend occasionals",
    customers: 31800,
    revenue: 13200000,
    visits: 3.2,
    avgCheck: 96,
    share: 15.9,
  },
  {
    segment: "Growth potential",
    customers: 54700,
    revenue: 10600000,
    visits: 4.4,
    avgCheck: 58,
    share: 27.4,
  },
  {
    segment: "Emerging guests",
    customers: 71400,
    revenue: 7900000,
    visits: 2.1,
    avgCheck: 49,
    share: 35.7,
  },
];

// At-Risk High-Potential Audience: customers with modeled upside and
// enough prior value to justify a retention or reactivation offer, but
// who show weaker engagement signals and aren't already in the strongest
// lookalike or persuadable groups. Sized for controlled CRM testing —
// deliberately narrower than the broad lowest-revenue segment to avoid
// blanket discounting.
const AT_RISK_HIGH_POTENTIAL_AUDIENCE_COUNT = 18750;

const pctOfTotal = (count: number) =>
  (count / TOTAL_SCORED_CUSTOMERS) * 100;

const recommendedAudiences = [
  {
    name: "Persuadable diners — top 5 DMAs",
    size: 15340,
    channel: "Paid social, CRM",
    rationale:
      "Best near-term activation pool: highest model confidence concentrated in scaled media markets.",
  },
  {
    name: "Lookalike seed — premium loyalists",
    size: 20267,
    channel: "Meta, Google, DV360",
    rationale:
      "Strong seed for platform-side expansion against highest-value behavior.",
  },
  {
    name: "At-risk high-potential — controlled CRM test",
    size: 18750,
    channel: "CRM, app push, controlled offer",
    rationale:
      "Modeled upside with prior value but weaker engagement signals. Suppress active loyalists, hold a no-offer control cell, and start with a small variant cohort before expanding — avoids blanket subsidy.",
  },
];

const recommendations = [
  {
    label: "Best near-term activation",
    body: "Persuadable diners in the top five DMAs — strongest balance of scale, model confidence, and media-market readiness.",
  },
  {
    label: "Best expansion play",
    body: "Lookalike seeds built from premium loyalists — well-suited for upper-funnel paid expansion and platform modeling.",
  },
  {
    label: "Best CRM retention test",
    body: "Run a controlled CRM and app-push offer to the at-risk high-potential audience. Suppress already-loyal customers and cap the variant cohort to avoid unnecessary subsidy on guests who would have come back anyway.",
  },
];

const filters = [
  {
    label: "Audience focus",
    value: "Persuadable customers",
    options: [
      "Persuadable customers",
      "Lookalike seed audience",
      "Customer universe",
      "High-value customer segments",
    ],
  },
  {
    label: "Market scope",
    value: "Top DMAs",
    options: ["Top DMAs", "All markets", "Northeast", "South", "Midwest"],
  },
  {
    label: "Activation objective",
    value: "Paid media + CRM",
    options: ["Paid media + CRM", "CRM only", "App adoption", "Lookalike modeling"],
  },
  {
    label: "Model version",
    value: "v2 — current",
    options: ["v2 — current", "v1 — previous", "Compare versions"],
  },
];

const prompts = [
  "How many customers are in each audience?",
  "Which DMAs have the largest persuadable audiences?",
  "Summarize the high-value customer revenue segments.",
  "Recommend three paid media activation audiences.",
];

// ---------------------------------------------------------------------------
// Formatters.
// ---------------------------------------------------------------------------

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullNumber = new Intl.NumberFormat("en-US");

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function fmtPct(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

// ---------------------------------------------------------------------------
// Reusable atoms.
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  detail,
  caption,
}: {
  label: string;
  value: string;
  detail?: string;
  caption: string;
}) {
  return (
    <div className="border border-zinc-200 bg-white px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="font-mono text-[28px] font-medium leading-none tracking-tight tabular-nums text-zinc-950">
          {value}
        </p>
        {detail ? (
          <span className="font-mono text-xs tabular-nums text-zinc-500">
            {detail}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">{caption}</p>
    </div>
  );
}

function FilterPill({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="group relative flex h-9 items-center gap-2 border border-zinc-200 bg-white px-3 text-sm text-zinc-700 transition-colors hover:border-zinc-300">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
        {label}
      </span>
      <span className="text-zinc-300">/</span>
      <span className="truncate text-sm font-medium text-zinc-900">{value}</span>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="ml-1 h-3 w-3 text-zinc-400"
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
        defaultValue={value}
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

function SectionHeader({
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
    <div className="flex items-end justify-between gap-4 px-5 pt-4 pb-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type ChartTooltipPayloadEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

function ChartTooltipBox({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string | number;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-zinc-200 bg-white px-2.5 py-2 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {label !== undefined ? (
        <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          {label}
        </div>
      ) : null}
      {payload.map((entry, idx) => (
        <div
          key={`${entry.dataKey ?? idx}`}
          className="flex items-center gap-3 py-0.5"
        >
          <span
            className="h-2 w-2"
            style={{ background: entry.color ?? "#0a0a0a" }}
          />
          <span className="text-zinc-600">{entry.name ?? entry.dataKey}</span>
          <span className="ml-auto font-mono tabular-nums text-zinc-950">
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
// Page.
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      {/* Top status strip */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-10 max-w-[1440px] items-center gap-4 px-6 text-xs text-zinc-500">
          <span className="font-mono text-[11px] font-medium tracking-tight text-zinc-900">
            tombras-demo
          </span>
          <span className="text-zinc-300">/</span>
          <span className="font-mono text-[11px] text-zinc-700">
            fogo_churrasgo
          </span>
          <span className="text-zinc-300">/</span>
          <span className="font-mono text-[11px] text-zinc-700">
            propensity-dashboard
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Agent connected
            </span>
            <span className="text-zinc-300">·</span>
            <span className="font-mono text-[11px] tabular-nums text-zinc-500">
              snapshot · 09 May 2026
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-950">
                Customer Propensity &amp; Activation
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                Audience sizing, high-value customer profiling, and media
                activation planning for the Fogo de Chão propensity model demo.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="rounded-sm border-zinc-200 bg-white px-1.5 py-0 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-zinc-600"
                >
                  Internal demo
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-sm border-zinc-200 bg-white px-1.5 py-0 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-zinc-600"
                >
                  BigQuery-backed
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-sm border-zinc-200 bg-white px-1.5 py-0 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-zinc-600"
                >
                  Gemini agent enabled
                </Badge>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col border border-zinc-200 bg-white text-xs">
              <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
                <span className="text-zinc-500">Connected agent</span>
                <span className="font-medium text-zinc-900">
                  Fogo Propensity Analytics Agent
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
                <span className="text-zinc-500">Approved sources</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900">
                  4 BigQuery views
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-zinc-500">Smoke test</span>
                <span className="flex items-center gap-1.5 font-medium text-zinc-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Passed
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-6 py-6">
        {/* Filters */}
        <section className="mb-6 flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <FilterPill
              key={f.label}
              label={f.label}
              value={f.value}
              options={f.options}
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-none border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
            >
              Reset
            </Button>
            <Button className="h-9 rounded-none bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800">
              Export snapshot
            </Button>
          </div>
        </section>

        {/* KPI cards */}
        <section className="mb-6 grid gap-px bg-zinc-200 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Persuadable Audience"
            value={fullNumber.format(PERSUADABLE_AUDIENCE_COUNT)}
            detail={fmtPct(pctOfTotal(PERSUADABLE_AUDIENCE_COUNT))}
            caption="Customers most likely to respond to media or CRM activation."
          />
          <MetricCard
            label="Lookalike Seed Audience"
            value={fullNumber.format(LOOKALIKE_SEED_AUDIENCE_COUNT)}
            detail={fmtPct(pctOfTotal(LOOKALIKE_SEED_AUDIENCE_COUNT))}
            caption="High-quality seed group for Meta, Google, and DV360 expansion."
          />
          <MetricCard
            label="At-Risk High-Potential Audience"
            value={fullNumber.format(AT_RISK_HIGH_POTENTIAL_AUDIENCE_COUNT)}
            detail={fmtPct(pctOfTotal(AT_RISK_HIGH_POTENTIAL_AUDIENCE_COUNT))}
            caption="Customers worth protecting based on prior value and predicted upside, but showing weaker engagement signals. Best suited for CRM, app push, or controlled offer testing."
          />
          <MetricCard
            label="Total Scored Customers"
            value={fullNumber.format(TOTAL_SCORED_CUSTOMERS)}
            caption="Customer records scored by the propensity and revenue models."
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-6">
            {/* Executive summary */}
            <div className="border border-zinc-200 bg-white">
              <SectionHeader
                eyebrow="Executive summary"
                title="Three recommendations for paid + owned activation"
                description="Drafted from the current model run. Talk-track ready for client review."
              />
              <div className="grid gap-px border-t border-zinc-200 bg-zinc-200 lg:grid-cols-3">
                {recommendations.map((rec, i) => (
                  <div key={rec.label} className="bg-white px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-700">
                        {rec.label}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">
                      {rec.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="border border-zinc-200 bg-white">
                <SectionHeader
                  title="Audience composition"
                  description="Validated counts across the four approved customer views."
                  action={
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                      Customers
                    </span>
                  }
                />
                <div className="border-t border-zinc-200 px-3 pt-3 pb-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={audienceData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="#f1f1f3"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#a1a1aa"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#a1a1aa"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => compactNumber.format(v as number)}
                          width={40}
                        />
                        <Tooltip
                          cursor={{ fill: "#fafafa" }}
                          content={
                            <ChartTooltipBox
                              format={(v) => fullNumber.format(v)}
                            />
                          }
                        />
                        <Bar dataKey="customers" name="Customers">
                          {audienceData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.accent ? "#0a0a0a" : "#d4d4d8"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex items-center gap-4 px-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 bg-zinc-950" />
                      Activation audiences
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 bg-zinc-300" />
                      Source universes
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-zinc-200 bg-white">
                <SectionHeader
                  eyebrow="Model validation"
                  title="Actual vs. Predicted Conversion Rate"
                  description="Predicted probability decile vs. observed conversion rate (D1 = highest)."
                  action={
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                      Conversion rate
                    </span>
                  }
                />
                <div className="border-t border-zinc-200 px-3 pt-3 pb-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={validationData}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#f1f1f3" />
                        <XAxis
                          dataKey="decile"
                          stroke="#a1a1aa"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#a1a1aa"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 0.2]}
                          tickFormatter={(value) =>
                            `${Math.round((value as number) * 100)}%`
                          }
                          width={40}
                        />
                        <Tooltip
                          cursor={{ stroke: "#e4e4e7", strokeWidth: 1 }}
                          content={
                            <ChartTooltipBox
                              format={(v) => fmtPct(v * 100, 1)}
                            />
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          name="Predicted"
                          stroke="#0a0a0a"
                          strokeWidth={1.75}
                          dot={{ r: 2.5, fill: "#0a0a0a", strokeWidth: 0 }}
                          activeDot={{ r: 4, fill: "#0a0a0a", strokeWidth: 0 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          name="Actual"
                          stroke="#71717a"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          dot={{ r: 2.5, fill: "#71717a", strokeWidth: 0 }}
                          activeDot={{ r: 4, fill: "#71717a", strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex items-center gap-4 px-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-3 bg-zinc-950" />
                      Predicted
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg
                        aria-hidden
                        viewBox="0 0 12 2"
                        className="h-0.5 w-3"
                      >
                        <line
                          x1="0"
                          y1="1"
                          x2="12"
                          y2="1"
                          stroke="#71717a"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />
                      </svg>
                      Actual
                    </span>
                  </div>
                  <p className="mt-2 px-2 text-[11px] leading-4 text-zinc-500">
                    Higher-scored deciles should show higher observed
                    conversion rates. Close alignment between predicted and
                    actual rates indicates the model is directionally
                    calibrated.
                  </p>
                </div>
              </div>
            </div>

            {/* Top DMAs */}
            <div className="border border-zinc-200 bg-white">
              <SectionHeader
                eyebrow="Markets"
                title="Top persuadable DMAs"
                description="Priority markets by persuadable customer volume."
                action={
                  <button className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                    View all 210 →
                  </button>
                }
              />
              <div className="border-t border-zinc-200">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                      <TableHead className="h-9 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        DMA
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Persuadable customers
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Share of persuadable
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Avg. score
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dmaData.map((row) => (
                      <TableRow
                        key={row.dma}
                        className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50"
                      >
                        <TableCell className="px-5 py-3 text-sm font-medium text-zinc-900">
                          {row.dma}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-zinc-700">
                          {fullNumber.format(row.customers)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1 w-20 bg-zinc-100">
                              <div
                                className="h-1 bg-zinc-900"
                                style={{ width: `${row.share * 4}%` }}
                              />
                            </div>
                            <span className="w-12 font-mono text-sm tabular-nums text-zinc-700">
                              {fmtPct(row.share, 1)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-zinc-700">
                          {row.avgScore.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* HVC segments */}
            <div className="border border-zinc-200 bg-white">
              <SectionHeader
                eyebrow="Value tiers"
                title="High-value customer segments"
                description="Revenue and behavior summary by segment."
              />
              <div className="border-t border-zinc-200">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                      <TableHead className="h-9 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Segment
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Customers
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Annual revenue
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Visits / yr
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Avg check
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hvcSegments.map((row) => (
                      <TableRow
                        key={row.segment}
                        className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50"
                      >
                        <TableCell className="px-5 py-3 text-sm font-medium text-zinc-900">
                          {row.segment}
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-zinc-400">
                            {fmtPct(row.share, 1)} of universe
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-zinc-700">
                          {fullNumber.format(row.customers)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-zinc-900">
                          {compactCurrency.format(row.revenue)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-zinc-700">
                          {row.visits.toFixed(1)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-zinc-700">
                          ${row.avgCheck}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Recommended audiences */}
            <div className="border border-zinc-200 bg-white">
              <SectionHeader
                eyebrow="Activation"
                title="Recommended activation audiences"
                description="Suggested audiences for immediate testing and media deployment."
              />
              <div className="border-t border-zinc-200">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                      <TableHead className="h-9 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Audience
                      </TableHead>
                      <TableHead className="h-9 px-5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Size
                      </TableHead>
                      <TableHead className="h-9 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Channel
                      </TableHead>
                      <TableHead className="h-9 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Rationale
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recommendedAudiences.map((row) => (
                      <TableRow
                        key={row.name}
                        className="border-b border-zinc-100 align-top last:border-b-0 hover:bg-zinc-50"
                      >
                        <TableCell className="px-5 py-3 text-sm font-medium text-zinc-900">
                          {row.name}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-zinc-700">
                          {fullNumber.format(row.size)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-zinc-700">
                          {row.channel}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm leading-6 text-zinc-600">
                          {row.rationale}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          {/* Right rail */}
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <div className="border border-zinc-200 bg-white">
              <SectionHeader
                eyebrow="Agent"
                title="Ask the analytics agent"
                description="Natural-language Q&A grounded in the four approved BigQuery views."
              />
              <div className="space-y-4 border-t border-zinc-200 px-5 py-4">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Suggested prompts
                  </p>
                  <div className="space-y-1">
                    {prompts.map((p) => (
                      <button
                        key={p}
                        className="block w-full border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-5 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-zinc-200 bg-zinc-50">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                      Example response
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-zinc-400">
                      mock · 1.2s
                    </span>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-xs leading-5 text-zinc-700">
                      The Persuadable Audience contains{" "}
                      <span className="font-mono tabular-nums text-zinc-900">
                        20,036
                      </span>{" "}
                      customers (
                      <span className="font-mono tabular-nums text-zinc-900">
                        10.02%
                      </span>{" "}
                      of Total Scored Customers). It balances model confidence
                      with reachable scale, making it the strongest immediate
                      activation pool.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Ask about audiences, DMAs, revenue segments, or activation planning…"
                    className="min-h-24 resize-none rounded-none border-zinc-200 bg-white text-sm text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-400"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] tabular-nums text-zinc-400">
                      Wires to /api/agent/chat
                    </p>
                    <Button className="h-8 rounded-none bg-zinc-950 px-3 text-xs font-medium text-white hover:bg-zinc-800">
                      Run question
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-zinc-200 bg-white">
              <SectionHeader
                eyebrow="Methodology"
                title="Scope &amp; assumptions"
              />
              <ol className="space-y-0 border-t border-zinc-200 text-xs">
                {[
                  "Uses four approved BigQuery views: customer scores, HVC revenue segments, persuadable audience, and lookalike seed audience.",
                  "Percentages use the current customer universe (200,000) as the default denominator unless otherwise stated.",
                  "At-risk high-potential customers are defined conceptually as customers with prior value, medium-to-high modeled upside, weaker recent engagement, and not already in the strongest loyalist or lookalike group. Sized for a controlled CRM test, not blanket discounting.",
                  "All chart and table values shown here are mocked for design validation.",
                  "Final KPI and chart routes will be backed by fixed SQL against the approved views.",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 border-b border-zinc-100 px-5 py-3 last:border-b-0"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-5 text-zinc-700">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        <footer className="mt-10 border-t border-zinc-200 pt-4 pb-8 text-[11px] text-zinc-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Internal demo for client review — values are validated where
              labeled and mocked elsewhere.
            </span>
            <span className="font-mono tabular-nums">
              tombras-demo · fogo_churrasgo · v2
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
