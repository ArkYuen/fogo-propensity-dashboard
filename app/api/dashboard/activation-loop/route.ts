/**
 * GET /api/dashboard/activation-loop
 *
 * Powers the "Activation Loop" section on the propensity dashboard.
 *
 * Returns:
 *   - operations:        per-audience write-back rows
 *                        (audience, platform, sent, accepted, match rate,
 *                        lift, incremental revenue, status)
 *   - retraining_signal: a single feedback-loop summary row
 *                        (title, copy, status label, eligibility flag)
 *
 * Sources (queried independently; either may fall back):
 *   - tombras-demo.fogo_churrasgo.v_activation_operations_summary
 *   - tombras-demo.fogo_churrasgo.v_retraining_signals
 *
 * Each side is wrapped in its own try/catch so a missing or schema-drifted
 * view on one side doesn't suppress the other. The route-level `source`
 * field is "bigquery" only when both views returned live rows.
 */
import { NextResponse } from "next/server";

import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";

export type ActivationOperationRow = {
  audience: string;
  platform: string;
  sent: number | null;
  accepted: number | null;
  match_rate: number | null; // stored as ratio (0–1)
  lift: number | null; // stored as ratio (0–1)
  incremental_revenue: number | null; // dollars
  status: string;
};

export type RetrainingSignal = {
  title: string;
  copy: string;
  status_label: string;
  eligible: boolean;
};

const FALLBACK_OPERATIONS: ActivationOperationRow[] = [
  {
    audience: "Persuadable diners — top 5 DMAs",
    platform: "Meta Ads",
    sent: 15340,
    accepted: 14210,
    match_rate: 0.926,
    lift: 0.32,
    incremental_revenue: 57500,
    status: "Accepted",
  },
  {
    audience: "Lookalike seed — premium loyalists",
    platform: "Google Ads / DV360",
    sent: 20267,
    accepted: 18890,
    match_rate: 0.932,
    lift: null,
    incremental_revenue: null,
    status: "Accepted",
  },
  {
    audience: "At-risk high-potential — controlled CRM",
    platform: "Braze / Salesforce Marketing Cloud",
    sent: 18750,
    accepted: null,
    match_rate: null,
    lift: 0.316,
    incremental_revenue: 23300,
    status: "Queued",
  },
];

const FALLBACK_RETRAINING: RetrainingSignal = {
  title: "Retraining Signal",
  copy: "Activation measurement shows positive preliminary lift across paid media and CRM tests. Once enough runs accumulate, exposed/holdout outcomes can be written back to BigQuery as labels for model recalibration or retraining.",
  status_label: "Eligible for retraining signal",
  eligible: true,
};

const OPERATIONS_SQL = `
  SELECT *
  FROM \`tombras-demo.fogo_churrasgo.v_activation_operations_summary\`
`;

const RETRAINING_SQL = `
  SELECT *
  FROM \`tombras-demo.fogo_churrasgo.v_retraining_signals\`
  LIMIT 1
`;

const numOrNull = (v: unknown): number | null =>
  v == null ? null : Number(v);

// Column-name flexibility: view authors don't always agree on names.
function pickField(
  row: Record<string, unknown>,
  candidates: string[],
): unknown {
  for (const k of candidates) {
    if (row[k] != null) return row[k];
  }
  return null;
}

// Normalize ratio-like columns. If the view returns e.g. 92.6 (percent)
// rather than 0.926 (ratio), divide by 100 so the frontend can multiply
// consistently. Anything <= 1.5 is treated as already a ratio.
function asRatio(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n > 1.5 ? n / 100 : n;
}

type Source = "bigquery" | "fallback";

export async function GET() {
  let operations: ActivationOperationRow[] = FALLBACK_OPERATIONS;
  let retraining: RetrainingSignal = FALLBACK_RETRAINING;
  let opsSource: Source = "fallback";
  let retSource: Source = "fallback";
  let initError: string | null = null;

  try {
    const bq = getBigQuery();

    try {
      const [rows] = await bq.query({ query: OPERATIONS_SQL });
      if (rows.length) {
        operations = rows.map((r: Record<string, unknown>) => ({
          audience: String(
            pickField(r, ["audience", "audience_name", "segment"]) ?? "",
          ),
          platform: String(
            pickField(r, [
              "platform",
              "platform_name",
              "destination",
              "channel",
            ]) ?? "",
          ),
          sent: numOrNull(
            pickField(r, ["sent", "records_sent", "count_sent"]),
          ),
          accepted: numOrNull(
            pickField(r, ["accepted", "records_accepted", "count_accepted"]),
          ),
          match_rate: asRatio(
            pickField(r, ["match_rate", "match_pct", "match_rate_pct"]),
          ),
          lift: asRatio(
            pickField(r, ["lift", "lift_pct", "measured_lift"]),
          ),
          incremental_revenue: numOrNull(
            pickField(r, [
              "incremental_revenue",
              "inc_revenue",
              "revenue_lift",
            ]),
          ),
          status: String(
            pickField(r, ["status", "activation_status"]) ?? "Pending",
          ),
        }));
        opsSource = "bigquery";
      }
    } catch (opsErr) {
      console.warn(
        "[activation-loop] operations query failed, using fallback:",
        opsErr instanceof Error ? opsErr.message : opsErr,
      );
    }

    try {
      const [rows] = await bq.query({ query: RETRAINING_SQL });
      if (rows.length) {
        const r = rows[0] as Record<string, unknown>;
        retraining = {
          title: String(
            pickField(r, ["title", "signal_title"]) ?? FALLBACK_RETRAINING.title,
          ),
          copy: String(
            pickField(r, ["copy", "description", "summary", "narrative"]) ??
              FALLBACK_RETRAINING.copy,
          ),
          status_label: String(
            pickField(r, ["status_label", "status", "recommendation"]) ??
              FALLBACK_RETRAINING.status_label,
          ),
          eligible:
            Boolean(pickField(r, ["eligible", "is_eligible"])) ||
            FALLBACK_RETRAINING.eligible,
        };
        retSource = "bigquery";
      }
    } catch (retErr) {
      console.warn(
        "[activation-loop] retraining query failed, using fallback:",
        retErr instanceof Error ? retErr.message : retErr,
      );
    }
  } catch (err) {
    initError = err instanceof Error ? err.message : "Unknown error";
    console.error("[activation-loop] BigQuery init failed:", initError);
  }

  const source: Source =
    opsSource === "bigquery" && retSource === "bigquery"
      ? "bigquery"
      : "fallback";

  return NextResponse.json({
    data: { operations, retraining_signal: retraining },
    source,
    sources: { operations: opsSource, retraining_signal: retSource },
    ...(process.env.NODE_ENV === "development" && initError
      ? { error: initError }
      : {}),
  });
}
