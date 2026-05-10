/**
 * GET /api/dashboard/hvc-segments
 *
 * Returns HVC revenue segments rolled up by *derived* business segment
 * (Premium Loyalists / High-Spend Occasionals / Growth Potential /
 * Emerging Guests) — the raw `segment` column on the view only takes
 * values 'HVC' / 'Non-HVC', so we derive richer business labels from
 * visit_count / avg_check / lifetime_revenue / model scores.
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";

const FALLBACK = [
  {
    segment: "Premium Loyalists",
    customers: 42100,
    totalLifetimeRevenue: 18400000,
    avgLifetimeRevenue: 437,
    avgVisitCount: 8.7,
    avgCheck: 74,
  },
  {
    segment: "High-Spend Occasionals",
    customers: 31800,
    totalLifetimeRevenue: 13200000,
    avgLifetimeRevenue: 415,
    avgVisitCount: 3.2,
    avgCheck: 96,
  },
  {
    segment: "Growth Potential",
    customers: 54700,
    totalLifetimeRevenue: 10600000,
    avgLifetimeRevenue: 194,
    avgVisitCount: 4.4,
    avgCheck: 58,
  },
  {
    segment: "Emerging Guests",
    customers: 71400,
    totalLifetimeRevenue: 7900000,
    avgLifetimeRevenue: 111,
    avgVisitCount: 2.1,
    avgCheck: 49,
  },
];

// Derived segment classification (CASE expression evaluated per row).
//   Premium Loyalists:        HVC and frequent (visit_count >= 10)
//   High-Spend Occasionals:   HVC but infrequent (visit_count < 10) —
//                             classified as high-spend by virtue of
//                             qualifying as HVC at all
//   Growth Potential:         Non-HVC with prior value AND model
//                             signal (id or acquisition score >= 0.25)
//   Emerging Guests:          remaining Non-HVC with prior value
// Customers with no prior value (lifetime_revenue = 0) are excluded.
const SQL = `
  WITH segmented AS (
    SELECT
      customer_id,
      lifetime_revenue,
      visit_count,
      avg_check,
      CASE
        WHEN segment = 'HVC' AND visit_count >= 10 THEN 'Premium Loyalists'
        WHEN segment = 'HVC' THEN 'High-Spend Occasionals'
        WHEN segment != 'HVC' AND lifetime_revenue > 0
             AND (identification_score >= 0.25 OR acquisition_score >= 0.25)
          THEN 'Growth Potential'
        WHEN segment != 'HVC' AND lifetime_revenue > 0 THEN 'Emerging Guests'
        ELSE NULL
      END AS derivedSegment
    FROM \`tombras-demo.fogo_churrasgo.v_hvc_revenue_segments\`
  )
  SELECT
    derivedSegment AS segment,
    COUNT(DISTINCT customer_id) AS customers,
    SUM(lifetime_revenue) AS totalLifetimeRevenue,
    AVG(lifetime_revenue) AS avgLifetimeRevenue,
    AVG(visit_count) AS avgVisitCount,
    AVG(avg_check) AS avgCheck
  FROM segmented
  WHERE derivedSegment IS NOT NULL
  GROUP BY derivedSegment
  HAVING COUNT(DISTINCT customer_id) > 0
  ORDER BY totalLifetimeRevenue DESC
`;

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({ query: SQL });
    const data = rows.map((r: Record<string, unknown>) => ({
      segment: String(r.segment ?? ""),
      customers: num(r.customers),
      totalLifetimeRevenue: num(r.totalLifetimeRevenue),
      avgLifetimeRevenue: num(r.avgLifetimeRevenue),
      avgVisitCount: num(r.avgVisitCount),
      avgCheck: num(r.avgCheck),
    }));
    return NextResponse.json({ data, source: "bigquery" as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[hvc-segments] BigQuery query failed:", message);
    return NextResponse.json({
      data: FALLBACK,
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
