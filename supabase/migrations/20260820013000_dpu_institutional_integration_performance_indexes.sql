-- Cover the remaining foreign-key lookup in the controlled DPÜ integration catalog.
-- This changes no data, permissions, RLS policy, or integration behavior.

create index if not exists pilot_integration_audit_mapping_idx
  on public.pilot_integration_audit_events (mapping_id);
