/**
 * GET /api/timesfm/explainer
 *
 * Per-channel narrative cards (executive summary, explanation,
 * recommendation, risk level) used at the bottom of the
 * budget-reallocation dashboard.
 *
 * Source: tombras-demo.timesfm_staging.budget_reallocation_explainer
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";

export type ExplainerRow = {
  channel: string;
  executive_summary: string;
  explanation: string;
  recommendation: string;
  risk_level: string;
};

const FALLBACK: ExplainerRow[] = [
  {
    channel: "Meta",
    executive_summary:
      "Meta is the highest-confidence growth opportunity for the next 14 days.",
    explanation:
      "Forecasted CPA is improving 8% vs the past 14 days while competitor pressure has declined. The model assigns this channel the strongest efficiency signal in the portfolio.",
    recommendation: "Increase daily budget by ~20% and re-evaluate in 7 days.",
    risk_level: "low",
  },
  {
    channel: "Google",
    executive_summary:
      "Google is steady — small budget increase recommended.",
    explanation:
      "Forecasted CPA is roughly flat with stable conversion volume. Conversion forecast widens slightly on the upside band, indicating headroom.",
    recommendation: "Increase daily budget by ~10%.",
    risk_level: "low",
  },
  {
    channel: "TikTok",
    executive_summary:
      "TikTok is the swing channel — keep light pressure, watch CPA drift.",
    explanation:
      "Forecasted CPA rises ~7% but stays inside acceptable bounds. Competitor pressure is volatile, so the model recommends a small budget bump rather than a large reallocation.",
    recommendation: "Increase ~5%, review weekly.",
    risk_level: "medium",
  },
  {
    channel: "LinkedIn",
    executive_summary:
      "LinkedIn shows a clear efficiency degradation signal.",
    explanation:
      "Forecasted CPA increases 14% with a wider upper bound, and competitor pressure trended up over the past two weeks. Reallocating spend out of LinkedIn into Meta has the highest expected portfolio benefit.",
    recommendation: "Reduce daily budget by ~25%.",
    risk_level: "high",
  },
  {
    channel: "Snapchat",
    executive_summary:
      "Snapchat efficiency is softening — reduce and reallocate.",
    explanation:
      "Forecasted CPA rises 9% with elevated competitor pressure. Conversion volume forecast lower-band drops below recent observed levels.",
    recommendation: "Reduce daily budget by ~15%.",
    risk_level: "medium",
  },
];

const SQL = `
  SELECT
    channel,
    executive_summary,
    explanation,
    recommendation,
    risk_level
  FROM \`tombras-demo.timesfm_staging.budget_reallocation_explainer\`
`;

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({ query: SQL });
    const data: ExplainerRow[] = rows.map((r: Record<string, unknown>) => ({
      channel: String(r.channel ?? ""),
      executive_summary: String(r.executive_summary ?? ""),
      explanation: String(r.explanation ?? ""),
      recommendation: String(r.recommendation ?? ""),
      risk_level: String(r.risk_level ?? "low").toLowerCase(),
    }));
    return NextResponse.json({ data, source: "bigquery" as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[timesfm/explainer] BigQuery query failed:", message);
    return NextResponse.json({
      data: FALLBACK,
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
