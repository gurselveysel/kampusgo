import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const legacyHashes = {
  "index.html": "d5ccc00011da49766c0892f5d1dba5ba097574988edfc91339ef67f6352b1647",
  "styles.css": "73fa746129a380d28d888df45eea934cb3a19c57928b0588d883ecbc0776cc99",
  "src/app.js": "97a0f222b640630476fd51812083be5742b4052701b90417feba867f4d15de96",
  "src/data.js": "0dfd18943ce2f317b11a57b9b6e3198d81f5c20dba79f76f15a5a37c9ae77193",
  "assets/brand/go-icon-web.png": "2df1534ebfcd08cd31e4f73bc571b189eac6c973e1f0ff9ace41f6f50458c63a",
  "assets/brand/kdpu-logo-web.png": "031ffb418642ff2322dcbf57727a2f4665f74973f447eea860aa9e723bf56e4b",
};
for (const [path, expected] of Object.entries(legacyHashes)) {
  assert.equal(digest(path), expected, `${path} legacy DPÜ hash'i değişti`);
}

assert.equal(
  digest("assets/brand/gazi/gazi-universitesi-logo.png"),
  "bc56cb3a2b3d00e79f317cf5854b533f4de2850c16638d7f9dc808d55c325947",
  "Gazi resmî logo kaynağı değişti",
);

const migration = read("supabase/migrations/20260907010000_multi_university_accounted_pilot.sql");
const seed = read("supabase/migrations/20260907011000_gazi_accounted_pilot_seed.sql");
const edge = read("supabase/functions/pilot-auth-broker/index.ts");
const actions = read("app/actions.ts");
const broker = read("lib/pilot/broker.ts");
const workspace = read("app/u/[kurum]/WorkspaceCommon.tsx");
const rolePanel = read("app/u/[kurum]/RoleActionPanel.tsx");
const buildPublic = read("scripts/build-public.mjs");
const proxy = read("proxy.ts");

assert.match(migration, /create table public\.organization_memberships/);
assert.match(migration, /unique \(user_id, organization_id\)/);
assert.match(migration, /foreign key \(owner_user_id, organization_id\)/);
assert.match(migration, /with \(security_invoker = true\)/);
assert.ok((migration.match(/force row level security/g) ?? []).length >= 14, "Yeni tabloların FORCE RLS koruması eksik");
assert.doesNotMatch(migration, /create or replace function private\.has_role\s*\(/i, "Legacy private.has_role değiştirilmemeli");
assert.doesNotMatch(migration, /grant\s+update\s+on\s+(table\s+)?public\.profiles/i, "profiles UPDATE grant'i genişletildi");
assert.doesNotMatch(migration, /grant\s+(insert|update|delete).*\b(anon|authenticated)\b/i, "Yeni tablolara doğrudan yazma grant'i verilmemeli");
assert.match(migration, /pilot_workspace_command/);
assert.match(migration, /PILOT_REASONED_DECISION_REQUIRED/);
assert.match(migration, /real_transaction boolean not null default false check \(not real_transaction\)/);
assert.match(migration, /external_wallet_published boolean not null default false check \(not external_wallet_published\)/);

assert.match(edge, /signInWithPassword/);
assert.match(edge, /auth\.getUser\(/);
assert.doesNotMatch(edge, /auth\.getSession\(/);
assert.doesNotMatch(edge, /user_metadata|app_metadata/);
assert.match(edge, /pilot_broker_consume_attempt/);
assert.match(edge, /usernameFingerprint/);
assert.match(edge, /x-pilot-session/);
assert.doesNotMatch(edge, /console\.log/);
assert.doesNotMatch(edge, /NEXT_PUBLIC|sb_secret_[A-Za-z0-9_-]+|eyJhbGciOi/i);
assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);

assert.match(broker, /__Host-kampusgo-session/);
assert.match(broker, /httpOnly:\s*true/);
assert.match(broker, /sameSite:\s*"lax"/);
assert.match(broker, /cache:\s*"no-store"/);
assert.doesNotMatch(broker + actions, /localStorage|sessionStorage/);
assert.match(actions, /ORIGIN_MISMATCH/);
assert.match(actions, /const ROUTES = new Set\(\["dpu", "gazi"\]\)/);

for (const role of ["ogrenci", "ic-egitici", "dis-egitici", "koordinator", "komisyon", "ogrenci-isleri", "bilgi-islem", "mali-isler", "sistem-yoneticisi"]) {
  assert.ok((rolePanel + actions).includes(role), `${role} hesaplı pilot akışında yok`);
}
for (const command of ["create_student_application", "create_program_proposal", "coordinator_forward", "commission_decide", "student_affairs_issue", "finance_dry_run", "integration_dry_run", "admin_access_check"]) {
  assert.ok(rolePanel.includes(command), `${command} rol işlemi arayüzde yok`);
  assert.ok(migration.includes(`p_command = '${command}'`), `${command} sunucu komutunda yok`);
}

const gaziSection = workspace.slice(workspace.indexOf("export function GaziWorkspace"), workspace.indexOf("export function DpuWorkspace"));
assert.match(gaziSection, /Gazi Üniversitesi/);
assert.match(gaziSection, /GAZİSEM/);
assert.doesNotMatch(gaziSection, /DPÜSEM|Kütahya|Dumlupınar/);
assert.match(seed, /institutional_confirmation_required/);
assert.match(seed, /SENTETİK/);
assert.match(seed, /#113971/);
assert.match(seed, /#BBE3FA/);
assert.match(buildPublic, /assets\/brand\/gazi\/gazi-universitesi-logo\.png/);

assert.match(proxy, /nonce-/);
assert.match(proxy, /strict-dynamic/);
assert.match(proxy, /private, no-store/);
assert.match(proxy, /style-src-attr 'unsafe-inline'/);
assert.doesNotMatch(proxy, /script-src[^\n]*unsafe-inline/);

console.log("Hesaplı çok-kurum pilot sözleşmesi başarılı: legacy hash, auth, RLS, rol, Gazi ve CSP sınırları doğrulandı.");
