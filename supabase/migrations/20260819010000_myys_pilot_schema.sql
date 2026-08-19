-- KDPÜ MYYS kontrollü pilot şeması
-- Yalnız sentetik, salt-okunur katalog ve başlangıç görünümü.
-- Gerçek kimlik, biyometri, ödeme, entegrasyon sırrı veya kurumsal veri içermez.

create table public.pilot_programs (
  id text primary key,
  code text not null unique,
  title text not null,
  unit_name text not null,
  instructor_name text not null,
  ects numeric(4,1) not null check (ects > 0 and ects <= 30),
  workload_hours integer not null check (workload_hours > 0),
  proposed_tyc_level smallint not null check (proposed_tyc_level between 5 and 8),
  delivery_mode text not null check (delivery_mode in ('Yüz yüze', 'Uzaktan', 'Karma')),
  remote_rate numeric(5,2) not null check (remote_rate between 0 and 100),
  pilot_status text not null check (pilot_status in ('review', 'commission', 'active', 'archived')),
  summary text not null,
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

create table public.pilot_applications (
  id text primary key,
  code text not null unique,
  application_kind text not null check (application_kind in ('internal', 'external')),
  title text not null,
  applicant_label text not null,
  pilot_status text not null check (pilot_status in ('draft', 'review', 'commission', 'revision', 'approved', 'rejected')),
  submitted_at timestamptz not null,
  target_at timestamptz not null,
  elapsed_days integer not null check (elapsed_days between 0 and 365),
  similarity_percent numeric(5,2) not null check (similarity_percent between 0 and 100),
  proposed_tyc_match numeric(5,2) not null check (proposed_tyc_match between 0 and 100),
  requested_ects numeric(4,1) not null check (requested_ects > 0),
  remote_rate numeric(5,2) not null check (remote_rate between 0 and 100),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  missing_evidence_count integer not null default 0 check (missing_evidence_count >= 0),
  pilot_note text not null,
  ai_is_decision boolean not null default false check (not ai_is_decision),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

create table public.pilot_credentials (
  id text primary key,
  code text not null unique,
  title text not null,
  owner_label text not null,
  issuer_label text not null,
  ects numeric(4,1) not null check (ects > 0),
  proposed_tyc_level smallint not null check (proposed_tyc_level between 5 and 8),
  issued_at date not null,
  pilot_status text not null check (pilot_status in ('valid', 'revoked', 'expired')),
  signing_mode text not null default 'simulation' check (signing_mode = 'simulation'),
  external_wallet_published boolean not null default false check (not external_wallet_published),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

create table public.pilot_integrations (
  id text primary key,
  name text not null unique,
  owner_label text not null,
  pilot_status text not null check (pilot_status in ('disconnected', 'simulated')),
  approval_stage smallint not null check (approval_stage between 1 and 5),
  last_test_label text not null,
  real_data_enabled boolean not null default false check (not real_data_enabled),
  real_data_sent boolean not null default false check (not real_data_sent),
  secret_reference text null check (secret_reference is null),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

create table public.pilot_rule_settings (
  id text primary key,
  setting_key text not null unique,
  numeric_value numeric(10,3) not null,
  unit_label text not null,
  source_note text not null,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

create table public.pilot_audit_events (
  id text primary key,
  entity_id text not null,
  occurred_at timestamptz not null,
  actor_label text not null,
  actor_role text not null,
  action_label text not null,
  from_status text not null,
  to_status text not null,
  reason text not null,
  qualified_5651_log boolean not null default false check (not qualified_5651_log),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

comment on table public.pilot_programs is 'Sentetik ve salt-okunur MYYS kontrollü pilot program başlangıç verisi.';
comment on table public.pilot_applications is 'Sentetik başvuru örnekleri; AI çıktıları karar değildir.';
comment on table public.pilot_credentials is 'Yalnız Preview içinde kullanılan simülasyon yeterlilikleri.';
comment on table public.pilot_integrations is 'Gerçek veri ve secret içermeyen bağlı-değil/dry-run kartları.';
comment on table public.pilot_rule_settings is 'Kurumsal doğrulama gerektiren yapılandırılabilir pilot değerleri.';
comment on table public.pilot_audit_events is 'Nitelikli 5651 log iddiası taşımayan sentetik denetim olayları.';

alter table public.pilot_programs enable row level security;
alter table public.pilot_applications enable row level security;
alter table public.pilot_credentials enable row level security;
alter table public.pilot_integrations enable row level security;
alter table public.pilot_rule_settings enable row level security;
alter table public.pilot_audit_events enable row level security;

alter table public.pilot_programs force row level security;
alter table public.pilot_applications force row level security;
alter table public.pilot_credentials force row level security;
alter table public.pilot_integrations force row level security;
alter table public.pilot_rule_settings force row level security;
alter table public.pilot_audit_events force row level security;

revoke all on table public.pilot_programs from public, anon, authenticated;
revoke all on table public.pilot_applications from public, anon, authenticated;
revoke all on table public.pilot_credentials from public, anon, authenticated;
revoke all on table public.pilot_integrations from public, anon, authenticated;
revoke all on table public.pilot_rule_settings from public, anon, authenticated;
revoke all on table public.pilot_audit_events from public, anon, authenticated;

grant select on table public.pilot_programs to anon, authenticated;
grant select on table public.pilot_applications to anon, authenticated;
grant select on table public.pilot_credentials to anon, authenticated;
grant select on table public.pilot_integrations to anon, authenticated;
grant select on table public.pilot_rule_settings to anon, authenticated;
grant select on table public.pilot_audit_events to anon, authenticated;

create policy pilot_programs_synthetic_read
on public.pilot_programs for select to anon, authenticated
using (is_synthetic = true);

create policy pilot_applications_synthetic_read
on public.pilot_applications for select to anon, authenticated
using (is_synthetic = true and ai_is_decision = false);

create policy pilot_credentials_synthetic_read
on public.pilot_credentials for select to anon, authenticated
using (is_synthetic = true and signing_mode = 'simulation' and external_wallet_published = false);

create policy pilot_integrations_synthetic_read
on public.pilot_integrations for select to anon, authenticated
using (is_synthetic = true and real_data_enabled = false and real_data_sent = false and secret_reference is null);

create policy pilot_rule_settings_synthetic_read
on public.pilot_rule_settings for select to anon, authenticated
using (is_synthetic = true and institutional_validation_required = true);

create policy pilot_audit_events_synthetic_read
on public.pilot_audit_events for select to anon, authenticated
using (is_synthetic = true and qualified_5651_log = false);

insert into public.pilot_programs
  (id, code, title, unit_name, instructor_name, ects, workload_hours, proposed_tyc_level, delivery_mode, remote_rate, pilot_status, summary, fee_amount)
values
  ('program-data-literacy', 'MY-PRG-2026-014', 'Dijital Üretimde Veri Okuryazarlığı', 'Mühendislik Fakültesi', 'Dr. Öğr. Üyesi Ekin Demir', 3, 75, 6, 'Karma', 40, 'commission', 'Veriyi güvenilir biçimde okuma, yorumlama ve görselleştirmeye yönelik sentetik pilot program.', 0),
  ('program-project-learning', 'MY-PRG-2026-008', 'Proje Temelli Öğrenme Tasarımı', 'Eğitim Fakültesi', 'Dr. Öğr. Üyesi Aylin Eren', 2, 50, 6, 'Yüz yüze', 0, 'active', 'Öğrenme çıktısı, rubrik ve kanıt zincirini birlikte tasarlayan sentetik pilot program.', 1200),
  ('program-green-skills', 'MY-PRG-2026-011', 'Yeşil Dönüşüm İçin Temel Yetkinlikler', 'Lisansüstü Eğitim Enstitüsü', 'Prof. Dr. Barış Acar', 2, 50, 7, 'Karma', 35, 'active', 'Sürdürülebilirlik problemlerini kanıtlarla değerlendirmeye yönelik sentetik pilot program.', 1750);

insert into public.pilot_applications
  (id, code, application_kind, title, applicant_label, pilot_status, submitted_at, target_at, elapsed_days, similarity_percent, proposed_tyc_match, requested_ects, remote_rate, evidence_count, missing_evidence_count, pilot_note)
values
  ('APP-014', 'MY-PRG-2026-014', 'internal', 'Dijital Üretimde Veri Okuryazarlığı', 'Dr. Öğr. Üyesi Ekin Demir', 'commission', '2026-08-07 09:30:00+03', '2026-09-06 09:30:00+03', 12, 36, 88, 3, 40, 8, 0, 'Bologna karşılaştırması ve ölçme rubriği komisyon pilot gündemine hazır.'),
  ('APP-042', 'MY-BSV-2026-0042', 'external', 'Veri Görselleştirme Temelleri', 'Derya Örnek', 'review', '2026-08-12 12:10:00+03', '2026-09-11 12:10:00+03', 7, 58, 72, 2, 100, 4, 1, 'Sağlayıcı doğrulama kanıtı bekleniyor; benzerlik işareti karar değildir.'),
  ('APP-031', 'MY-PRG-2026-009', 'internal', 'Toplumsal Yenilik Atölyesi', 'Dr. Öğr. Üyesi Zeynep Ata', 'revision', '2026-08-02 08:00:00+03', '2026-09-01 08:00:00+03', 17, 44, 80, 2, 20, 5, 2, 'Rubrik ve öğrenme çıktısı eşlemesi için revizyon bekleniyor.');

insert into public.pilot_credentials
  (id, code, title, owner_label, issuer_label, ects, proposed_tyc_level, issued_at, pilot_status)
values
  ('credential-0007', 'MY-BEL-2026-0007', 'Proje Temelli Öğrenme Tasarımı', 'Derya Örnek', 'Kütahya Dumlupınar Üniversitesi • Kontrollü Pilot', 2, 6, '2026-08-04', 'valid');

insert into public.pilot_integrations
  (id, name, owner_label, pilot_status, approval_stage, last_test_label)
values
  ('obis', 'ÖBİS', 'Öğrenci İşleri + Bilgi İşlem', 'disconnected', 2, 'Henüz çalıştırılmadı'),
  ('yoksis', 'YÖKSİS', 'Bilgi İşlem', 'disconnected', 4, 'Servis erişimi yok'),
  ('edevlet', 'e-Devlet', 'Bilgi İşlem', 'disconnected', 4, 'Servis erişimi yok'),
  ('gib', 'GİB / e-Arşiv', 'Mali İşler', 'disconnected', 5, 'Mali onay bekleniyor'),
  ('mys', 'MYS / MAYS', 'Döner Sermaye', 'disconnected', 5, 'Mimari taslak'),
  ('identity', 'Kurumsal Kimlik', 'Bilgi İşlem', 'simulated', 1, 'Demo rol seçici etkin'),
  ('message', 'E-posta / SMS', 'Koordinatörlük', 'disconnected', 3, 'Yalnız uygulama içi bildirim');

insert into public.pilot_rule_settings
  (id, setting_key, numeric_value, unit_label, source_note)
values
  ('rule-review-days', 'review_days', 30, 'gün', 'Kaynak dosyadaki pilot gösterge; kurumsal doğrulama gerekir.'),
  ('rule-hours-ects', 'hours_per_ects', 25, 'saat', 'Kavramsal iş yükü pilot parametresi; kurumsal doğrulama gerekir.'),
  ('rule-ects-cap', 'ects_cap_ratio', 10, 'yüzde', 'Program toplamına göre pilot ön kontrol; Senato doğrulaması gerekir.'),
  ('rule-remote-cap', 'remote_credit_cap_ratio', 50, 'yüzde', 'Transfer edilen kredi portföyü için pilot gösterge; yorum doğrulaması gerekir.'),
  ('rule-overlap-warning', 'overlap_warning_from', 41, 'yüzde', 'Karar üretmeyen pilot benzerlik bandı.'),
  ('rule-overlap-high', 'overlap_high_from', 71, 'yüzde', 'Otomatik ret değil; zorunlu insan incelemesi işareti.');

insert into public.pilot_audit_events
  (id, entity_id, occurred_at, actor_label, actor_role, action_label, from_status, to_status, reason)
values
  ('AUD-1007', 'APP-014', '2026-08-19 08:42:00+03', 'Murat Akın', 'coordinator', 'Ön kontrol tamamlandı', 'review', 'commission', 'Zorunlu pilot kanıtların tamamı mevcut.'),
  ('AUD-1006', 'APP-042', '2026-08-18 14:15:00+03', 'MYYS Pilot Analiz Motoru', 'system', 'Karşılaştırma analizi üretildi', 'review', 'review', '%58 benzerlik işareti — karar değildir.'),
  ('AUD-1005', 'APP-031', '2026-08-18 09:05:00+03', 'Prof. Dr. Deniz Aydın', 'commission', 'Revizyon istendi', 'commission', 'revision', 'Rubrik ve öğrenme çıktısı eşlemesi eksik.');
