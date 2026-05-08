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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const audienceData = [
  { name: "Customer universe", customers: 200000, tone: "base" },
  { name: "HVC segments", customers: 200000, tone: "base" },
  { name: "Persuadable", customers: 20036, tone: "accent" },
  { name: "Lookalike seed", customers: 20267, tone: "accent" },
];

const decileData = [
  { decile: "D1", score: 0.94 },
  { decile: "D2", score: 0.86 },
  { decile: "D3", score: 0.78 },
  { decile: "D4", score: 0.69 },
  { decile: "D5", score: 0.61 },
  { decile: "D6", score: 0.52 },
  { decile: "D7", score: 0.44 },
  { decile: "D8", score: 0.35 },
  { decile: "D9", score: 0.27 },
  { decile: "D10", score: 0.18 },
];

const dmaData = [
  { dma: "New York", customers: 4380, avgScore: 0.84, appRate: "43%" },
  { dma: "Miami-Ft. Lauderdale", customers: 3165, avgScore: 0.82, appRate: "39%" },
  { dma: "Dallas-Ft. Worth", customers: 2940, avgScore: 0.8, appRate: "37%" },
  { dma: "Houston", customers: 2610, avgScore: 0.79, appRate: "35%" },
  { dma: "Chicago", customers: 2245, avgScore: 0.77, appRate: "34%" },
];

const hvcSegments = [
  {
    segment: "Premium Loyalists",
    customers: "42.1K",
    revenue: "$18.4M",
    visits: "8.7",
    avgCheck: "$74",
  },
  {
    segment: "High-Spend Occasionals",
    customers: "31.8K",
    revenue: "$13.2M",
    visits: "3.2",
    avgCheck: "$96",
  },
  {
    segment: "Growth Potential",
    customers: "54.7K",
    revenue: "$10.6M",
    visits: "4.4",
    avgCheck: "$58",
  },
  {
    segment: "Emerging Guests",
    customers: "71.4K",
    revenue: "$7.9M",
    visits: "2.1",
    avgCheck: "$49",
  },
];

const recommendedAudiences = [
  {
    name: "Persuadable high-income diners in top DMAs",
    channel: "Paid social + CRM",
    reason:
      "Best near-term activation pool based on scale, model confidence, and media-market concentration.",
  },
  {
    name: "Lookalike seed based on premium loyalists",
    channel: "Platform lookalike modeling",
    reason:
      "Strong seed audience for Meta, Google, and DV360 expansion against high-value customer behavior.",
  },
  {
    name: "App non-users with strong acquisition scores",
    channel: "Owned channels + app onboarding",
    reason:
      "Useful for testing mobile adoption, loyalty conversion, and lower-funnel remarketing.",
  },
];

