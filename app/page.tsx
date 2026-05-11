"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
// Tableau / Salesforce-inspired muted enterprise BI palette.
// ---------------------------------------------------------------------------

const C = {
  primary: "#4e79a7",      // muted blue — main metric / positive
  accent: "#f28e2c",       // soft orange — opportunity / warning
  baseline: "#cbd1d8",     // pale gray — baseline / random / comparison
  positive: "#59a14f",     // green — stable
  warning: "#edc949",      // amber — watch
  critical: "#e15759",     // muted red — review
  text: "#1f2937",         // charcoal
  textMid: "#4b5563",
  textMuted: "#6b7280",
  textSubtle: "#9ca3af",
  border: "#e5e7eb",
  borderSoft: "#eef0f3",
  bg: "#f7f8fa",
  bgPanel: "#f3f5f7",
  bgSubtle: "#fafbfc",
};

// ---------------------------------------------------------------------------
// Mock data (validated counts kept exact; everything else is placeholder).
// ---------------------------------------------------------------------------

const TOTAL_SCORED_CUSTOMERS = 200000;
const PERSUADABLE_AUDIENCE_COUNT = 20036;
const LOOKALIKE_SEED_AUDIENCE_COUNT = 20267;
const AT_RISK_HIGH_POTENTIAL_AUDIENCE_COUNT = 18750;
const POPULATION_BASELINE_RATE = 0.087;

const audienceData = [
  { name: "Persuadable", customers: PERSUADABLE_AUDIENCE_COUNT, color: C.primary },
  { name: "Lookalike", customers: LOOKALIKE_SEED_AUDIENCE_COUNT, color: C.primary },
  { name: "At-risk", customers: AT_RISK_HIGH_POTENTIAL_AUDIENCE_COUNT, color: C.accent },
  { name: "Total scored", customers: TOTAL_SCORED_CUSTOMERS, color: C.baseline },
];

const decileConversionData = [
  { decile: "D1", rate: 0.179 },
  { decile: "D2", rate: 0.151 },
  { decile: "D3", rate: 0.127 },
  { decile: "D4", rate: 0.109 },
  { decile: "D5", rate: 0.086 },
  { decile: "D6", rate: 0.071 },
  { decile: "D7", rate: 0.052 },
  { decile: "D8", rate: 0.046 },
  { decile: "D9", rate: 0.028 },
  { decile: "D10", rate: 0.021 },
];

const cumulativeGainData = [
  { population: 10, model: 20.6, random: 10 },
  { population: 20, model: 38.0, random: 20 },
  { population: 30, model: 52.6, random: 30 },
  { population: 40, model: 65.1, random: 40 },
  { population: 50, model: 75.0, random: 50 },
  { population: 60, model: 83.2, random: 60 },
  { population: 70, model: 89.2, random: 70 },
  { population: 80, model: 94.5, random: 80 },
  { population: 90, model: 97.7, random: 90 },
  { population: 100, model: 100, random: 100 },
];

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
  { segment: "Premium loyalists", customers: 42100, revenue: 18400000, visits: 8.7, avgCheck: 74, share: 21.1 },
  { segment: "High-spend occasionals", customers: 31800, revenue: 13200000, visits: 3.2, avgCheck: 96, share: 15.9 },
  { segment: "Growth potential", customers: 54700, revenue: 10600000, visits: 4.4, avgCheck: 58, share: 27.4 },
  { segment: "Emerging guests", customers: 71400, revenue: 7900000, visits: 2.1, avgCheck: 49, share: 35.7 },
];

const recommendedAudiences = [
  { name: "Persuadable diners — top 5 DMAs", size: 15340, channel: "Paid social, CRM" },
  { name: "Lookalike seed — premium loyalists", size: 20267, channel: "Meta, Google, DV360" },
  { name: "At-risk high-potential — controlled CRM", size: 18750, channel: "CRM, app push" },
];

const psiData = [
  { feature: "Days since last visit", psi: 0.18, interpretation: "Recent engagement patterns have shifted moderately." },
  { feature: "Lifetime revenue", psi: 0.07, interpretation: "Historical value distribution remains consistent." },
  { feature: "Average check", psi: 0.11, interpretation: "Spend behavior is beginning to move from training baseline." },
  { feature: "Visit count", psi: 0.05, interpretation: "Frequency distribution is stable." },
  { feature: "App ownership", psi: 0.22, interpretation: "App adoption mix has changed enough to review model assumptions." },
];

const labelDriftData = [
  { month: "Jan", observed: 9.2, baseline: 9.0 },
  { month: "Feb", observed: 9.1, baseline: 9.0 },
  { month: "Mar", observed: 8.8, baseline: 9.0 },
  { month: "Apr", observed: 8.4, baseline: 9.0 },
  { month: "May", observed: 7.9, baseline: 9.0 },
  { month: "Jun", observed: 7.6, baseline: 9.0 },
];

// === Filter options ===
const FILTER_OPTIONS = {
  audience: [
    "Persuadable customers",
    "Lookalike seed audience",
    "At-risk high-potential audience",
    "Total scored customers",
  ],
  market: ["All regions", "Northeast", "South", "Midwest", "West"],
  objective: [
    "Paid media + CRM",
    "CRM only",
    "App adoption",
    "Lookalike modeling",
  ],
  model: ["Current", "Previous", "Compare versions"],
};

// === Regional audience map ===
const REGIONS = [
  "Northeast",
  "Southeast",
  "Midwest",
  "Texas / Plains",
  "West",
  "Florida",
] as const;
type Region = (typeof REGIONS)[number];

