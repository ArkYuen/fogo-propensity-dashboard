/**
 * GET /api/dashboard/regions?audience=persuadable|lookalike|at-risk|universe
 *
 * Returns audience counts grouped into 6 regions for the map.
 *
 * The actual DMA values in the source views are lowercase snake_case
 * (e.g. "new_york", "san_francisco"). We normalize on the way into the
 * CASE expression so we are robust to spaces, dashes, and underscores
 * regardless of upstream changes.
 *
 * "Other" rows are returned but the dashboard map ignores them.
 */
import { NextResponse } from "next/server";

import { resolveAtRisk } from "@/lib/at-risk";
import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";

type AudienceKey = "persuadable" | "lookalike" | "at-risk" | "universe";

const VIEW_BY_AUDIENCE: Record<Exclude<AudienceKey, "at-risk">, string> = {
  persuadable: "v_persuadable_audience",
  lookalike: "v_lookalike_seed_audience",
  universe: "v_customer_scores_current",
};

const FALLBACK_BY_AUDIENCE: Record<
  AudienceKey,
  { region: string; customers: number }[]
> = {
  persuadable: [
    { region: "Northeast", customers: 4920 },
    { region: "Southeast", customers: 3780 },
    { region: "Midwest", customers: 2640 },
    { region: "Texas / Plains", customers: 4110 },
    { region: "West", customers: 2420 },
    { region: "Florida", customers: 2166 },
  ],
  lookalike: [
    { region: "Northeast", customers: 4300 },
    { region: "Southeast", customers: 3450 },
    { region: "Midwest", customers: 2920 },
    { region: "Texas / Plains", customers: 4620 },
    { region: "West", customers: 2680 },
    { region: "Florida", customers: 2297 },
  ],
  "at-risk": [
    { region: "Northeast", customers: 3980 },
    { region: "Southeast", customers: 3120 },
    { region: "Midwest", customers: 2750 },
    { region: "Texas / Plains", customers: 3600 },
    { region: "West", customers: 2210 },
    { region: "Florida", customers: 3090 },
  ],
  universe: [
    { region: "Northeast", customers: 46500 },
    { region: "Southeast", customers: 35200 },
    { region: "Midwest", customers: 28900 },
    { region: "Texas / Plains", customers: 39700 },
    { region: "West", customers: 25600 },
    { region: "Florida", customers: 24100 },
  ],
};

// Normalize a `dma` column to lowercase snake_case before matching.
// Strips outer whitespace; replaces dashes and spaces with underscores.
const NORMALIZED_DMA =
  "LOWER(REPLACE(REPLACE(TRIM(dma), '-', '_'), ' ', '_'))";

// CASE expression: uses exact-match WHENs against the normalized DMA.
// Mapping built from the actual DMA values observed in BigQuery.
const REGION_CASE = `
  CASE ${NORMALIZED_DMA}
    WHEN 'new_york'      THEN 'Northeast'
    WHEN 'boston'        THEN 'Northeast'
    WHEN 'philadelphia'  THEN 'Northeast'
    WHEN 'washington_dc' THEN 'Northeast'
    WHEN 'miami'         THEN 'Florida'
    WHEN 'orlando'       THEN 'Florida'
    WHEN 'atlanta'       THEN 'Southeast'
    WHEN 'nashville'     THEN 'Southeast'
    WHEN 'chicago'       THEN 'Midwest'
    WHEN 'minneapolis'   THEN 'Midwest'
    WHEN 'dallas'        THEN 'Texas / Plains'
    WHEN 'houston'       THEN 'Texas / Plains'
    WHEN 'san_antonio'   THEN 'Texas / Plains'
    WHEN 'austin'        THEN 'Texas / Plains'
    WHEN 'kansas_city'   THEN 'Texas / Plains'
    WHEN 'los_angeles'   THEN 'West'
    WHEN 'san_francisco' THEN 'West'
    WHEN 'phoenix'       THEN 'West'
    WHEN 'denver'        THEN 'West'
    WHEN 'beverly_hills' THEN 'West'
    ELSE 'Other'
  END
`;

const num = (v: unknown) => (v == null ? 0 : Number(v));

async function buildSql(
  audience: AudienceKey,
  bq: ReturnType<typeof getBigQuery>,
): Promise<string> {
  if (audience === "at-risk") {
    // v_hvc_revenue_segments doesn't expose `dma`, so we resolve the
    // at-risk customer_ids and JOIN to v_customer_scores_current to
    // pick up dma. If v_customer_scores_current also lacks dma, the
    // route's try/catch will fall back to the mocked region split.
    const { where: atRiskWhere } = await resolveAtRisk(bq);
    return `
      WITH at_risk_ids AS (
        SELECT DISTINCT customer_id
        FROM \`tombras-demo.fogo_churrasgo.v_hvc_revenue_segments\`
        WHERE ${atRiskWhere}
      )
      SELECT ${REGION_CASE} AS region, COUNT(DISTINCT s.customer_id) AS customers
      FROM \`tombras-demo.fogo_churrasgo.v_customer_scores_current\` s
      JOIN at_risk_ids a USING (customer_id)
      WHERE s.dma IS NOT NULL
      GROUP BY region
      ORDER BY customers DESC
    `;
  }
  const view = VIEW_BY_AUDIENCE[audience];
  return `
    SELECT ${REGION_CASE} AS region, COUNT(DISTINCT customer_id) AS customers
    FROM \`tombras-demo.fogo_churrasgo.${view}\`
    WHERE dma IS NOT NULL
    GROUP BY region
    ORDER BY customers DESC
  `;
}

function withShare(rows: { region: string; customers: number }[]) {
  const total = rows.reduce((sum, r) => sum + r.customers, 0);
  return rows.map((r) => ({
    region: r.region,
    customers: r.customers,
    share: total ? (r.customers * 100) / total : 0,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const audienceParam = (searchParams.get("audience") ??
    "persuadable") as AudienceKey;
  const audience: AudienceKey = (
    ["persuadable", "lookalike", "at-risk", "universe"] as AudienceKey[]
  ).includes(audienceParam)
    ? audienceParam
    : "persuadable";

  try {
    const bq = getBigQuery();
    const sql = await buildSql(audience, bq);
    const [rows] = await bq.query({ query: sql });
    const data = rows.map((r: Record<string, unknown>) => ({
      region: String(r.region ?? "Other"),
      customers: num(r.customers),
    }));
    return NextResponse.json({
      audience,
      data: withShare(data),
      source: "bigquery" as const,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[regions:${audience}] BigQuery query failed:`, message);
    return NextResponse.json({
      audience,
      data: withShare(FALLBACK_BY_AUDIENCE[audience]),
      source: "fallback" as const,
      ...(process.env.NODE_ENV === "development" ? { error: message } : {}),
    });
  }
}