const prompts = [
  "How many customers are in each audience?",
  "Which DMAs have the largest persuadable audiences?",
  "Summarize the high-value customer revenue segments.",
  "Recommend three paid media activation audiences.",
];

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function StatCard({
  label,
  value,
  subtext,
  footnote,
}: {
  label: string;
  value: string;
  subtext: string;
  footnote: string;
}) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
          <p className="text-sm text-zinc-600">{subtext}</p>
          <p className="pt-2 text-xs text-zinc-500">{footnote}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterField({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <select
        defaultValue={value}
        className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-zinc-300 text-zinc-700">
                Internal demo
              </Badge>
              <Badge variant="outline" className="border-zinc-300 text-zinc-700">
                BigQuery-backed
              </Badge>
              <Badge variant="outline" className="border-zinc-300 text-zinc-700">
                Gemini agent enabled
              </Badge>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Customer Propensity & Activation
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
              Audience sizing, high-value customer profiling, and media activation
              planning for the Fogo de Chão propensity model demo.
            </p>
          </div>

          <div className="grid min-w-[280px] gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Connected agent</span>
              <span className="font-medium text-zinc-900">
                Fogo Propensity Analytics Agent
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Approved sources</span>
              <span className="font-medium text-zinc-900">4 views</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Validation</span>
              <span className="font-medium text-zinc-900">Smoke test passed</span>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterField
            label="Audience focus"
            value="Persuadable customers"
            options={[
              "Persuadable customers",
              "Lookalike seed audience",
              "Customer universe",
              "High-value customer segments",
            ]}
          />
          <FilterField
            label="Market scope"
            value="Top DMAs"
            options={[
              "Top DMAs",
              "All markets",
              "Northeast",
              "South",
              "Midwest",
            ]}
          />
          <FilterField
            label="Activation objective"
            value="Paid media + CRM"
            options={[
              "Paid media + CRM",
              "CRM only",
              "App adoption",
              "Lookalike modeling",
            ]}
          />
          <FilterField
            label="Model version"
            value="Current"
            options={["Current", "Previous", "Compare versions"]}
          />
          <div className="flex items-end rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            <Button className="w-full bg-zinc-900 text-white hover:bg-zinc-800">
              Export snapshot
            </Button>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Current customer universe"
            value="200,000"
            subtext="Scored customer records"
            footnote="Primary denominator for audience sizing"
          />
          <StatCard
            label="Persuadable audience"
            value="20,036"
            subtext="10.02% penetration"
            footnote="High-priority activation pool"
          />
          <StatCard
            label="Lookalike seed audience"
            value="20,267"
            subtext="10.13% penetration"
            footnote="Suitable for platform seed expansion"
          />
          <StatCard
            label="HVC segment coverage"
            value="200,000"
            subtext="Revenue-segmented customers"
            footnote="Supports value-based targeting"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-zinc-950">
                  Executive summary
                </CardTitle>
                <CardDescription>
                  Recommended takeaways for media, CRM, and client discussion.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">
                    Best immediate activation audience
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Persuadable high-income diners in the largest DMAs provide the
                    strongest balance of scale, quality, and campaign readiness.
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">
                    Best expansion audience
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Lookalike seeds built from premium loyalists are best suited
                    for upper-funnel paid media expansion and platform-based
                    modeling.
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">
                    Best owned-channel test
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    App non-users with strong acquisition scores are a practical
                    segment for onboarding, loyalty conversion, and CRM testing.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-zinc-950">
                    Audience composition
                  </CardTitle>
                  <CardDescription>
                    Validated counts across the approved customer views.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={audienceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                        <YAxis stroke="#71717a" fontSize={11} />
                        <Tooltip
                          formatter={(value) => [formatNumber(value as number), "Customers"]}
                          contentStyle={{
                            background: "#ffffff",
                            border: "1px solid #e4e4e7",
                            borderRadius: 8,
                            color: "#18181b",
                          }}
                        />
                        <Bar dataKey="customers" radius={[4, 4, 0, 0]}>
                          {audienceData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.tone === "accent" ? "#991b1b" : "#27272a"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-zinc-950">
                    Acquisition score deciles
                  </CardTitle>
                  <CardDescription>
                    Mocked analytical view for score distribution by decile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={decileData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis dataKey="decile" stroke="#71717a" fontSize={11} />
                        <YAxis
                          stroke="#71717a"
                          fontSize={11}
                          domain={[0, 1]}
                          tickFormatter={(value) => `${Math.round(value * 100)}%`}
                        />
                        <Tooltip
                          formatter={(value) => [formatPercent(value as number), "Average score"]}
                          contentStyle={{
                            background: "#ffffff",
                            border: "1px solid #e4e4e7",
                            borderRadius: 8,
                            color: "#18181b",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#0f172a"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#0f172a" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-zinc-950">
                    Top persuadable DMAs
                  </CardTitle>
                  <CardDescription>
                    Priority markets by persuadable customer volume.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-zinc-200">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-left text-zinc-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">DMA</th>
                          <th className="px-4 py-3 font-medium">Customers</th>
                          <th className="px-4 py-3 font-medium">Avg. score</th>
                          <th className="px-4 py-3 font-medium">App rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dmaData.map((row) => (
                          <tr key={row.dma} className="border-t border-zinc-200">
                            <td className="px-4 py-3 font-medium text-zinc-900">
                              {row.dma}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {formatNumber(row.customers)}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.avgScore}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.appRate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-zinc-950">
                    High-value customer segments
                  </CardTitle>
                  <CardDescription>
                    Revenue and behavior summary by segment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-zinc-200">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-left text-zinc-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Segment</th>
                          <th className="px-4 py-3 font-medium">Customers</th>
                          <th className="px-4 py-3 font-medium">Revenue</th>
                          <th className="px-4 py-3 font-medium">Visits</th>
                          <th className="px-4 py-3 font-medium">Avg. check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hvcSegments.map((row) => (
                          <tr key={row.segment} className="border-t border-zinc-200">
                            <td className="px-4 py-3 font-medium text-zinc-900">
                              {row.segment}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.customers}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.revenue}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.visits}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {row.avgCheck}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-zinc-950">
                  Recommended activation audiences
                </CardTitle>
                <CardDescription>
                  Suggested audiences for immediate testing and media deployment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Audience</th>
                        <th className="px-4 py-3 font-medium">Primary channel</th>
                        <th className="px-4 py-3 font-medium">Business rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendedAudiences.map((row) => (
                        <tr key={row.name} className="border-t border-zinc-200 align-top">
                          <td className="px-4 py-3 font-medium text-zinc-900">
                            {row.name}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">{row.channel}</td>
                          <td className="px-4 py-3 text-zinc-700">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-zinc-950">
                  Ask the analytics agent
                </CardTitle>
                <CardDescription>
                  Natural-language Q&A over the approved BigQuery views.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Suggested prompts
                  </p>
                  <div className="space-y-2">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt}
                        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Example response
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    The persuadable audience contains 20,036 customers, or about
                    10.02% of the current scored universe. This is a strong
                    activation pool because it balances model confidence with
                    reachable audience scale.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-zinc-300 text-zinc-700">
                      Plain-English summary
                    </Badge>
                    <Badge variant="outline" className="border-zinc-300 text-zinc-700">
                      SQL transparency next
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Textarea
                    placeholder="Ask about audiences, DMAs, revenue segments, or activation planning..."
                    className="min-h-28 resize-none border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400"
                  />
                  <Button className="w-full bg-zinc-900 text-white hover:bg-zinc-800">
                    Run question
                  </Button>
                  <p className="text-xs text-zinc-500">
                    Demo mode currently shows mocked output. Next step wires this
                    panel to `/api/agent/chat`.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-zinc-950">
                  Methodology
                </CardTitle>
                <CardDescription>
                  Scope and operating assumptions for this analytics view.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-zinc-700">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  Uses four approved BigQuery views for customer scores, HVC
                  segments, persuadable audiences, and lookalike seed audiences.
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  Percentages use the current customer universe as the default
                  denominator unless otherwise specified.
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  Dashboard visuals are mocked for design validation. Final KPI
                  and chart routes will be backed by fixed SQL queries.
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}