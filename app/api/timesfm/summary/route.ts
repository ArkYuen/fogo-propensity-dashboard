/**
 * GET /api/timesfm/summary
 *
 * Returns the single-row portfolio budget summary used to populate the
 * top KPI strip on the budget-reallocation dashboard.
 *
 * Source: tombras-demo.timesfm_staging.portfolio_budget_summary
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";
import { timesfmTable } from "@/lib/timesfm-config";

export const runtime = "nodejs";

const FALLBACK = {
  current_total_daily_budget: 48500,
  recommended_total_daily_budget: 51200,
  forecasted_total_conversions_14d: 18460,
  avg_portfolio_forecasted_cpa: 38.7,
  channels_to_increase: 3,
  channels_to_reduce: 2,
  high_risk_channels: 1,
};

const SQL = `
  SELECT *
  FROM ${timesfmTable("portfolio_budget_summary")}
  LIMIT 1
`;

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({ query: SQL });
    if (!rows.length) throw new Error("Empty portfolio_budget_summary");
    const r = rows[0];
    return NextResponse.json({
      data: {
        current_total_daily_budget: num(r.current_total_daily_budget),
        recommended_total_daily_budget: num(r.recommended_total_daily_budget),
        forecasted_total_conversions_14d: num(r.forecasted_total_conversions_14d),
        avg_portfolio_forecasted_cpa: num(r.avg_portfolio_forecasted_cpa),
        channels_to_increase: num(r.channels_to_increase),
        channels_to_reduce: num(r.channels_to_reduce),
        high_risk_channels: num(r.high_risk_channels),
      },
      source: "bigquery" as const,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[timesfm/summary] BigQuery query failed:", message);
    return NextResponse.json({
      data: FALLBACK,
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
