-- Covers the composite descriptor translation foreign key used by the
-- bilingual qualification catalog. This is a read-only pilot performance
-- index; it grants no access and changes no workflow state.
create index if not exists qualification_level_translations_descriptor_framework_level_idx
  on public.qualification_level_descriptor_translations (descriptor_id, framework_id, level);

