/**
 * GET /api/timesfm/forecast
 *
 * Returns actuals vs. TimesFM forecast (with optional confidence bounds)
 * per channel and date. Used for the "forecast" section of the
 * budget-reallocation dashboard.
 *
 * Source: tombras-demo.timesfm_staging.dashboard_actuals_vs_forecast
 *
 * The route uses SELECT * so it tolerates the wider column variations
 * that real forecast tables tend to have (e.g. lower/upper bound columns
 * may be named differently). Downstream code reads fields defensively.
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";
import { timesfmTable } from "@/lib/timesfm-config";

export const runtime = "nodejs";

export type ForecastRow = {
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

function buildFallback(): ForecastRow[] {
  const channels = ["Meta", "Google", "TikTok", "LinkedIn", "Snapchat"];
  const out: ForecastRow[] = [];
  const today = new Date("2026-05-09");
  // 30 days history + 14 days forecast = 44 days total.
  for (let i = -29; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const isFuture = i > 0;
    channels.forEach((ch, idx) => {
      const baseCpa = 32 + idx * 4 + Math.sin((i + idx * 3) / 6) * 3.5;
      const baseConv = 320 - idx * 38 + Math.sin((i + idx) / 5) * 22;
      const cpa = Number(baseCpa.toFixed(2));
      const conv = Math.max(20, Math.round(baseConv));
      out.push({
        date: dateStr,
        channel: ch,
        actual_cpa: isFuture ? null : cpa,
        forecasted_cpa: isFuture ? Number((cpa + 0.6).toFixed(2)) : null,
        cpa_lower: isFuture ? Number((cpa - 3.4).toFixed(2)) : null,
        cpa_upper: isFuture ? Number((cpa + 4.1).toFixed(2)) : null,
        actual_conversions: isFuture ? null : conv,
        forecasted_conversions: isFuture ? conv - 4 : null,
        conversions_lower: isFuture ? Math.max(10, conv - 28) : null,
        conversions_upper: isFuture ? conv + 30 : null,
      });
    });
  }
  return out;
}

const SQL = `
  SELECT *
  FROM ${timesfmTable("dashboard_actuals_vs_forecast")}
  ORDER BY date, channel
`;

function dateToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "value" in (v as object)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return String(v);
}

const numOrNull = (v: unknown): number | null =>
  v == null ? null : Number(v);

// Column-name flexibility: BigQuery teams sometimes name confidence-band
// columns with different prefixes. Read the first key that's populated.
function pickField(
  row: Record<string, unknown>,
  candidates: string[],
): unknown {
  for (const k of candidates) {
    if (row[k] != null) return row[k];
  }
  return null;
}

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({ query: SQL });
    const data: ForecastRow[] = rows.map((r: Record<string, unknown>) => ({
      date: dateToString(r.date ?? r.day ?? r.dt),
      channel: String(r.channel ?? ""),
      actual_cpa: numOrNull(pickField(r, ["actual_cpa", "cpa_actual"])),
      forecasted_cpa: numOrNull(
        pickField(r, ["forecasted_cpa", "forecast_cpa", "cpa_forecast"]),
      ),
      cpa_lower: numOrNull(
        pickField(r, [
          "cpa_lower_bound",
          "cpa_lower",
          "lower_bound_cpa",
          "forecasted_cpa_lower",
        ]),
      ),
      cpa_upper: numOrNull(
        pickField(r, [
          "cpa_upper_bound",
          "cpa_upper",
          "upper_bound_cpa",
          "forecasted_cpa_upper",
        ]),
      ),
      actual_conversions: numOrNull(
        pickField(r, ["actual_conversions", "conversions_actual"]),
      ),
      forecasted_conversions: numOrNull(
        pickField(r, [
          "forecasted_conversions",
          "forecast_conversions",
          "conversions_forecast",
        ]),
      ),
      conversions_lower: numOrNull(
        pickField(r, [
          "conversions_lower_bound",
          "conversions_lower",
          "lower_bound_conversions",
          "forecasted_conversions_lower",
        ]),
      ),
      conversions_upper: numOrNull(
        pickField(r, [
          "conversions_upper_bound",
          "conversions_upper",
          "upper_bound_conversions",
          "forecasted_conversions_upper",
        ]),
      ),
    }));
    return NextResponse.json({ data, source: "bigquery" as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[timesfm/forecast] BigQuery query failed:", message);
    return NextResponse.json({
      data: buildFallback(),
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
