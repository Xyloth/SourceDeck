import { randomBytes, timingSafeEqual } from "node:crypto";

const shippedBrowserOrigins = new Set(["https://sourcedeck.vercel.app"]);
const tokenHeader = "x-sourcedeck-token";

function parseConfiguredOrigins(value) {
  return String(value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isTrustedSidecarOrigin(origin, configuredOrigins = []) {
  if (!origin || origin === "null") return false;
  if (shippedBrowserOrigins.has(origin) || configuredOrigins.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function tokensMatch(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

/**
 * Protects a loopback HTTP sidecar from arbitrary web pages.
 *
 * Browser callers must come from the shipped app or a loopback development/Electron origin, obtain
 * a per-process capability from /session, and send it with every operation. The token is not an
 * account credential; it is a CSRF-style capability that prevents an unrelated page from spending
 * model resources or reading sidecar output. A fixed value is supported for controlled automation.
 */
export function createSidecarSecurity(env = process.env) {
  const configuredOrigins = parseConfiguredOrigins(env.SOURCEDECK_ALLOWED_ORIGINS);
  const sessionToken =
    String(env.SOURCEDECK_SIDECAR_TOKEN ?? "").trim() || randomBytes(32).toString("base64url");

  function originFor(request) {
    return typeof request.headers.origin === "string" ? request.headers.origin : "";
  }

  function responseHeaders(request, extraHeaders = {}) {
    const origin = originFor(request);
    const headers = {
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers":
        "Content-Type, X-SourceDeck-File, X-SourceDeck-Token",
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      Vary: "Origin",
      ...extraHeaders,
    };
    if (isTrustedSidecarOrigin(origin, configuredOrigins)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return headers;
  }

  function writeJson(request, response, status, payload, extraHeaders = {}) {
    response.writeHead(status, responseHeaders(request, extraHeaders));
    response.end(JSON.stringify(payload));
  }

  function requireTrustedOrigin(request, response) {
    const origin = originFor(request);
    if (isTrustedSidecarOrigin(origin, configuredOrigins)) return true;
    writeJson(request, response, 403, {
      ok: false,
      error: "untrusted_origin",
      detail:
        "Open SourceDeck from its shipped origin or configure SOURCEDECK_ALLOWED_ORIGINS.",
    });
    return false;
  }

  function handlePreflight(request, response) {
    if (request.method !== "OPTIONS") return false;
    if (!requireTrustedOrigin(request, response)) return true;
    writeJson(request, response, 204, {});
    return true;
  }

  function issueSession(request, response) {
    if (!requireTrustedOrigin(request, response)) return false;
    writeJson(request, response, 200, {
      ok: true,
      format: "sourcedeck.sidecar-session.v1",
      token: sessionToken,
    });
    return true;
  }

  function authorizeOperation(request, response) {
    if (!requireTrustedOrigin(request, response)) return false;
    const actualToken = request.headers[tokenHeader];
    if (tokensMatch(actualToken, sessionToken)) return true;
    writeJson(request, response, 401, {
      ok: false,
      error: "invalid_sidecar_session",
      detail: "Refresh the SourceDeck sidecar session and retry.",
    });
    return false;
  }

  return {
    authorizeOperation,
    handlePreflight,
    issueSession,
    writeJson,
  };
}
