/**
 * Shared at-risk high-potential criteria resolver.
 *
 * "At-risk high-potential" customers are worth protecting based on
 * prior value and predicted upside, but show weaker engagement
 * signals. Sized for controlled CRM/app/offer testing — not blanket
 * discounting.
 *
 * v_hvc_revenue_segments columns we use:
 *   customer_id, identification_score, acquisition_score,
 *   lifetime_revenue, visit_count, avg_check, segment
 *
 * The view does not expose a recency column, and `segment` only takes
 * values 'HVC' / 'Non-HVC', so we use lower visit count + prior value
 * + modeled score as proxy signals.
 *
 * If the strictest tier returns 0 we loosen progressively. The chosen
 * tier is cached per process so we don't pay the 2–3 extra queries on
 * every request — a fresh deploy or cold serverless invocation will
 * re-resolve.
 */
import type { BigQuery } from "@google-cloud/bigquery";

const HVC_VIEW = "`tombras-demo.fogo_churrasgo.v_hvc_revenue_segments`";

export type AtRiskTier = { label: string; where: string };

export const AT_RISK_TIERS: AtRiskTier[] = [
  {
    label: "tier1: segment!=HVC, ltv>0, visits 1-8, score>=0.25",
    where:
      "segment != 'HVC' AND lifetime_revenue > 0 AND visit_count BETWEEN 1 AND 8 AND (acquisition_score >= 0.25 OR identification_score >= 0.25)",
  },
  {
    label: "tier2: segment!=HVC, ltv>0, visits 1-8, score>=0.20",
    where:
      "segment != 'HVC' AND lifetime_revenue > 0 AND visit_count BETWEEN 1 AND 8 AND (acquisition_score >= 0.20 OR identification_score >= 0.20)",
  },
  {
    label: "tier3: segment!=HVC, ltv>0, visits 1-12, score>=0.20",
    where:
      "segment != 'HVC' AND lifetime_revenue > 0 AND visit_count BETWEEN 1 AND 12 AND (acquisition_score >= 0.20 OR identification_score >= 0.20)",
  },
];

let _cachedWhere: string | null = null;
let _cachedLabel: string | null = null;
let _cachedCount: number | null = null;

/**
 * Resolve at-risk criteria + count. Tries each tier in order, returns
 * the first non-zero result. Caches per process.
 */
export async function resolveAtRisk(bq: BigQuery): Promise<{
  where: string;
  label: string;
  count: number;
}> {
  if (_cachedWhere && _cachedLabel && _cachedCount !== null) {
    return {
      where: _cachedWhere,
      label: _cachedLabel,
      count: _cachedCount,
    };
  }

  for (const tier of AT_RISK_TIERS) {
    const sql = `SELECT COUNT(DISTINCT customer_id) AS c FROM ${HVC_VIEW} WHERE ${tier.where}`;
    const [rows] = await bq.query({ query: sql });
    const count = Number(rows[0]?.c ?? 0);
    if (count > 0) {
      _cachedWhere = tier.where;
      _cachedLabel = tier.label;
      _cachedCount = count;
      return { where: tier.where, label: tier.label, count };
    }
  }

  // All tiers returned 0 — return loosest with count 0 so the caller
  // can still classify regions even though no rows match.
  const fallback = AT_RISK_TIERS[AT_RISK_TIERS.length - 1];
  const label = `${fallback.label} (all tiers returned 0)`;
  _cachedWhere = fallback.where;
  _cachedLabel = label;
  _cachedCount = 0;
  return { where: fallback.where, label, count: 0 };
}
