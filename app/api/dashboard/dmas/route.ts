/**
 * GET /api/dashboard/dmas
 *
 * Returns the top persuadable DMAs ordered by customer count.
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";

const FALLBACK = [
  { dma: "New York", customers: 4380, avgIdentificationScore: 0.86, avgAcquisitionScore: 0.84 },
  { dma: "Miami–Ft. Lauderdale", customers: 3165, avgIdentificationScore: 0.83, avgAcquisitionScore: 0.82 },
  { dma: "Dallas–Ft. Worth", customers: 2940, avgIdentificationScore: 0.81, avgAcquisitionScore: 0.8 },
  { dma: "Houston", customers: 2610, avgIdentificationScore: 0.8, avgAcquisitionScore: 0.79 },
  { dma: "Chicago", customers: 2245, avgIdentificationScore: 0.79, avgAcquisitionScore: 0.77 },
  { dma: "Atlanta", customers: 1890, avgIdentificationScore: 0.77, avgAcquisitionScore: 0.75 },
  { dma: "Los Angeles", customers: 1640, avgIdentificationScore: 0.75, avgAcquisitionScore: 0.74 },
];

const SQL = `
  SELECT
    dma,
    COUNT(DISTINCT customer_id) AS customers,
    AVG(identification_score) AS avgIdentificationScore,
    AVG(acquisition_score) AS avgAcquisitionScore
  FROM \`tombras-demo.fogo_churrasgo.v_persuadable_audience\`
  WHERE dma IS NOT NULL
  GROUP BY dma
  ORDER BY customers DESC
  LIMIT 20
`;

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({ query: SQL });
    const data = rows.map((r: Record<string, unknown>) => ({
      dma: String(r.dma ?? ""),
      customers: num(r.customers),
      avgIdentificationScore: num(r.avgIdentificationScore),
      avgAcquisitionScore: num(r.avgAcquisitionScore),
    }));
    return NextResponse.json({ data, source: "bigquery" as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[dmas] BigQuery query failed:", message);
    return NextResponse.json({
      data: FALLBACK,
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
