-- Yeni çok-kurum pilotundaki bütün FK silme/güncelleme kontrolleri için kapsayıcı indeksler.
create index pilot_case_actions_actor_org_idx on public.pilot_account_case_actions (actor_user_id, organization_id);
create index pilot_cases_catalog_org_idx on public.pilot_account_cases (organization_id, catalog_item_id) where catalog_item_id is not null;
create index pilot_credentials_holder_org_idx on public.pilot_account_credentials (holder_user_id, organization_id);
create index pilot_admin_checks_actor_org_idx on public.pilot_admin_access_checks (actor_user_id, organization_id);
create index pilot_admin_checks_org_idx on public.pilot_admin_access_checks (organization_id);
create index pilot_receipts_actor_org_idx on public.pilot_command_receipts (actor_user_id, organization_id);
create index pilot_finance_actor_org_idx on public.pilot_finance_dry_runs (actor_user_id, organization_id);
create index pilot_integration_actor_org_idx on public.pilot_integration_dry_runs (actor_user_id, organization_id);
create index pilot_integration_org_idx on public.pilot_integration_dry_runs (organization_id);
