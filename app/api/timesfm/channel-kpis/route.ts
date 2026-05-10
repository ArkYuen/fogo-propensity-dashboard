/**
 * GET /api/timesfm/channel-kpis
 *
 * Returns the historical daily KPI series per channel used for the
 * "historical performance" charts (spend, conversions, CPA, ROAS,
 * competitor pressure).
 *
 * Source: tombras-demo.timesfm_staging.channel_daily_kpis
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";

export type ChannelKpiRow = {
  date: string;
  channel: string;
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
  competitor_pressure: number;
};

// 60-day mock series across 5 channels — used when BigQuery is offline or
// when columns don't match. Mirrors the visual rhythm we expect from real
// data so the dashboard looks complete in fallback mode.
function buildFallback(): ChannelKpiRow[] {
  const channels = ["Meta", "Google", "TikTok", "LinkedIn", "Snapchat"];
  const out: ChannelKpiRow[] = [];
  const today = new Date("2026-05-09");
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    channels.forEach((ch, idx) => {
      const base = 6000 - idx * 800;
      const wobble = Math.sin((i + idx * 4) / 6) * 380;
      const spend = Math.max(800, base + wobble + (Math.random() - 0.5) * 240);
      const cvr = 0.04 + idx * 0.003;
      const conversions = Math.max(8, Math.round((spend * cvr) / 12));
      const cpa = spend / Math.max(1, conversions);
      const roas = 2.4 + Math.sin((i + idx) / 7) * 0.6 + idx * 0.15;
      const comp = 0.42 + Math.sin((i + idx * 3) / 9) * 0.18 + idx * 0.04;
      out.push({
        date: dateStr,
        channel: ch,
        spend: Math.round(spend),
        conversions,
        cpa: Number(cpa.toFixed(2)),
        roas: Number(roas.toFixed(2)),
        competitor_pressure: Number(Math.max(0, Math.min(1, comp)).toFixed(3)),
      });
    });
  }
  return out;
}

const SQL = `
  SELECT
    date,
    channel,
    spend,
    conversions,
    cpa,
    roas,
    competitor_pressure
  FROM \`tombras-demo.timesfm_staging.channel_daily_kpis\`
  ORDER BY date ASC, channel ASC
`;

// BigQuery DATE columns come back as { value: "YYYY-MM-DD" } objects via
// the SDK. Normalize to a plain string regardless of shape.
function dateToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "value" in (v as object)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return String(v);
}

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({ query: SQL });
    const data: ChannelKpiRow[] = rows.map((r: Record<string, unknown>) => ({
      date: dateToString(r.date),
      channel: String(r.channel ?? ""),
      spend: num(r.spend),
      conversions: num(r.conversions),
      cpa: num(r.cpa),
      roas: num(r.roas),
      competitor_pressure: num(r.competitor_pressure),
    }));
    return NextResponse.json({ data, source: "bigquery" as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[timesfm/channel-kpis] BigQuery query failed:", message);
    return NextResponse.json({
      data: buildFallback(),
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
