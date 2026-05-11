/**
 * TimesFM table-reference helper.
 *
 * Reads BIGQUERY_PROJECT_ID and BIGQUERY_DATASET_ID from env at use
 * time, falling back to the canonical demo project/dataset if
 * unset. Lets the TimesFM routes point at a different project or
 * dataset (staging vs prod) without code changes.
 *
 * Note: BigQuery credentials (service account email + private key)
 * still come from getBigQuery() in lib/bigquery.ts via
 * GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY. The two env-var sets are
 * intentionally separate so the BigQuery client identity can stay
 * fixed while the table location moves.
 */

export function timesfmProject(): string {
  return process.env.BIGQUERY_PROJECT_ID || "tombras-demo";
}

export function timesfmDataset(): string {
  return process.env.BIGQUERY_DATASET_ID || "timesfm_staging";
}

/** Returns a backtick-wrapped fully-qualified table reference. */
export function timesfmTable(table: string): string {
  return `\`${timesfmProject()}.${timesfmDataset()}.${table}\``;
}
