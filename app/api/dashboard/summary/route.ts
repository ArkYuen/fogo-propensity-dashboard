/**
 * GET /api/dashboard/summary
 *
 * Returns canonical audience counts + penetration percentages for the
 * top KPI strip. Falls back to mocked values if BigQuery is unreachable
 * or credentials are missing.
 *
 * The "at-risk high-potential" count is resolved by `resolveAtRisk()`
 * (see lib/at-risk.ts) which progressively loosens criteria until it
 * finds a non-zero count, then caches the chosen tier per process.
 */
import { NextResponse } from "next/server";

import { resolveAtRisk } from "@/lib/at-risk";
import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";

const FALLBACK = {
  totalCustomers: 200000,
  hvcCustomers: 200000,
  persuadableCustomers: 20036,
  lookalikeSeedCustomers: 20267,
  atRiskHighPotentialCustomers: 18750,
  persuadablePct: 10.02,
  lookalikeSeedPct: 10.13,
  atRiskHighPotentialPct: 9.38,
};

const PROJECT = "tombras-demo";
const DATASET = "fogo_churrasgo";
const t = (view: string) => `\`${PROJECT}.${DATASET}.${view}\``;

const MAIN_COUNTS_SQL = `
  SELECT
    (SELECT COUNT(DISTINCT customer_id) FROM ${t("v_customer_scores_current")}) AS totalCustomers,
    (SELECT COUNT(DISTINCT customer_id) FROM ${t("v_hvc_revenue_segments")}) AS hvcCustomers,
    (SELECT COUNT(DISTINCT customer_id) FROM ${t("v_persuadable_audience")}) AS persuadableCustomers,
    (SELECT COUNT(DISTINCT customer_id) FROM ${t("v_lookalike_seed_audience")}) AS lookalikeSeedCustomers
`;

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function GET() {
  try {
    const bq = getBigQuery();

    const [mainRows] = await bq.query({ query: MAIN_COUNTS_SQL });
    if (!mainRows.length) throw new Error("Empty main counts result");
    const main = mainRows[0];

    const totalCustomers = num(main.totalCustomers);
    const hvcCustomers = num(main.hvcCustomers);
    const persuadableCustomers = num(main.persuadableCustomers);
    const lookalikeSeedCustomers = num(main.lookalikeSeedCustomers);

    let atRiskHighPotentialCustomers = FALLBACK.atRiskHighPotentialCustomers;
    let atRiskFromBigQuery = false;
    let atRiskCriteria: string | null = null;
    try {
      const resolved = await resolveAtRisk(bq);
      atRiskHighPotentialCustomers = resolved.count;
      atRiskCriteria = resolved.label;
      atRiskFromBigQuery = resolved.count > 0;
      console.log("[summary] at-risk criteria:", resolved.label, "count:", resolved.count);
    } catch (atRiskErr) {
      console.warn(
        "[summary] at-risk resolve failed, using fallback:",
        atRiskErr instanceof Error ? atRiskErr.message : atRiskErr,
      );
    }

    const pct = (n: number) =>
      totalCustomers ? (n * 100) / totalCustomers : 0;

    return NextResponse.json({
      totalCustomers,
      hvcCustomers,
      persuadableCustomers,
      lookalikeSeedCustomers,
      atRiskHighPotentialCustomers,
      persuadablePct: pct(persuadableCustomers),
      lookalikeSeedPct: pct(lookalikeSeedCustomers),
      atRiskHighPotentialPct: pct(atRiskHighPotentialCustomers),
      source: "bigquery" as const,
      atRiskSource: atRiskFromBigQuery
        ? ("bigquery" as const)
        : ("fallback" as const),
      ...(process.env.NODE_ENV === "development" && atRiskCriteria
        ? { atRiskCriteria }
        : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[summary] BigQuery query failed:", message);
    return NextResponse.json({
      ...FALLBACK,
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
