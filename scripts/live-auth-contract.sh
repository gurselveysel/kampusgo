#!/usr/bin/env bash
set -euo pipefail
trap 'echo "live-auth-contract: FAIL at line $LINENO" >&2' ERR

credentials_file="${PILOT_CREDENTIALS_FILE:?PILOT_CREDENTIALS_FILE gerekli}"
edge_url="${PILOT_EDGE_URL:-https://xpjkrwzgimdxsasqszfi.supabase.co/functions/v1/pilot-auth-broker}"
test_dir="$(mktemp -d /tmp/kampusgo-auth-contract.XXXXXX)"
trap 'find "$test_dir" -type f -delete; rmdir "$test_dir"' EXIT

password_for() { jq -er --arg username "$1" '.credentials[] | select(.username == $username) | .password' "$credentials_file"; }
post() {
  local output="$1"; shift
  curl --connect-timeout 10 --max-time 30 -sS -o "$output" -w '%{http_code}' -X POST -H 'content-type: application/json' "$@" "$edge_url"
}
login() {
  local username="$1" output="$2" password code
  password="$(password_for "$username")"
  code="$(post "$output" --data "$(jq -nc --arg username "$username" --arg password "$password" '{op:"login",username:$username,password:$password}')")"
  test "$code" = "200"
  jq -e '.ok == true and (.sessionToken | length == 43)' "$output" >/dev/null
}

existing_password="$(password_for gazi.ogrenci)"
bad_existing_code="$(post "$test_dir/bad-existing.json" --data "$(jq -nc --arg password "yanlis-$existing_password" '{op:"login",username:"gazi.ogrenci",password:$password}')")"
bad_missing_code="$(post "$test_dir/bad-missing.json" --data '{"op":"login","username":"olmayan.hesap","password":"Yanlis-Parola-123!"}')"
test "$bad_existing_code" = "401" && test "$bad_missing_code" = "401"
test "$(jq -c . "$test_dir/bad-existing.json")" = "$(jq -c . "$test_dir/bad-missing.json")"

login gazi.ogrenci "$test_dir/student-login.json"
student_token="$(jq -r .sessionToken "$test_dir/student-login.json")"
jq -e '.context.accessState == "active" and (.context.memberships | length) == 1 and .context.memberships[0].routeSlug == "gazi" and .context.memberships[0].roles[0].key == "ogrenci"' "$test_dir/student-login.json" >/dev/null

student_workspace_code="$(post "$test_dir/student-workspace.json" -H "x-pilot-session: $student_token" --data '{"op":"workspace","routeSlug":"gazi","roleKey":"ogrenci"}')"
test "$student_workspace_code" = "200"
jq -e '.workspace.catalog | length >= 3' "$test_dir/student-workspace.json" >/dev/null
catalog_id="$(jq -r '.workspace.catalog[0].id' "$test_dir/student-workspace.json")"
idempotency_key="$(node -e 'console.log(crypto.randomUUID())')"
student_command_code="$(post "$test_dir/student-command.json" -H "x-pilot-session: $student_token" --data "$(jq -nc --arg catalog "$catalog_id" --arg idem "$idempotency_key" '{op:"command",routeSlug:"gazi",roleKey:"ogrenci",command:"create_student_application",idempotencyKey:$idem,payload:{catalogItemId:$catalog,summary:"Canlı sözleşme testi için SENTETİK başvuru."}}')")"
test "$student_command_code" = "200"
jq -e '.result.ok == true and .result.status == "submitted" and .result.simulation == true' "$test_dir/student-command.json" >/dev/null

cross_org_code="$(post "$test_dir/cross-org.json" -H "x-pilot-session: $student_token" --data '{"op":"workspace","routeSlug":"dpu","roleKey":"ogrenci"}')"
wrong_role_code="$(post "$test_dir/wrong-role.json" -H "x-pilot-session: $student_token" --data '{"op":"workspace","routeSlug":"gazi","roleKey":"mali-isler"}')"
test "$cross_org_code" = "403" && test "$wrong_role_code" = "403"

logout_code="$(post "$test_dir/logout.json" -H "x-pilot-session: $student_token" --data '{"op":"logout"}')"
revoked_code="$(post "$test_dir/revoked.json" -H "x-pilot-session: $student_token" --data '{"op":"context"}')"
test "$logout_code" = "200" && test "$revoked_code" = "401"

login cift.kurum "$test_dir/multi.json"
jq -e '.context.accessState == "active" and (.context.memberships | length) == 2 and ([.context.memberships[].routeSlug] | sort) == ["dpu","gazi"]' "$test_dir/multi.json" >/dev/null
login pilot.pasif "$test_dir/inactive.json"
jq -e '.context.accessState == "inactive" and (.context.memberships | length) == 0' "$test_dir/inactive.json" >/dev/null
login pilot.atamasiz "$test_dir/unassigned.json"
jq -e '.context.accessState == "unassigned" and (.context.memberships | length) == 0' "$test_dir/unassigned.json" >/dev/null

if test "${SKIP_RATE_LIMIT:-0}" != "1"; then
  rate_user="limit.test.$RANDOM"
  last_code=""
  for _ in 1 2 3 4 5 6 7; do
    last_code="$(post "$test_dir/rate.json" --data "$(jq -nc --arg username "$rate_user" '{op:"login",username:$username,password:"Yanlis-Parola-123!"}')")"
  done
  test "$last_code" = "429"
  jq -e '.code == "RATE_LIMITED"' "$test_dir/rate.json" >/dev/null
fi

if test "${SKIP_RATE_LIMIT:-0}" = "1"; then
  echo "live-auth-contract: PASS (generic login error, Gazi own flow, cross-org/role deny, logout revoke, multi/inactive/unassigned; HTTP rate loop skipped)"
else
  echo "live-auth-contract: PASS (generic login error, Gazi own flow, cross-org/role deny, logout revoke, multi/inactive/unassigned, distributed rate limit)"
fi
