/**
 * GET /api/timesfm/recommendations
 *
 * Per-channel budget recommendation rows feeding the recommendation
 * table on the budget-reallocation dashboard.
 *
 * Source: tombras-demo.timesfm_staging.channel_budget_recommendations
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";
import { timesfmTable } from "@/lib/timesfm-config";

export const runtime = "nodejs";

export type RecommendationRow = {
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

const FALLBACK: RecommendationRow[] = [
  {
    channel: "Meta",
    recent_cpa: 28.4,
    avg_forecasted_cpa_14d: 26.1,
    forecasted_cpa_change_pct: -8.1,
    recent_avg_daily_spend: 14000,
    recommended_new_daily_budget: 16800,
    recommended_budget_shift_pct: 20.0,
    risk_level: "low",
    recommendation: "Increase budget — efficiency improving.",
  },
  {
    channel: "Google",
    recent_cpa: 35.2,
    avg_forecasted_cpa_14d: 33.6,
    forecasted_cpa_change_pct: -4.5,
    recent_avg_daily_spend: 12500,
    recommended_new_daily_budget: 13750,
    recommended_budget_shift_pct: 10.0,
    risk_level: "low",
    recommendation: "Modest increase — stable performance.",
  },
  {
    channel: "TikTok",
    recent_cpa: 41.8,
    avg_forecasted_cpa_14d: 44.7,
    forecasted_cpa_change_pct: 6.9,
    recent_avg_daily_spend: 9000,
    recommended_new_daily_budget: 9450,
    recommended_budget_shift_pct: 5.0,
    risk_level: "medium",
    recommendation: "Hold steady with light increase — watch CPA drift.",
  },
  {
    channel: "LinkedIn",
    recent_cpa: 62.5,
    avg_forecasted_cpa_14d: 71.2,
    forecasted_cpa_change_pct: 13.9,
    recent_avg_daily_spend: 7500,
    recommended_new_daily_budget: 5625,
    recommended_budget_shift_pct: -25.0,
    risk_level: "high",
    recommendation: "Reduce budget — competitor pressure rising.",
  },
  {
    channel: "Snapchat",
    recent_cpa: 49.3,
    avg_forecasted_cpa_14d: 53.8,
    forecasted_cpa_change_pct: 9.1,
    recent_avg_daily_spend: 5500,
    recommended_new_daily_budget: 4675,
    recommended_budget_shift_pct: -15.0,
    risk_level: "medium",
    recommendation: "Reduce — reallocate to Meta.",
  },
];

const SQL = `
  SELECT *
  FROM ${timesfmTable("channel_budget_recommendations")}
  ORDER BY forecast_efficiency_rank, channel
`;

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({ query: SQL });
    const data: RecommendationRow[] = rows.map(
      (r: Record<string, unknown>) => ({
        channel: String(r.channel ?? ""),
        recent_cpa: num(r.recent_cpa),
        avg_forecasted_cpa_14d: num(r.avg_forecasted_cpa_14d),
        forecasted_cpa_change_pct: num(r.forecasted_cpa_change_pct),
        recent_avg_daily_spend: num(r.recent_avg_daily_spend),
        recommended_new_daily_budget: num(r.recommended_new_daily_budget),
        recommended_budget_shift_pct: num(r.recommended_budget_shift_pct),
        risk_level: String(r.risk_level ?? "low").toLowerCase(),
        recommendation: String(r.recommendation ?? ""),
      }),
    );
    return NextResponse.json({ data, source: "bigquery" as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      "[timesfm/recommendations] BigQuery query failed:",
      message,
    );
    return NextResponse.json({
      data: FALLBACK,
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
