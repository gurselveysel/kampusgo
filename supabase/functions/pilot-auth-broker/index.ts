// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const VERSION = "accounted-pilot-3";
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_BODY_BYTES = 16_384;
const encoder = new TextEncoder();

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const service = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      vary: "authorization, cookie",
      "x-content-type-options": "nosniff",
    },
  });
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function normalizeUsername(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
  return /^[a-z0-9._-]{3,64}$/.test(normalized) ? normalized : "";
}

function requestIp(req: Request) {
  const raw = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
  return raw.slice(0, 128);
}

async function readBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (!contentType.toLowerCase().startsWith("application/json")) throw new Error("BAD_REQUEST");
  if (declaredLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const text = await req.text();
  if (encoder.encode(text).length > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(text);
}

async function consumeRateLimit(ip: string, username: string) {
  const pairFingerprint = await sha256(`pair:${ip}:${username || "invalid"}`);
  const usernameFingerprint = await sha256(`username:${username || "invalid"}`);
  const ipFingerprint = await sha256(`ip:${ip}`);
  const [pair, usernameWindow, overall] = await Promise.all([
    service.rpc("pilot_broker_consume_attempt", { p_fingerprint_hash: pairFingerprint, p_max_attempts: 6 }),
    service.rpc("pilot_broker_consume_attempt", { p_fingerprint_hash: usernameFingerprint, p_max_attempts: 20 }),
    service.rpc("pilot_broker_consume_attempt", { p_fingerprint_hash: ipFingerprint, p_max_attempts: 60 }),
  ]);
  if (pair.error || usernameWindow.error || overall.error) throw new Error("SERVICE_UNAVAILABLE");
  return { allowed: pair.data === true && usernameWindow.data === true && overall.data === true, pairFingerprint };
}

async function login(req: Request, body: Record<string, unknown>) {
  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  const ip = requestIp(req);
  const { allowed, pairFingerprint } = await consumeRateLimit(ip, username);
  if (!allowed) return json({ ok: false, code: "RATE_LIMITED" }, 429);

  const { data: identities, error: lookupError } = await service.rpc("pilot_broker_login_lookup", {
    p_username: username,
  });
  if (lookupError) throw new Error("SERVICE_UNAVAILABLE");

  const identity = Array.isArray(identities) ? identities[0] : null;
  const email = identity?.auth_email
    ?? `missing-${(await sha256(username || "invalid")).slice(0, 16)}@pilot.invalid`;

  const authClient = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({ email, password });
  if (signInError || !identity || !signIn.session || signIn.user.id !== identity.user_id) {
    return json({ ok: false, code: "INVALID_CREDENTIALS" }, 401);
  }

  const { data: freshIdentity, error: userError } = await authClient.auth.getUser(signIn.session.access_token);
  if (userError || !freshIdentity.user || freshIdentity.user.id !== identity.user_id) {
    return json({ ok: false, code: "INVALID_CREDENTIALS" }, 401);
  }

  const opaqueToken = randomToken();
  const tokenHash = await sha256(opaqueToken);
  const userAgentHash = await sha256(req.headers.get("user-agent") ?? "unknown");
  const ipHash = await sha256(ip);
  const absoluteExpiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const authExpiresAt = new Date((signIn.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString();

  const { error: sessionError } = await service.rpc("pilot_broker_create_session", {
    p_token_hash: tokenHash,
    p_user_id: identity.user_id,
    p_access_token: signIn.session.access_token,
    p_refresh_token: signIn.session.refresh_token,
    p_auth_expires_at: authExpiresAt,
    p_absolute_expires_at: absoluteExpiresAt,
    p_user_agent_hash: userAgentHash,
    p_ip_hash: ipHash,
  });
  if (sessionError) throw new Error("SERVICE_UNAVAILABLE");

  await service.rpc("pilot_broker_clear_attempt", { p_fingerprint_hash: pairFingerprint });
  const userClient = userScopedClient(signIn.session.access_token);
  const { data: context, error: contextError } = await userClient.rpc("pilot_my_context");
  if (contextError) {
    await service.rpc("pilot_broker_revoke_session", { p_token_hash: tokenHash });
    throw new Error("SERVICE_UNAVAILABLE");
  }

  return json({ ok: true, sessionToken: opaqueToken, expiresIn: SESSION_SECONDS, context });
}

function userScopedClient(accessToken: string) {
  return createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function resolveSession(req: Request) {
  const opaqueToken = req.headers.get("x-pilot-session") ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(opaqueToken)) return null;
  const tokenHash = await sha256(opaqueToken);
  const { data: rows, error } = await service.rpc("pilot_broker_get_session", { p_token_hash: tokenHash });
  if (error) throw new Error("SERVICE_UNAVAILABLE");
  let session = Array.isArray(rows) ? rows[0] : null;
  if (!session) return null;

  let accessToken = session.access_token;
  let refreshToken = session.refresh_token;
  if (new Date(session.auth_expires_at).getTime() < Date.now() + 30_000) {
    const refreshClient = createClient(supabaseUrl, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data: refreshed, error: refreshError } = await refreshClient.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshError || !refreshed.session) {
      await service.rpc("pilot_broker_revoke_session", { p_token_hash: tokenHash });
      return null;
    }
    accessToken = refreshed.session.access_token;
    refreshToken = refreshed.session.refresh_token;
    const expiresAt = new Date((refreshed.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString();
    const { error: updateError } = await service.rpc("pilot_broker_refresh_session", {
      p_token_hash: tokenHash,
      p_access_token: accessToken,
      p_refresh_token: refreshToken,
      p_auth_expires_at: expiresAt,
    });
    if (updateError) throw new Error("SERVICE_UNAVAILABLE");
    session = { ...session, access_token: accessToken, refresh_token: refreshToken };
  }

  const userClient = userScopedClient(accessToken);
  const { data: verified, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !verified.user || verified.user.id !== session.user_id) {
    await service.rpc("pilot_broker_revoke_session", { p_token_hash: tokenHash });
    return null;
  }
  return { tokenHash, accessToken, userClient };
}

async function protectedOperation(req: Request, body: Record<string, unknown>) {
  // Revocation must remain possible when Auth identity/refresh services fail.
  // Possession of the opaque value can revoke only its own server session.
  if (body.op === "logout") {
    const opaqueToken = req.headers.get("x-pilot-session") ?? "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(opaqueToken)) return json({ ok: false, code: "SESSION_INVALID" }, 401);
    const tokenHash = await sha256(opaqueToken);
    const { data: rows, error: lookupError } = await service.rpc("pilot_broker_get_session", { p_token_hash: tokenHash });
    if (lookupError) throw new Error("SERVICE_UNAVAILABLE");
    const stored = Array.isArray(rows) ? rows[0] : null;
    if (!stored) return json({ ok: false, code: "SESSION_INVALID" }, 401);
    const { error: revokeError } = await service.rpc("pilot_broker_revoke_session", { p_token_hash: tokenHash });
    if (revokeError) throw new Error("SERVICE_UNAVAILABLE");
    // The application session is now unusable. Also revoke the corresponding
    // Auth refresh session; access JWTs are never exposed to the browser.
    try {
      const { error } = await service.auth.admin.signOut(stored.access_token, "local");
      if (error) console.warn("pilot-auth-broker auth cleanup pending", { version: VERSION });
    } catch {
      console.warn("pilot-auth-broker auth cleanup pending", { version: VERSION });
    }
    return json({ ok: true });
  }
  const session = await resolveSession(req);
  if (!session) return json({ ok: false, code: "SESSION_INVALID" }, 401);
  const operation = body.op;

  if (operation === "context") {
    const { data, error } = await session.userClient.rpc("pilot_my_context");
    if (error) throw new Error("SERVICE_UNAVAILABLE");
    return json({ ok: true, context: data });
  }

  const routeSlug = typeof body.routeSlug === "string" ? body.routeSlug : "";
  const roleKey = typeof body.roleKey === "string" ? body.roleKey : "";
  if (!/^(dpu|gazi)$/.test(routeSlug) || !/^[a-z0-9-]{3,40}$/.test(roleKey)) {
    return json({ ok: false, code: "ACCESS_DENIED" }, 403);
  }

  if (operation === "workspace") {
    const { data, error } = await session.userClient.rpc("pilot_workspace_snapshot", {
      p_route_slug: routeSlug,
      p_role_key: roleKey,
    });
    if (error) return json({ ok: false, code: error.code === "42501" ? "ACCESS_DENIED" : "WORKSPACE_ERROR" }, error.code === "42501" ? 403 : 400);
    return json({ ok: true, workspace: data });
  }

  if (operation === "command") {
    const command = typeof body.command === "string" ? body.command : "";
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const { data, error } = await session.userClient.rpc("pilot_workspace_command", {
      p_route_slug: routeSlug,
      p_role_key: roleKey,
      p_command: command,
      p_payload: payload,
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      const denied = error.code === "42501";
      return json({ ok: false, code: denied ? "ACCESS_DENIED" : "COMMAND_REJECTED" }, denied ? 403 : 400);
    }
    return json({ ok: true, result: data });
  }

  return json({ ok: false, code: "BAD_REQUEST" }, 400);
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") return json({ ok: true, service: "pilot-auth-broker", version: VERSION });
  if (req.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await readBody(req);
    if (body?.op === "login") return await login(req, body);
    return await protectedOperation(req, body);
  } catch (error) {
    const code = error instanceof Error ? error.message : "SERVICE_UNAVAILABLE";
    if (code === "PAYLOAD_TOO_LARGE") return json({ ok: false, code }, 413);
    if (code === "BAD_REQUEST" || error instanceof SyntaxError) return json({ ok: false, code: "BAD_REQUEST" }, 400);
    console.error("pilot-auth-broker request failed", { code, version: VERSION });
    return json({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503);
  }
});
