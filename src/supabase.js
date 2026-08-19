// Supabase publishable keys identify a project but are not secrets. Access remains
// constrained by explicit grants and RLS. No service-role/secret key is present.
const SUPABASE_URL = "https://xpjkrwzgimdxsasqszfi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v_AI0cizKIbiJqeqWYHDSQ__g2fSY4p";

const headers = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  Accept: "application/json"
};

async function readTable(table, query = "select=*") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4200);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers,
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Supabase ${table}: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadPilotSnapshot() {
  try {
    const [programs, applications, credentials, integrations] = await Promise.all([
      readTable("pilot_programs", "select=*&order=code.asc"),
      readTable("pilot_applications", "select=*&order=submitted_at.desc"),
      readTable("pilot_credentials", "select=*&order=issued_at.desc"),
      readTable("pilot_integrations", "select=*&order=name.asc")
    ]);
    return { ok: true, mode: "Supabase salt-okunur pilot görünümü", programs, applications, credentials, integrations };
  } catch (error) {
    return { ok: false, mode: "Yerel pilot veri katmanı", error: error instanceof Error ? error.message : "Bilinmeyen bağlantı hatası" };
  }
}

export function getSupabasePublicConfig() {
  return { projectRef: "xpjkrwzgimdxsasqszfi", mode: "Salt-okunur sentetik pilot veri" };
}
