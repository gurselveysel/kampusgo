-- Correct source-specific provenance for the controlled DPÜ integration catalog.
-- This migration only updates public metadata. It enables no endpoint, secret,
-- live request, real-data transfer, write permission, or production operation.

begin;

do $$
declare
  updated_rows integer;
begin
  update public.institutional_system_registry as registry
  set
    public_url = provenance.public_url,
    source_url = provenance.source_url,
    source_basis = provenance.source_basis,
    verification_status = provenance.verification_status
  from (values
    ('dpu-portal', 'https://portal.dpu.edu.tr/tr', 'https://haber.dpu.edu.tr/tr/haber_oku/570f85b0a97f8/turkiyenin-en-buyuk-akademik-portali-dpuportal-yayinda', 'official_university_news', 'official_page_verified_owner_pending'),
    ('dpu-mezun', 'https://mezun.dpu.edu.tr/', 'https://mezun.dpu.edu.tr/', 'official_application_page', 'official_directory_verified'),
    ('dpu-ebap', 'https://ebap.dpu.edu.tr/', 'https://ebap.dpu.edu.tr/', 'official_application_page', 'official_directory_verified'),
    ('dpu-ekbys', 'https://etikkurul.dpu.edu.tr/', 'https://etikkurul.dpu.edu.tr/', 'official_application_page', 'official_directory_verified'),
    ('dpu-bkys', 'https://bkys.dpu.edu.tr/', 'https://bkys.dpu.edu.tr/', 'official_application_page', 'official_directory_verified'),
    ('dpu-extra-course', 'https://sgtest.dpu.edu.tr/', 'https://sgtest.dpu.edu.tr/', 'official_application_link', 'official_it_directory_verified'),
    ('dpu-mobile', 'https://www.dpu.edu.tr/index/duyuru/1159/e-yoklama-icin-dpumobil-baglantisi', 'https://www.dpu.edu.tr/index/duyuru/1159/e-yoklama-icin-dpumobil-baglantisi', 'official_university_announcement', 'official_page_verified'),
    ('dpu-puantaj', 'https://performans.dpu.edu.tr/', 'https://performans.dpu.edu.tr/', 'official_application_link', 'official_directory_verified_endpoint_pending')
  ) as provenance(id, public_url, source_url, source_basis, verification_status)
  where registry.id = provenance.id
    and registry.catalog_version = '2026-08-20.2'
    and registry.seed_batch = 'dpu-integration-20260820-01'
    and registry.institutional_validation_required
    and registry.public_metadata_only
    and registry.is_public_reference
    and not registry.real_data_enabled
    and not registry.real_data_sent
    and not registry.secrets_stored
    and not registry.production_allowed;

  get diagnostics updated_rows = row_count;
  if updated_rows <> 8 then
    raise exception 'Expected 8 controlled provenance rows, updated %', updated_rows;
  end if;
end
$$;

commit;
