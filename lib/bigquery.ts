/**
 * Server-only BigQuery client.
 *
 * Reads service-account credentials from env vars at first use (NOT at
 * import time) so missing env vars don't crash builds or break routes
 * that simply import this module.
 *
 * Required env vars:
 *   GOOGLE_CLOUD_PROJECT  e.g. "tombras-demo"
 *   GOOGLE_CLIENT_EMAIL   service account email
 *   GOOGLE_PRIVATE_KEY    PEM-encoded RSA key. Tolerates the most
 *                         common formatting accidents — see
 *                         normalizePrivateKey() below.
 *
 * NEVER import this file from a client component. The BigQuery SDK
 * pulls in Node-only deps and would explode the client bundle.
 */
import { BigQuery } from "@google-cloud/bigquery";

let _client: BigQuery | null = null;
let _diagnosticLogged = false;

export class BigQueryConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BigQueryConfigError";
  }
}

const PEM_HEADER = "-----BEGIN PRIVATE KEY-----";
const PEM_FOOTER = "-----END PRIVATE KEY-----";

/**
 * Normalize a private key WITHOUT validating it. Used by both the
 * client init path and the credential diagnostic so they share exactly
 * the same transformations.
 *
 * Handles:
 *   - leading/trailing whitespace, BOM
 *   - wrapping double or single quotes (e.g. when someone literally
 *     pasted the JSON value including its surrounding quotes)
 *   - literal "\n" two-char escape sequences (Vercel and most secret
 *     stores serialize newlines this way)
 *   - CRLF line endings (common when editing .env on Windows)
 */
function normalizeWithoutValidation(raw: string): string {
  let key = raw.trim();

  // Strip wrapping quotes (double or single) if both ends match.
  if (key.length >= 2) {
    const first = key.charAt(0);
    const last = key.charAt(key.length - 1);
    if (
      (first === '"' && last === '"') ||
      (first === "'" && last === "'")
    ) {
      key = key.slice(1, -1).trim();
    }
  }

  // Literal "\n" → real newline. Idempotent on values that already
  // contain real newlines.
  key = key.replace(/\\n/g, "\n");

  // CRLF / lone CR → LF. PEM parsers want LF.
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return key.trim();
}

/** Normalize and validate. Throws BigQueryConfigError on bad shape. */
function normalizePrivateKey(raw: string): string {
  const key = normalizeWithoutValidation(raw);
  if (!key.startsWith(PEM_HEADER) || !key.endsWith(PEM_FOOTER)) {
    throw new BigQueryConfigError(
      "Private key format invalid: expected BEGIN/END PRIVATE KEY wrapper",
    );
  }
  // Some PEM parsers want a trailing newline.
  return key + "\n";
}

export type CredentialDiagnostic = {
  hasProject: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
  privateKeyLength: number;
  privateKeyStartsCorrectly: boolean;
  privateKeyEndsCorrectly: boolean;
};

/**
 * Inspect the current credential env vars and return safe metadata.
 * Never returns or logs the actual private key value.
 */
export function diagnoseCredentials(): CredentialDiagnostic {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const normalized = rawKey ? normalizeWithoutValidation(rawKey) : "";
  return {
    hasProject: Boolean(process.env.GOOGLE_CLOUD_PROJECT),
    hasClientEmail: Boolean(process.env.GOOGLE_CLIENT_EMAIL),
    hasPrivateKey: Boolean(rawKey),
    privateKeyLength: normalized.length,
    privateKeyStartsCorrectly: normalized.startsWith(PEM_HEADER),
    privateKeyEndsCorrectly: normalized.endsWith(PEM_FOOTER),
  };
}

export function getBigQuery(): BigQuery {
  if (_client) return _client;

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Log safe metadata once per process. Never logs the key value.
  if (!_diagnosticLogged) {
    _diagnosticLogged = true;
    console.log("[bigquery] credential diagnostic:", diagnoseCredentials());
  }

  const missing: string[] = [];
  if (!projectId) missing.push("GOOGLE_CLOUD_PROJECT");
  if (!clientEmail) missing.push("GOOGLE_CLIENT_EMAIL");
  if (!rawPrivateKey) missing.push("GOOGLE_PRIVATE_KEY");
  if (missing.length) {
    throw new BigQueryConfigError(
      `Missing required env vars: ${missing.join(", ")}. ` +
        `Set them in .env.local for dev or in Vercel project settings for prod.`,
    );
  }

  const privateKey = normalizePrivateKey(rawPrivateKey!);

  _client = new BigQuery({
    projectId: projectId!,
    credentials: {
      client_email: clientEmail!,
      private_key: privateKey,
    },
  });

  return _client;
}