const regionAudienceData: Record<string, Record<Region, number>> = {
  "Persuadable customers": {
    Northeast: 4920,
    Southeast: 3780,
    Midwest: 2640,
    "Texas / Plains": 4110,
    West: 2420,
    Florida: 2166,
  },
  "Lookalike seed audience": {
    Northeast: 4300,
    Southeast: 3450,
    Midwest: 2920,
    "Texas / Plains": 4620,
    West: 2680,
    Florida: 2297,
  },
  "At-risk high-potential audience": {
    Northeast: 3980,
    Southeast: 3120,
    Midwest: 2750,
    "Texas / Plains": 3600,
    West: 2210,
    Florida: 3090,
  },
  "Total scored customers": {
    Northeast: 46500,
    Southeast: 35200,
    Midwest: 28900,
    "Texas / Plains": 39700,
    West: 25600,
    Florida: 24100,
  },
};

const marketScopeToRegions: Record<string, Region[]> = {
  "All regions": [],
  Northeast: ["Northeast"],
  South: ["Southeast", "Florida"],
  Midwest: ["Midwest"],
  West: ["West"],
};

const activationCopy: Record<string, string> = {
  "Paid media + CRM":
    "Use top regions for paid social reach and CRM suppression planning.",
  "CRM only":
    "Prioritize regions where audience concentration supports controlled email or push testing.",
  "App adoption":
    "Focus on regions where high-potential customers can be moved into app onboarding.",
  "Lookalike modeling":
    "Use high-quality regional seed density to guide platform expansion.",
};

const modelVersionCopy: Record<string, string> = {
  Current: "Showing current production scoring output.",
  Previous: "Showing prior model scoring snapshot.",
  "Compare versions":
    "Comparison mode placeholder; final version will show movement by region.",
};

// Hand-crafted SVG polygon paths approximating the contiguous US
// silhouette, partitioned into six regions. ViewBox 800 × 400.
// Geography is simplified — straight-line polygons with a few
// inflection points per region so the result reads as a regional US
// map (CA bulge on the Pacific, TX bulge into Mexico, FL peninsula)
// without needing any GIS package or external geo data.
const regionLayouts: Record<
  Region,
  { path: string; labelX: number; labelY: number }
> = {
  West: {
    path: "M 30 30 L 240 30 L 240 305 L 70 295 L 45 215 L 30 80 Z",
    labelX: 130,
    labelY: 165,
  },
  Midwest: {
    path: "M 240 30 L 490 30 L 490 170 L 240 170 Z",
    labelX: 365,
    labelY: 100,
  },
  Northeast: {
    path: "M 490 30 L 775 35 L 770 170 L 490 170 Z",
    labelX: 633,
    labelY: 100,
  },
  "Texas / Plains": {
    path: "M 240 170 L 490 170 L 490 290 L 460 365 L 305 365 L 240 305 Z",
    labelX: 365,
    labelY: 245,
  },
  Southeast: {
    path: "M 490 170 L 690 170 L 700 290 L 490 290 Z",
    labelX: 595,
    labelY: 230,
  },
  Florida: {
    path: "M 580 290 L 700 290 L 720 400 L 605 400 L 580 335 Z",
    labelX: 650,
    labelY: 345,
  },
};

// === API response types & audience param mapping ===

type SummaryResp = {
  totalCustomers: number;
  hvcCustomers: number;
  persuadableCustomers: number;
  lookalikeSeedCustomers: number;
  atRiskHighPotentialCustomers: number;
  persuadablePct: number;
  lookalikeSeedPct: number;
  atRiskHighPotentialPct: number;
  source: "bigquery" | "fallback";
};

type LiveDmaRow = {
  dma: string;
  customers: number;
  avgIdentificationScore: number;
  avgAcquisitionScore: number;
};

type LiveHvcRow = {
  segment: string;
  customers: number;
  totalLifetimeRevenue: number;
  avgLifetimeRevenue: number;
  avgVisitCount: number;
  avgCheck: number;
};

type LiveRegionRow = { region: string; customers: number; share: number };

const AUDIENCE_TO_PARAM: Record<
  string,
  "persuadable" | "lookalike" | "at-risk" | "universe"
> = {
  "Persuadable customers": "persuadable",
  "Lookalike seed audience": "lookalike",
  "At-risk high-potential audience": "at-risk",
  "Total scored customers": "universe",
};

const prompts = [
  "How many customers are in each audience?",
  "Which DMAs have the largest persuadable audiences?",
  "Summarize the high-value customer revenue segments.",
  "Recommend three paid media activation audiences.",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fullNumber = new Intl.NumberFormat("en-US");
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function fmtPct(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

const pctOfTotal = (count: number) =>
  (count / TOTAL_SCORED_CUSTOMERS) * 100;

function psiStatus(psi: number) {
  if (psi >= 0.2) return { label: "Review", color: C.critical };
  if (psi >= 0.1) return { label: "Watch", color: C.warning };
  return { label: "Stable", color: C.positive };
}

// ---------------------------------------------------------------------------
// Reusable atoms
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

function PrimaryKPI({
  label,
  value,
  delta,
  sub,
  accent = C.primary,
}: {
  label: string;
  value: string;
  delta?: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-[26px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: accent }}
        >
          {value}
        </span>
        {delta ? (
          <span className="text-[11px] font-medium tabular-nums text-[#6b7280]">
            {delta}
          </span>
        ) : null}
      </div>
      {sub ? (
        <p className="mt-1 text-[11px] leading-4 text-[#6b7280]">{sub}</p>
      ) : null}
    </div>
  );
}

function MiniKPI({
  label,
  value,
  sub,
  dotColor,
}: {
  label: string;
  value: string;
  sub?: string;
  dotColor?: string;
}) {
  return (
    <div className="border-l border-[#e5e7eb] px-3 first:pl-0 first:border-l-0">
      <div className="flex items-center gap-1.5">
        {dotColor ? (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: dotColor }}
          />
        ) : null}
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">
          {label}
        </p>
      </div>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#1f2937]">
        {value}
      </p>
      {sub ? (
        <p className="text-[10px] leading-4 text-[#9ca3af]">{sub}</p>
      ) : null}
    </div>
  );
}

