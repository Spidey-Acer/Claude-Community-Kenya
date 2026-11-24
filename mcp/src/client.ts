/**
 * HTTP client and result helpers for cck-admin-mcp.
 *
 * Every admin call goes through `apiRequest`, which adds the service-token
 * bearer header and never throws: network failures and non-2xx responses come
 * back as `{ ok: false }` with the status and the server's `error`/`details`.
 * With a bearer header the site skips its CSRF header check, so no CSRF token
 * is sent here (only resource_submit uses the CSRF flow, see tools/resources.ts).
 *
 * NOTE ON THE DOMAIN: the default base URL is https://www.claudekenya.org. The
 * apex domain answers with a 307 redirect to www, and a redirected POST can
 * lose its body (or its Authorization header) on some HTTP clients, so every
 * request targets www directly.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_BASE_URL = "https://www.claudekenya.org";
const REQUEST_TIMEOUT_MS = 60_000;

/** Runtime config, read once at startup. */
export interface CckConfig {
  baseUrl: string;
  token: string;
}

let config: CckConfig | null = null;

/** Read env and store config. Throws if CCK_SERVICE_TOKEN is missing (startup only). */
export function initConfig(env: NodeJS.ProcessEnv = process.env): CckConfig {
  const token = env.CCK_SERVICE_TOKEN?.trim();
  if (!token) {
    throw new Error("CCK_SERVICE_TOKEN is required. Set it in the MCP server env.");
  }
  const baseUrl = (env.CCK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  config = { baseUrl, token };
  return config;
}

/** Current config; throws if initConfig has not run. */
export function getConfig(): CckConfig {
  if (!config) throw new Error("Config not initialised");
  return config;
}

/** Outcome of an API call. `data` is the parsed JSON body (or raw text). */
export interface ApiResult {
  ok: boolean;
  /** HTTP status, or 0 when the request never got a response. */
  status: number;
  data: unknown;
  /** Human-readable failure text (status + server error/details), when !ok. */
  errorText?: string;
}

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  /** JSON body (sets Content-Type). */
  json?: unknown;
  /** Multipart body (Content-Type set by fetch). */
  form?: FormData;
  /** Extra headers, e.g. x-csrf-token. */
  headers?: Record<string, string>;
}

/** Replace any occurrence of the token in a string so it can never be printed. */
export function redact(text: string): string {
  const token = config?.token;
  return token ? text.split(token).join("[redacted]") : text;
}

/** Build the failure text from a non-2xx response body. */
function describeFailure(status: number, data: unknown): string {
  let text = `HTTP ${status}`;
  if (data && typeof data === "object") {
    const body = data as { error?: unknown; message?: unknown; details?: unknown };
    const message = body.error ?? body.message;
    if (message) text += `: ${String(message)}`;
    if (body.details !== undefined) text += ` | details: ${JSON.stringify(body.details)}`;
  } else if (typeof data === "string" && data) {
    text += `: ${data.slice(0, 300)}`;
  }
  return redact(text);
}

/** Call the site API with the bearer token. Never throws. */
export async function apiRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult> {
  const { baseUrl, token } = getConfig();
  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...options.headers,
  };
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const raw = await res.text();
    let data: unknown = raw;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Non-JSON body (HTML error page, redirect): keep the raw text.
    }
    if (res.status >= 300 && res.status < 400) {
      return {
        ok: false,
        status: res.status,
        data,
        errorText: `HTTP ${res.status} redirect to ${res.headers.get("location") ?? "?"}. Use the www host in CCK_BASE_URL.`,
      };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, data, errorText: describeFailure(res.status, data) };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, data: null, errorText: redact(`Network error: ${reason}`) };
  }
}

/** Pull `data` out of the site's `{ success, data }` envelope. */
export function unwrap(result: ApiResult): unknown {
  const body = result.data;
  return body && typeof body === "object" && "data" in body ? (body as { data: unknown }).data : body;
}

/** Success result: one-line summary first, then the JSON payload. */
export function ok(summary: string, payload: unknown): CallToolResult {
  const json = payload === undefined ? "" : "\n" + JSON.stringify(payload, null, 2);
  return { content: [{ type: "text", text: redact(summary + json) }] };
}

/** Error result (isError) with a plain message. */
export function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: redact(`Error: ${message}`) }], isError: true };
}

/** Error result for a failed API call. */
export function failFromApi(action: string, result: ApiResult): CallToolResult {
  return fail(`${action} failed. ${result.errorText ?? `HTTP ${result.status}`}`);
}

/** Wrap a handler so an unexpected throw becomes an isError result. */
export function guard<Args>(
  name: string,
  handler: (args: Args) => Promise<CallToolResult>,
): (args: Args) => Promise<CallToolResult> {
  return async (args) => {
    try {
      return await handler(args);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return fail(`${name} crashed: ${reason}`);
    }
  };
}