function BarRow({
  label,
  value,
  share,
  color = C.primary,
}: {
  label: string;
  value: string;
  share: number; // 0–100, relative to max
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 truncate text-[11px] text-[#1f2937]">{label}</div>
      <div className="h-1.5 flex-1 bg-[#f3f5f7]">
        <div
          className="h-1.5"
          style={{ width: `${Math.min(share, 100)}%`, background: color }}
        />
      </div>
      <div className="w-14 shrink-0 text-right text-[11px] tabular-nums text-[#6b7280]">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: { label: string; color: string };
}) {
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
  onChange?: (value: string) => void;
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
        onChange={(e) => onChange?.(e.target.value)}
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

function DashedSwatch({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 12 2" className="h-0.5 w-3" aria-hidden>
      <line
        x1="0"
        y1="1"
        x2="12"
        y2="1"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="4 3"
      />
    </svg>
  );
}

type TooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
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
  return (
    <div className="border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] shadow-sm">
      {label !== undefined ? (
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">
          {label}
        </div>
      ) : null}
      {payload.map((entry, idx) => (
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
// Activation Loop — types, fallbacks, and static phase content
// ---------------------------------------------------------------------------

type ActivationOperationRow = {
  audience: string;
  platform: string;
  sent: number | null;
  accepted: number | null;
  match_rate: number | null; // stored as ratio (0–1)
  lift: number | null; // stored as ratio (0–1)
  incremental_revenue: number | null; // dollars
  status: string;
};

type RetrainingSignalRow = {
  title: string;
  copy: string;
  status_label: string;
  eligible: boolean;
};

type ActivationLoopResp = {
  operations: ActivationOperationRow[];
  retraining_signal: RetrainingSignalRow;
};

const ACTIVATION_OPERATIONS_FALLBACK: ActivationOperationRow[] = [
  {
    audience: "Persuadable diners — top 5 DMAs",
    platform: "Meta Ads",
    sent: 15340,
    accepted: 14210,
    match_rate: 0.926,
    lift: 0.32,
    incremental_revenue: 57500,
    status: "Accepted",
  },
  {
    audience: "Lookalike seed — premium loyalists",
    platform: "Google Ads / DV360",
    sent: 20267,
    accepted: 18890,
    match_rate: 0.932,
    lift: null,
    incremental_revenue: null,
    status: "Accepted",
  },
  {
    audience: "At-risk high-potential — controlled CRM",
    platform: "Braze / Salesforce Marketing Cloud",
    sent: 18750,
    accepted: null,
    match_rate: null,
    lift: 0.316,
    incremental_revenue: 23300,
    status: "Queued",
  },
];

const RETRAINING_SIGNAL_FALLBACK: RetrainingSignalRow = {
  title: "Retraining Signal",
  copy:
    "Activation measurement shows positive preliminary lift across paid media and CRM tests. Once enough runs accumulate, exposed/holdout outcomes can be written back to BigQuery as labels for model recalibration or retraining.",
  status_label: "Eligible for retraining signal",
  eligible: true,
};

const ACTIVATION_PHASES: {
  phase: number;
  title: string;
  metric: string;
  statusLabel: string;
  statusColor: string;
  description: string;
}[] = [
  {
    phase: 1,
    title: "BigQuery Views + Agent",
    metric: "4 approved views",
    statusLabel: "Complete",
    statusColor: "#59a14f", // C.positive
    description:
      "Scored customer, HVC, persuadable, and lookalike views power the dashboard and Ask Tom agent.",
  },
  {
    phase: 2,
    title: "Audience Exports",
    metric: "3 active runs",
    statusLabel: "Ready",
    statusColor: "#4e79a7", // C.primary
    description:
      "Persuadable, lookalike seed, and at-risk audiences packaged for activation.",
  },
  {
    phase: 3,
    title: "Platform Write-Back",
    metric: "2 accepted / 1 queued",
    statusLabel: "In progress",
    statusColor: "#f28e2c", // C.accent
    description:
      "Audiences written back to Meta, Google/DV360, and CRM destinations.",
  },
  {
    phase: 4,
    title: "Lift + Retraining Loop",
    metric: "31–32% preliminary lift",
    statusLabel: "Monitoring",
    statusColor: "#edc949", // C.warning
    description:
      "Holdout results and incremental revenue create retraining signals.",
  },
];

// Status pill color for the activation operations table.
function operationStatusColor(status: string): string {
  const v = status.toLowerCase();
  if (v.includes("accept")) return "#59a14f"; // positive
  if (v.includes("queue") || v.includes("pending")) return "#edc949"; // warning
  if (v.includes("fail") || v.includes("reject")) return "#e15759"; // critical
  return "#6b7280"; // neutral
}

const pctRatio = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const compactCurrencyShort = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const fmtMaybe = <T,>(v: T | null, fmt: (n: T) => string) =>
  v == null ? "—" : fmt(v);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  // === Filter state (drives the regional map) ===
  const [audienceFocus, setAudienceFocus] = useState<string>(
    FILTER_OPTIONS.audience[0],
  );
  const [marketScope, setMarketScope] = useState<string>(
    FILTER_OPTIONS.market[0],
  );
  const [activationObjective, setActivationObjective] = useState<string>(
    FILTER_OPTIONS.objective[0],
  );
  const [modelVersion, setModelVersion] = useState<string>(
    FILTER_OPTIONS.model[0],
  );

  // Tooltip for the regional map (hover state)
  const [mapTooltip, setMapTooltip] = useState<{
    x: number;
    y: number;
    region: Region;
    count: number;
    share: number;
  } | null>(null);

  // === Live BigQuery state ===
  const [liveSummary, setLiveSummary] = useState<SummaryResp | null>(null);
  const [liveDmas, setLiveDmas] = useState<LiveDmaRow[] | null>(null);
  const [liveHvc, setLiveHvc] = useState<LiveHvcRow[] | null>(null);
  const [liveRegions, setLiveRegions] = useState<LiveRegionRow[] | null>(null);
  const [bqStatus, setBqStatus] = useState<
    "loading" | "connected" | "fallback"
  >("loading");

  // Activation Loop section (operations + retraining signal). Always
  // renders with the user-specified demo content; replaced by route
  // data when the fetch succeeds.
  const [activationOps, setActivationOps] = useState<
    ActivationOperationRow[]
  >(ACTIVATION_OPERATIONS_FALLBACK);
  const [retrainingSignal, setRetrainingSignal] = useState<RetrainingSignalRow>(
    RETRAINING_SIGNAL_FALLBACK,
  );

  // Fetch summary + DMAs + HVC once on mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/summary", { cache: "no-store" })
      .then((r) => r.json() as Promise<SummaryResp>)
      .then((data) => {
        if (cancelled) return;
        setLiveSummary(data);
        setBqStatus(data.source === "bigquery" ? "connected" : "fallback");
      })
      .catch(() => {
        if (!cancelled) setBqStatus("fallback");
      });
    fetch("/api/dashboard/dmas", { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { data: LiveDmaRow[] }) => {
        if (!cancelled && Array.isArray(res?.data)) setLiveDmas(res.data);
      })
      .catch(() => {});
    fetch("/api/dashboard/hvc-segments", { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { data: LiveHvcRow[] }) => {
        if (!cancelled && Array.isArray(res?.data)) setLiveHvc(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch regions whenever audience focus changes.
  useEffect(() => {
    let cancelled = false;
    const param = AUDIENCE_TO_PARAM[audienceFocus] ?? "persuadable";
    fetch(`/api/dashboard/regions?audience=${param}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { data: LiveRegionRow[] }) => {
        if (!cancelled && Array.isArray(res?.data)) setLiveRegions(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [audienceFocus]);

  // Fetch the Activation Loop summary once on mount. Falls back to the
  // demo values already set in state if the route is offline or the
  // views aren't created yet.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/activation-loop", { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { data?: ActivationLoopResp }) => {
        if (cancelled || !res?.data) return;
        if (Array.isArray(res.data.operations) && res.data.operations.length) {
          setActivationOps(res.data.operations);
        }
        if (res.data.retraining_signal) {
          setRetrainingSignal(res.data.retraining_signal);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // === Live-or-fallback computed values ===
  const totalCustomers =
    liveSummary?.totalCustomers ?? TOTAL_SCORED_CUSTOMERS;
  const persuadableCount =
    liveSummary?.persuadableCustomers ?? PERSUADABLE_AUDIENCE_COUNT;
  const lookalikeSeedCount =
    liveSummary?.lookalikeSeedCustomers ?? LOOKALIKE_SEED_AUDIENCE_COUNT;
  const atRiskCount =
    liveSummary?.atRiskHighPotentialCustomers ??
    AT_RISK_HIGH_POTENTIAL_AUDIENCE_COUNT;
  const pctLive = (n: number) =>
    totalCustomers ? (n * 100) / totalCustomers : 0;
  const persuadablePct = liveSummary?.persuadablePct ?? pctLive(persuadableCount);
  const lookalikeSeedPct =
    liveSummary?.lookalikeSeedPct ?? pctLive(lookalikeSeedCount);
  const atRiskPct =
    liveSummary?.atRiskHighPotentialPct ?? pctLive(atRiskCount);

  // Region map (live first, then fallback to mocked regional values).
  const liveRegionMap: Record<string, number> | null = liveRegions
    ? Object.fromEntries(liveRegions.map((r) => [r.region, r.customers]))
    : null;
  const regionCount = (region: Region) =>
    liveRegionMap?.[region] ?? regionAudienceData[audienceFocus][region];

  // === Derived map state ===
  const regionRows = REGIONS.map((r) => ({
    region: r,
    count: regionCount(r),
  })).sort((a, b) => b.count - a.count);
  const totalAudienceCount = regionRows.reduce((s, r) => s + r.count, 0);
  const highlightedRegions = marketScopeToRegions[marketScope] ?? [];
  const isHighlightActive = highlightedRegions.length > 0;
  const tierByRegion: Record<string, "high" | "medium" | "low"> = {};
  regionRows.forEach((r, i) => {
    tierByRegion[r.region] = i < 2 ? "high" : i < 4 ? "medium" : "low";
  });
  const tierColor = (tier: "high" | "medium" | "low") =>
    tier === "high" ? C.primary : tier === "medium" ? C.accent : C.baseline;
  const tierTextColor = (tier: "high" | "medium" | "low") =>
    tier === "low" ? "#1f2937" : "#ffffff";
  const isHighlighted = (region: string) =>
    isHighlightActive ? highlightedRegions.includes(region as Region) : true;

  // === Other derived metrics ===
  const liftAtTopDecile =
    decileConversionData[0].rate / POPULATION_BASELINE_RATE;
  const top30Capture = cumulativeGainData[2].model;
  const top50Capture = cumulativeGainData[4].model;
  const labelDriftDelta =
    labelDriftData[labelDriftData.length - 1].observed -
    labelDriftData[0].observed;

  const psiCounts = psiData.reduce(
    (acc, row) => {
      const status = psiStatus(row.psi).label;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const dmasMaxShare = Math.max(...dmaData.map((d) => d.share));

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#1f2937]">
      {/* Status strip */}
      <div className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex h-9 max-w-[1440px] items-center gap-3 px-6 text-[11px] text-[#6b7280]">
          <span className="font-semibold tracking-tight text-[#1f2937]">
            tombras-demo
          </span>
          <span className="text-[#d1d5db]">/</span>
          <span>fogo_churrasgo</span>
          <span className="text-[#d1d5db]">/</span>
          <span>propensity-dashboard</span>
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
            <span className="text-[#d1d5db]">·</span>
            <span className="tabular-nums">Snapshot 10 May 2026</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>
                Fogo de Chão · ChurrasGO User Propensity
              </SectionLabel>
              <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-[#1f2937]">
                Propensity Scores for App Users Predicting &ldquo;High
                Value&rdquo; Audiences
              </h1>
              <p className="mt-0.5 max-w-2xl text-xs leading-5 text-[#6b7280]">
                Two XGBoost propensity models. One model finds guests who
                already behave like high-value customers. The other finds
                customers who are most worth activating through media or
                CRM. Together, the scores help us decide who to protect, who
                to expand from, and who to target next.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterPill
                label="Audience"
                value={audienceFocus}
                options={FILTER_OPTIONS.audience}
                onChange={setAudienceFocus}
              />
              <FilterPill
                label="Market"
                value={marketScope}
                options={FILTER_OPTIONS.market}
                onChange={setMarketScope}
              />
              <FilterPill
                label="Objective"
                value={activationObjective}
                options={FILTER_OPTIONS.objective}
                onChange={setActivationObjective}
              />
              <FilterPill
                label="Model"
                value={modelVersion}
                options={FILTER_OPTIONS.model}
                onChange={setModelVersion}
              />
              <button className="h-7 border border-[#1f2937] bg-[#1f2937] px-3 text-[11px] font-medium text-white hover:bg-[#374151]">
                Export snapshot
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-4 px-6 py-5">
        {/* === Audience Concentration by Region (large map) === */}
        <CardPanel>
          <PanelHeader
            eyebrow="Audience by region"
            title="Audience Concentration by Region"
            description="Regional distribution updates based on the selected audience, market scope, activation objective, and model version."
          />
          <div className="grid gap-4 p-4 lg:grid-cols-5">
            {/* Map */}
            <div className="lg:col-span-3">
              <div className="relative">
                <svg
                  viewBox="0 0 800 400"
                  className="h-auto w-full"
                  role="img"
                  aria-label="Regional audience concentration map of the United States"
                >
                  {REGIONS.map((r) => {
                    const layout = regionLayouts[r];
                    const tier = tierByRegion[r];
                    const highlighted = isHighlighted(r);
                    const opacity =
                      isHighlightActive && !highlighted ? 0.3 : 1;
                    const fill = tierColor(tier);
                    const stroke =
                      isHighlightActive && highlighted
                        ? "#1f2937"
                        : "#ffffff";
                    const strokeWidth =
                      isHighlightActive && highlighted ? 2.5 : 1.5;
                    const value = regionCount(r);
                    const share = totalAudienceCount
                      ? (value * 100) / totalAudienceCount
                      : 0;
                    return (
                      <g
                        key={r}
                        opacity={opacity}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) =>
                          setMapTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            region: r,
                            count: value,
                            share,
                          })
                        }
                        onMouseMove={(e) =>
                          setMapTooltip((prev) =>
                            prev
                              ? { ...prev, x: e.clientX, y: e.clientY }
                              : prev,
                          )
                        }
                        onMouseLeave={() => setMapTooltip(null)}
                      >
                        <path
                          d={layout.path}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          strokeLinejoin="round"
                        />
                        <text
                          x={layout.labelX}
                          y={layout.labelY - 8}
                          textAnchor="middle"
                          fill={tierTextColor(tier)}
                          fontSize="12"
                          fontWeight="500"
                          opacity="0.9"
                          pointerEvents="none"
                        >
                          {r}
                        </text>
                        <text
                          x={layout.labelX}
                          y={layout.labelY + 14}
                          textAnchor="middle"
                          fill={tierTextColor(tier)}
                          fontSize="17"
                          fontWeight="600"
                          pointerEvents="none"
                        >
                          {compactNumber.format(value)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {mapTooltip ? (
                  <div
                    className="pointer-events-none fixed z-50 border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] shadow-sm"
                    style={{
                      left: mapTooltip.x + 12,
                      top: mapTooltip.y + 12,
                    }}
                  >
                    <div className="font-medium text-[#1f2937]">
                      {mapTooltip.region}
                    </div>
                    <div className="mt-0.5 tabular-nums text-[#1f2937]">
                      {fullNumber.format(mapTooltip.count)}{" "}
                      <span className="text-[10px] text-[#6b7280]">
                        · {mapTooltip.share.toFixed(1)}% of selected audience
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-[#6b7280]">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-3"
                    style={{ background: C.primary }}
                  />
                  High concentration
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-3"
                    style={{ background: C.accent }}
                  />
                  Medium concentration
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-3"
                    style={{ background: C.baseline }}
                  />
                  Lower concentration
                </span>
              </div>
            </div>

            {/* Ranked list + dynamic copy */}
            <div className="lg:col-span-2">
              <SectionLabel>
                Region ranking · {audienceFocus}
              </SectionLabel>
              <div className="mt-2 border-t border-[#eef0f3]">
                {regionRows.map((r, i) => {
                  const share = (r.count / totalAudienceCount) * 100;
                  const highlighted = isHighlighted(r.region);
                  return (
                    <div
                      key={r.region}
                      className="flex items-center gap-3 border-b border-[#eef0f3] py-1.5"
                      style={{
                        opacity:
                          isHighlightActive && !highlighted ? 0.4 : 1,
                      }}
                    >
                      <span className="w-3 text-[10px] tabular-nums text-[#9ca3af]">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-[11px] font-medium text-[#1f2937]">
                        {r.region}
                      </span>
                      <span className="w-16 text-right text-[11px] tabular-nums text-[#1f2937]">
                        {fullNumber.format(r.count)}
                      </span>
                      <span className="w-10 text-right text-[10px] tabular-nums text-[#9ca3af]">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 border-t border-[#eef0f3] pt-3">
                <p className="text-[11px] leading-5 text-[#1f2937]">
                  {activationCopy[activationObjective]}
                </p>
                <p className="mt-1 text-[10px] text-[#9ca3af]">
                  {modelVersionCopy[modelVersion]}
                </p>
              </div>
            </div>
          </div>
          <p className="border-t border-[#eef0f3] px-4 py-2 text-[10px] text-[#9ca3af]">
            Regional values from BigQuery DMA aggregation. Region
            boundaries are simplified for executive summary view.
          </p>
        </CardPanel>

        {/* === Executive summary — 3-column grid === */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Column 1: Audience Readiness */}
          <CardPanel>
            <PanelHeader
              eyebrow="Audience readiness"
              title="Activation pools sized & approved"
              description="Counts and concentration across the four canonical audiences."
            />
            <div className="space-y-4 p-4">
              <PrimaryKPI
                label="Persuadable Audience"
                value={fullNumber.format(persuadableCount)}
                delta={`${fmtPct(persuadablePct)} of universe`}
                sub="Highest-priority pool for paid social and CRM activation."
              />
              <div className="grid grid-cols-3">
                <MiniKPI
                  label="Lookalike seed"
                  value={fullNumber.format(lookalikeSeedCount)}
                  sub={`${fmtPct(lookalikeSeedPct)} · platform expand`}
                  dotColor={C.primary}
                />
                <MiniKPI
                  label="At-risk high-potential"
                  value={fullNumber.format(atRiskCount)}
                  sub={`${fmtPct(atRiskPct)} · CRM controlled test`}
                  dotColor={C.accent}
                />
                <MiniKPI
                  label="Total scored"
                  value={fullNumber.format(totalCustomers)}
                  sub="Universe denominator"
                  dotColor={C.baseline}
                />
              </div>
              <div>
                <SectionLabel>Top persuadable DMAs</SectionLabel>
                <div className="mt-2 space-y-1.5">
                  {(() => {
                    const rows = (liveDmas ?? dmaData).slice(0, 5);
                    const maxC =
                      Math.max(...rows.map((d) => d.customers)) || 1;
                    return rows.map((d) => (
                      <BarRow
                        key={d.dma}
                        label={d.dma}
                        value={fullNumber.format(d.customers)}
                        share={(d.customers / maxC) * 100}
                      />
                    ));
                  })()}
                </div>
              </div>
              <div>
                <SectionLabel>Audience composition</SectionLabel>
                <div className="mt-2 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={audienceData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke={C.borderSoft} />
                      <XAxis
                        dataKey="name"
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => compactNumber.format(v as number)}
                        width={36}
                      />
                      <Tooltip
                        cursor={{ fill: C.bgPanel }}
                        content={
                          <ChartTooltip format={(v) => fullNumber.format(v)} />
                        }
                      />
                      <Bar dataKey="customers" name="Customers">
                        {audienceData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardPanel>

          {/* Column 2: Model Performance */}
          <CardPanel>
            <PanelHeader
              eyebrow="Model performance"
              title="Lift, gain, and calibration"
              description="How much better the model is than random selection."
            />
            <div className="space-y-4 p-4">
              <PrimaryKPI
                label="Lift @ Top Decile"
                value={`${liftAtTopDecile.toFixed(2)}×`}
                delta={`vs ${fmtPct(POPULATION_BASELINE_RATE * 100, 1)} avg`}
                sub="D1 conversion rate over the population baseline."
              />
              <div className="grid grid-cols-3">
                <MiniKPI
                  label="Top 30% capture"
                  value={`${top30Capture.toFixed(1)}%`}
                  sub="of conversions"
                  dotColor={C.primary}
                />
                <MiniKPI
                  label="Top 50% capture"
                  value={`${top50Capture.toFixed(1)}%`}
                  sub="of conversions"
                  dotColor={C.primary}
                />
                <MiniKPI
                  label="Calibration"
                  value="Aligned"
                  sub="predicted ≈ actual"
                  dotColor={C.positive}
                />
              </div>
              <div>
                <SectionLabel>Cumulative gain</SectionLabel>
                <div className="mt-2 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={cumulativeGainData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke={C.borderSoft} />
                      <XAxis
                        dataKey="population"
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        width={36}
                      />
                      <Tooltip
                        cursor={{ stroke: C.border, strokeWidth: 1 }}
                        content={
                          <ChartTooltip format={(v) => `${v.toFixed(1)}%`} />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="model"
                        name="Model"
                        stroke={C.primary}
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: C.primary, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="random"
                        name="Random"
                        stroke={C.baseline}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-[#6b7280]">
                  <span className="flex items-center gap-1">
                    <span
                      className="h-0.5 w-3"
                      style={{ background: C.primary }}
                    />
                    Model-ranked
                  </span>
                  <span className="flex items-center gap-1">
                    <DashedSwatch color={C.baseline} />
                    Random
                  </span>
                </div>
              </div>
              <div>
                <SectionLabel>Decile lift (vs 8.7% baseline)</SectionLabel>
                <div className="mt-2 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={decileConversionData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke={C.borderSoft} />
                      <XAxis
                        dataKey="decile"
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 0.2]}
                        tickFormatter={(v) =>
                          `${Math.round((v as number) * 100)}%`
                        }
                        width={36}
                      />
                      <Tooltip
                        cursor={{ fill: C.bgPanel }}
                        content={
                          <ChartTooltip format={(v) => fmtPct(v * 100, 1)} />
                        }
                      />
                      <ReferenceLine
                        y={POPULATION_BASELINE_RATE}
                        stroke={C.accent}
                        strokeDasharray="4 3"
                      />
                      <Bar
                        dataKey="rate"
                        name="Conversion rate"
                        fill={C.primary}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardPanel>

          {/* Column 3: Activation & Monitoring */}
          <CardPanel>
            <PanelHeader
              eyebrow="Activation & monitoring"
              title="Recommendations & stability"
              description="Audiences ready to deploy and ongoing model health."
            />
            <div className="space-y-4 p-4">
              <PrimaryKPI
                label="Activation audiences ready"
                value={`${recommendedAudiences.length}`}
                delta="Persuadable · Lookalike · At-risk"
                sub="All three approved for deployment this cycle."
              />
              <div className="grid grid-cols-3">
                <MiniKPI
                  label="Drift status"
                  value={`${psiCounts.Review || 0} review`}
                  sub={`${psiCounts.Watch || 0} watch · ${psiCounts.Stable || 0} stable`}
                  dotColor={C.critical}
                />
                <MiniKPI
                  label="Label drift"
                  value={`${labelDriftDelta >= 0 ? "+" : ""}${labelDriftDelta.toFixed(1)} pts`}
                  sub="vs Jan baseline"
                  dotColor={C.accent}
                />
                <MiniKPI
                  label="Last refresh"
                  value="09 May"
                  sub="Daily scoring run"
                  dotColor={C.positive}
                />
              </div>
              <div>
                <SectionLabel>Recommended activation audiences</SectionLabel>
                <div className="mt-2 divide-y divide-[#eef0f3] border-y border-[#eef0f3]">
                  {recommendedAudiences.map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-[#1f2937]">
                          {row.name}
                        </p>
                        <p className="text-[10px] text-[#9ca3af]">
                          {row.channel}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-[#4b5563]">
                        {fullNumber.format(row.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Label drift trend</SectionLabel>
                <div className="mt-2 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={labelDriftData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke={C.borderSoft} />
                      <XAxis
                        dataKey="month"
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={C.textSubtle}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={[6, 10]}
                        tickFormatter={(v) => `${v}%`}
                        width={36}
                      />
                      <Tooltip
                        cursor={{ stroke: C.border, strokeWidth: 1 }}
                        content={
                          <ChartTooltip format={(v) => `${v.toFixed(1)}%`} />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="observed"
                        name="Observed"
                        stroke={C.accent}
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: C.accent, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        name="Baseline"
                        stroke={C.baseline}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-[#6b7280]">
                  <span className="flex items-center gap-1">
                    <span
                      className="h-0.5 w-3"
                      style={{ background: C.accent }}
                    />
                    Observed
                  </span>
                  <span className="flex items-center gap-1">
                    <DashedSwatch color={C.baseline} />
                    Baseline (9.0%)
                  </span>
                </div>
              </div>
            </div>
          </CardPanel>
        </section>

        {/* === Analytical detail row === */}
        <section className="grid gap-4 lg:grid-cols-2">
          <CardPanel>
            <PanelHeader
              eyebrow="Calibration"
              title="Actual vs. Predicted Conversion Rate"
              description="Predicted probability decile vs. observed conversion (D1 = highest)."
            />
            <div className="px-3 pb-3 pt-3">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={validationData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke={C.borderSoft} />
                    <XAxis
                      dataKey="decile"
                      stroke={C.textSubtle}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={C.textSubtle}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 0.2]}
                      tickFormatter={(v) =>
                        `${Math.round((v as number) * 100)}%`
                      }
                      width={36}
                    />
                    <Tooltip
                      cursor={{ stroke: C.border, strokeWidth: 1 }}
                      content={
                        <ChartTooltip format={(v) => fmtPct(v * 100, 1)} />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="Predicted"
                      stroke={C.primary}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: C.primary, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke={C.accent}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={{ r: 2, fill: C.accent, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center gap-3 px-2 text-[10px] text-[#6b7280]">
                <span className="flex items-center gap-1">
                  <span
                    className="h-0.5 w-3"
                    style={{ background: C.primary }}
                  />
                  Predicted
                </span>
                <span className="flex items-center gap-1">
                  <DashedSwatch color={C.accent} />
                  Actual
                </span>
              </div>
              <p className="mt-2 px-2 text-[10px] leading-4 text-[#9ca3af]">
                Higher-scored deciles should show higher observed conversion.
                Close alignment indicates the model is directionally calibrated.
              </p>
            </div>
          </CardPanel>

          <CardPanel>
            <PanelHeader
              eyebrow="Drift"
              title="Feature drift / PSI"
              description="Population Stability Index per model input vs. training baseline."
            />
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e5e7eb] hover:bg-transparent">
                  <TableHead className="h-8 px-4 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Feature
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    PSI
                  </TableHead>
                  <TableHead className="h-8 px-4 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {psiData.map((row) => (
                  <TableRow
                    key={row.feature}
                    className="border-b border-[#eef0f3] align-top last:border-b-0 hover:bg-[#fafbfc]"
                  >
                    <TableCell className="px-4 py-2 text-[11px] font-medium text-[#1f2937]">
                      {row.feature}
                      <div className="text-[10px] leading-4 text-[#9ca3af]">
                        {row.interpretation}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] font-medium tabular-nums text-[#1f2937]">
                      {row.psi.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <StatusBadge status={psiStatus(row.psi)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="border-t border-[#eef0f3] px-4 py-2 text-[10px] text-[#9ca3af]">
              Stable &lt; 0.10 · Watch 0.10–0.20 · Review ≥ 0.20
            </p>
          </CardPanel>
        </section>

        {/* === Revenue segments + Agent === */}
        <section className="grid gap-4 lg:grid-cols-2">
          <CardPanel>
            <PanelHeader
              eyebrow="Value tiers"
              title="High-value customer segments"
              description="Revenue and behavior summary by segment."
            />
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e5e7eb] hover:bg-transparent">
                  <TableHead className="h-8 px-4 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Segment
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Customers
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Revenue
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Avg check
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Normalize live + fallback to a single shape for rendering.
                  const normalized = liveHvc
                    ? liveHvc.map((r) => ({
                        segment: r.segment,
                        customers: r.customers,
                        revenue: r.totalLifetimeRevenue,
                        avgCheck: r.avgCheck,
                      }))
                    : hvcSegments.map((r) => ({
                        segment: r.segment,
                        customers: r.customers,
                        revenue: r.revenue,
                        avgCheck: r.avgCheck,
                      }));
                  const totalForShare =
                    normalized.reduce((s, r) => s + r.customers, 0) ||
                    totalCustomers;
                  return normalized.map((row) => {
                    const share = totalForShare
                      ? (row.customers / totalForShare) * 100
                      : 0;
                    return (
                      <TableRow
                        key={row.segment}
                        className="border-b border-[#eef0f3] last:border-b-0 hover:bg-[#fafbfc]"
                      >
                        <TableCell className="px-4 py-2 text-[11px] font-medium text-[#1f2937]">
                          {row.segment}
                          <div className="text-[10px] text-[#9ca3af]">
                            {fmtPct(share, 1)} of universe
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right text-[11px] tabular-nums text-[#4b5563]">
                          {fullNumber.format(row.customers)}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right text-[11px] font-medium tabular-nums text-[#1f2937]">
                          {compactCurrency.format(row.revenue)}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right text-[11px] tabular-nums text-[#4b5563]">
                          ${Math.round(row.avgCheck)}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </CardPanel>

          <CardPanel>
            <PanelHeader
              eyebrow="Analytics agent"
              title="Ask Tom"
            />
            <div className="space-y-3 p-4">
              <div className="space-y-1">
                {prompts.map((p) => (
                  <button
                    key={p}
                    className="block w-full border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-left text-[11px] text-[#4b5563] hover:border-[#9ca3af] hover:bg-[#fafbfc]"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Ask about audiences, DMAs, revenue segments, or activation planning…"
                  className="min-h-20 resize-none rounded-none border-[#e5e7eb] bg-white text-xs text-[#1f2937] placeholder:text-[#9ca3af] focus-visible:ring-0 focus-visible:border-[#1f2937]"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-[#9ca3af]">
                    Wires to /api/agent/chat
                  </p>
                  <button className="h-7 border border-[#1f2937] bg-[#1f2937] px-3 text-[11px] font-medium text-white hover:bg-[#374151]">
                    Answer
                  </button>
                </div>
              </div>
            </div>
          </CardPanel>
        </section>

        {/* === Activation Loop ============================================ */}
        <section className="space-y-3">
          <div>
            <SectionLabel>Phase loop</SectionLabel>
            <h2 className="mt-1 text-[16px] font-semibold leading-tight tracking-tight text-[#1f2937]">
              Activation Loop
            </h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-[#6b7280]">
              How scored audiences move from BigQuery into media and CRM
              activation, then back into measurement and retraining signals.
            </p>
          </div>

          {/* Four phase cards */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ACTIVATION_PHASES.map((phase) => (
              <CardPanel key={phase.phase}>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">
                        Phase {phase.phase}
                      </p>
                      <p className="mt-0.5 text-[12px] font-semibold leading-tight text-[#1f2937]">
                        {phase.title}
                      </p>
                    </div>
                    <StatusBadge
                      status={{
                        label: phase.statusLabel,
                        color: phase.statusColor,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-[16px] font-semibold leading-none tabular-nums text-[#1f2937]">
                    {phase.metric}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-[#6b7280]">
                    {phase.description}
                  </p>
                </div>
              </CardPanel>
            ))}
          </div>

          {/* Activation Operations table */}
          <CardPanel>
            <PanelHeader
              eyebrow="Operations"
              title="Activation Operations"
              description="Per-audience write-back performance across the activated destinations this cycle."
            />
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e5e7eb] hover:bg-transparent">
                  <TableHead className="h-8 px-4 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Audience
                  </TableHead>
                  <TableHead className="h-8 px-4 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Platform
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Sent
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Accepted
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Match Rate
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Lift
                  </TableHead>
                  <TableHead className="h-8 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Incr. Revenue
                  </TableHead>
                  <TableHead className="h-8 px-4 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activationOps.map((row) => (
                  <TableRow
                    key={`${row.audience}-${row.platform}`}
                    className="border-b border-[#eef0f3] last:border-b-0 hover:bg-[#fafbfc]"
                  >
                    <TableCell className="px-4 py-2 text-[11px] font-medium text-[#1f2937]">
                      {row.audience}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-[11px] text-[#4b5563]">
                      {row.platform}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] tabular-nums text-[#4b5563]">
                      {fmtMaybe(row.sent, (n) => fullNumber.format(n))}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] tabular-nums text-[#4b5563]">
                      {fmtMaybe(row.accepted, (n) => fullNumber.format(n))}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] tabular-nums text-[#1f2937]">
                      {fmtMaybe(row.match_rate, (n) => pctRatio.format(n))}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] font-medium tabular-nums text-[#1f2937]">
                      {fmtMaybe(row.lift, (n) => pctRatio.format(n))}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] font-medium tabular-nums text-[#1f2937]">
                      {fmtMaybe(row.incremental_revenue, (n) =>
                        compactCurrencyShort.format(n),
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <StatusBadge
                        status={{
                          label: row.status,
                          color: operationStatusColor(row.status),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!activationOps.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="px-4 py-4 text-center text-[11px] text-[#9ca3af]"
                    >
                      No activation runs in this cycle.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardPanel>

          {/* Retraining signal callout */}
          <CardPanel>
            <PanelHeader
              eyebrow="Feedback loop"
              title={retrainingSignal.title}
              action={
                <StatusBadge
                  status={{
                    label: retrainingSignal.status_label,
                    color: retrainingSignal.eligible ? "#59a14f" : "#6b7280",
                  }}
                />
              }
            />
            <p className="px-4 py-3 text-[12px] leading-5 text-[#1f2937]">
              {retrainingSignal.copy}
            </p>
          </CardPanel>
        </section>

        <footer className="border-t border-[#e5e7eb] pt-4 pb-2 text-[10px] text-[#9ca3af]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Internal demo for client review — values are validated where
              labeled and mocked elsewhere.
            </span>
            <span className="tabular-nums">
              tombras-demo · fogo_churrasgo · v2 · Fogo Propensity Analytics
              Agent
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
