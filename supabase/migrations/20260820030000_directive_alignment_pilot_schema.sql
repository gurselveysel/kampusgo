-- KDPÜ MYYS controlled-pilot directive alignment schema.
--
-- SAFETY BOUNDARY
-- * This migration models a DRAFT institutional workflow only.
-- * All operational rows are synthetic simulations and have no real-system effect.
-- * It does not connect to OBS/ÖYS/YÖKSİS/e-Devlet/GİB/MYS/MAYS/EBYS/BKYS,
--   identity, banking, payment, messaging or signing systems.
-- * It does not store TCKN/YKN, bank, biometric, exam or real person data.
-- * Anonymous/authenticated API roles receive SELECT only; no write grant exists.

begin;

create table if not exists public.pilot_directive_source_registry (
  id text primary key check (btrim(id) <> ''),
  source_key text not null unique check (btrim(source_key) <> ''),
  title text not null check (btrim(title) <> ''),
  issuing_institution text not null check (btrim(issuing_institution) <> ''),
  publication_date date,
  version_or_decision_no text,
  source_url text not null check (source_url ~ '^https://'),
  accessed_on date not null,
  supported_clauses jsonb not null default '[]'::jsonb check (jsonb_typeof(supported_clauses) = 'array'),
  source_hash text not null check (source_hash ~ '^sha256:[0-9a-f]{64}$'),
  hash_basis text not null default 'canonical_source_url' check (hash_basis = 'canonical_source_url'),
  official_primary_source boolean not null default false,
  verification_status text not null check (verification_status in ('official_page_verified', 'official_file_verified', 'source_not_verified')),
  public_reference boolean not null default true check (public_reference),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_directive_versions (
  id text primary key check (btrim(id) <> ''),
  source_id text not null references public.pilot_directive_source_registry(id) on update cascade on delete restrict,
  document_type text not null check (document_type in ('yonerge', 'usul_ve_esaslar', 'uygulama_parametreleri')),
  version_label text not null check (btrim(version_label) <> ''),
  title text not null check (btrim(title) <> ''),
  status text not null check (status in ('draft_for_institutional_review', 'superseded_draft', 'institutional_decision_required')),
  effective_from date,
  effective_to date,
  senate_approval_reference text,
  legal_counsel_validation_status text not null default 'pending' check (legal_counsel_validation_status in ('pending', 'not_requested', 'validated')),
  public_summary_allowed boolean not null default true check (public_summary_allowed),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  unique (id, version_label),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check (status <> 'draft_for_institutional_review' or senate_approval_reference is null)
);

create table if not exists public.pilot_directive_rule_parameters (
  id text primary key check (btrim(id) <> ''),
  directive_version_id text not null references public.pilot_directive_versions(id) on update cascade on delete cascade,
  rule_key text not null check (btrim(rule_key) <> ''),
  version_no integer not null check (version_no > 0),
  source_clause text not null check (btrim(source_clause) <> ''),
  effective_from date,
  effective_to date,
  program_type text not null check (program_type in ('all', 'formal_elective', 'dpusem_nonformal', 'external_recognition')),
  calculation_basis text not null check (btrim(calculation_basis) <> ''),
  numerator numeric,
  denominator numeric,
  rounding_rule text,
  exception_rule text,
  interpretation_note text not null check (btrim(interpretation_note) <> ''),
  enforcement_mode text not null check (enforcement_mode in ('warning_only', 'manual_block_pending_validation', 'validated_block')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  unique (directive_version_id, rule_key, version_no),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check (denominator is null or denominator <> 0),
  check (not institutional_validation_required or enforcement_mode <> 'validated_block')
);

create table if not exists public.pilot_directive_decision_register (
  id text primary key check (btrim(id) <> ''),
  directive_version_id text not null references public.pilot_directive_versions(id) on update cascade on delete cascade,
  decision_key text not null check (btrim(decision_key) <> ''),
  category text not null check (category in ('legal', 'academic', 'financial', 'personnel', 'privacy_security', 'technical', 'document_type')),
  subject text not null check (btrim(subject) <> ''),
  decision_owner text not null check (btrim(decision_owner) <> ''),
  status text not null check (status in ('institutional_decision_required', 'legal_review_required', 'academic_validation_required', 'deferred_for_pilot')),
  current_safe_assumption text not null check (btrim(current_safe_assumption) <> ''),
  blocking_scope jsonb not null default '[]'::jsonb check (jsonb_typeof(blocking_scope) = 'array'),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  unique (directive_version_id, decision_key)
);

create table if not exists public.pilot_directive_units (
  id text primary key check (btrim(id) <> ''),
  parent_unit_id text references public.pilot_directive_units(id) on update cascade on delete restrict,
  unit_code text not null unique check (btrim(unit_code) <> ''),
  unit_name text not null check (btrim(unit_name) <> ''),
  unit_type text not null check (unit_type in ('university', 'faculty', 'institute', 'vocational_school', 'department', 'center', 'coordinator_office', 'administrative_unit', 'board')),
  decision_scope jsonb not null default '[]'::jsonb check (jsonb_typeof(decision_scope) = 'array'),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (id, unit_type)
);

create table if not exists public.pilot_directive_body_memberships (
  id text primary key check (btrim(id) <> ''),
  unit_id text not null references public.pilot_directive_units(id) on update cascade on delete cascade,
  body_type text not null check (body_type in ('unit_commission', 'center_board', 'coordinator_office', 'education_commission', 'senate', 'student_affairs', 'finance', 'information_technology', 'system_administration')),
  synthetic_actor_ref text not null check (synthetic_actor_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  role_key text not null check (role_key in ('learner', 'instructor', 'externalInstructor', 'coordinator', 'commission', 'studentAffairs', 'it', 'finance', 'admin')),
  mandate_from date not null,
  mandate_to date,
  membership_role text not null check (membership_role in ('chair', 'member', 'secretariat', 'reviewer', 'operator', 'observer')),
  decision_scope jsonb not null default '[]'::jsonb check (jsonb_typeof(decision_scope) = 'array'),
  may_vote boolean not null default false,
  may_make_academic_decision boolean not null default false,
  may_make_financial_decision boolean not null default false,
  system_admin_restriction boolean not null default true,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (unit_id, synthetic_actor_ref, role_key, mandate_from),
  check (mandate_to is null or mandate_to >= mandate_from),
  check (role_key <> 'admin' or (not may_make_academic_decision and not may_make_financial_decision))
);

create table if not exists public.pilot_directive_programs (
  id text primary key check (btrim(id) <> ''),
  myd_code text not null unique check (myd_code ~ '^MYD-[0-9]{4}-[A-Z0-9]{2,12}-[0-9]{3}$'),
  owner_unit_id text not null references public.pilot_directive_units(id) on update cascade on delete restrict,
  program_type text not null check (program_type in ('formal_elective', 'dpusem_nonformal', 'external_recognition')),
  title text not null check (btrim(title) <> ''),
  awarding_body_role text not null check (awarding_body_role in ('dpu_awarding_body', 'dpu_recognizing_body', 'external_awarding_body')),
  status text not null check (status in ('draft', 'review', 'approved_for_simulation', 'sunset', 'closed')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  unique (id, program_type)
);

create table if not exists public.pilot_directive_program_versions (
  program_id text not null,
  version_no integer not null check (version_no > 0),
  program_type text not null,
  directive_version_id text not null references public.pilot_directive_versions(id) on update cascade on delete restrict,
  version_label text not null check (btrim(version_label) <> ''),
  ects numeric(3,1) not null check (ects between 1 and 6),
  total_learner_workload_hours numeric(6,1) not null check (total_learner_workload_hours between 25 and 180),
  delivery_mode text not null check (delivery_mode in ('face_to_face', 'online', 'hybrid')),
  pedagogical_reference_level smallint check (pedagogical_reference_level between 1 and 8),
  level_claim_status text not null default 'advisory_only' check (level_claim_status = 'advisory_only'),
  information_package jsonb not null check (jsonb_typeof(information_package) = 'object'),
  status text not null check (status in ('draft', 'human_review', 'board_decision_recorded', 'simulation_ready', 'superseded')),
  valid_from date,
  valid_to date,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  primary key (program_id, version_no),
  foreign key (program_id, program_type) references public.pilot_directive_programs(id, program_type) on update cascade on delete cascade,
  check (total_learner_workload_hours >= 25 * ects and total_learner_workload_hours <= 30 * ects),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table if not exists public.pilot_directive_workload_items (
  id text primary key check (btrim(id) <> ''),
  program_id text not null,
  program_version_no integer not null,
  component_type text not null check (component_type in ('synchronous_or_face_to_face', 'asynchronous_learning', 'preparation_and_reading', 'practice_or_laboratory', 'project_assignment_portfolio', 'independent_study', 'assessment', 'feedback_and_revision')),
  planned_hours numeric(6,1) not null check (planned_hours >= 0),
  realized_feedback_hours numeric(6,1) check (realized_feedback_hours is null or realized_feedback_hours >= 0),
  calculation_note text not null check (btrim(calculation_note) <> ''),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, program_version_no) references public.pilot_directive_program_versions(program_id, version_no) on update cascade on delete cascade,
  unique (program_id, program_version_no, component_type)
);

create table if not exists public.pilot_directive_terms (
  id text primary key check (btrim(id) <> ''),
  academic_period_label text not null check (btrim(academic_period_label) <> ''),
  starts_on date not null,
  ends_on date not null,
  application_opens_at timestamptz not null,
  application_closes_at timestamptz not null,
  status text not null check (status in ('planned', 'application_open', 'simulation_closed')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  check (ends_on >= starts_on),
  check (application_closes_at > application_opens_at)
);

create table if not exists public.pilot_directive_offerings (
  id text primary key check (btrim(id) <> ''),
  program_id text not null,
  program_version_no integer not null,
  term_id text not null references public.pilot_directive_terms(id) on update cascade on delete restrict,
  capacity integer not null check (capacity >= 0),
  reserved_capacity integer not null default 0 check (reserved_capacity >= 0 and reserved_capacity <= capacity),
  queue_policy text not null default 'timestamp_then_idempotency_key' check (queue_policy = 'timestamp_then_idempotency_key'),
  status text not null check (status in ('planned', 'open_for_simulation', 'closed')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, program_version_no) references public.pilot_directive_program_versions(program_id, version_no) on update cascade on delete restrict,
  unique (program_id, program_version_no, term_id)
);

create table if not exists public.pilot_directive_enrollment_queue (
  id text primary key check (btrim(id) <> ''),
  offering_id text not null references public.pilot_directive_offerings(id) on update cascade on delete cascade,
  synthetic_learner_ref text not null check (synthetic_learner_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  requested_at timestamptz not null,
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  queue_position integer not null check (queue_position > 0),
  result_state text not null check (result_state in ('accepted_simulation', 'waitlisted_simulation', 'withdrawn_simulation')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (offering_id, queue_position),
  unique (offering_id, synthetic_learner_ref)
);

create table if not exists public.pilot_directive_recognition_cases (
  id text primary key check (btrim(id) <> ''),
  case_reference text not null unique check (case_reference ~ '^SENTETIK-TANIMA-[0-9]{4}-[0-9]{3}$'),
  synthetic_holder_ref text not null check (synthetic_holder_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  provider_name text not null check (btrim(provider_name) <> ''),
  awarding_body_name text not null check (btrim(awarding_body_name) <> ''),
  credential_fingerprint text not null check (credential_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  requested_ects numeric(3,1) check (requested_ects is null or requested_ects between 0.5 and 6),
  requested_course_code text,
  online_delivery boolean not null default false,
  status text not null check (status in ('document_review', 'additional_evidence_requested', 'human_decision_recorded', 'appeal_open', 'closed')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_directive_recognition_checks (
  id text primary key check (btrim(id) <> ''),
  case_id text not null references public.pilot_directive_recognition_cases(id) on update cascade on delete cascade,
  check_type text not null check (check_type in ('provider_and_awarding_body', 'learning_outcome_match', 'level_and_workload', 'assessment_validity_reliability', 'identity_and_authenticity', 'quality_assurance', 'double_counting', 'prior_course', 'proctoring', 'originality', 'evidence_integrity', 'accessibility')),
  result text not null check (result in ('pass', 'fail', 'human_review', 'additional_evidence_required')),
  rationale text not null check (btrim(rationale) <> ''),
  evidence_summary text not null check (btrim(evidence_summary) <> ''),
  rule_parameter_id text references public.pilot_directive_rule_parameters(id) on update cascade on delete restrict,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (case_id, check_type)
);

create table if not exists public.pilot_directive_recognition_decisions (
  id text primary key check (btrim(id) <> ''),
  case_id text not null references public.pilot_directive_recognition_cases(id) on update cascade on delete cascade,
  decision_type text not null check (decision_type in ('credential_verification_or_recognition', 'ects_credit_recognition', 'course_or_requirement_substitution')),
  decision_round integer not null default 1 check (decision_round > 0),
  outcome text not null check (outcome in ('approved', 'partially_approved', 'rejected', 'additional_evidence_required', 'deferred')),
  recognized_ects numeric(3,1) check (recognized_ects is null or recognized_ects between 0 and 6),
  substituted_course_code text,
  deciding_body text not null check (btrim(deciding_body) <> ''),
  rationale text not null check (char_length(btrim(rationale)) >= 10),
  decision_rule_snapshot jsonb not null check (jsonb_typeof(decision_rule_snapshot) = 'object'),
  appeal_path text not null check (btrim(appeal_path) <> ''),
  decided_at timestamptz not null,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  institutional_validation_confirmed boolean not null default false check (not institutional_validation_confirmed),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (case_id, decision_type, decision_round),
  unique (id, deciding_body),
  check (decision_type = 'ects_credit_recognition' or recognized_ects is null),
  check (decision_type = 'course_or_requirement_substitution' or substituted_course_code is null),
  check (outcome not in ('approved', 'partially_approved') or institutional_validation_confirmed)
);

create table if not exists public.pilot_directive_recognition_appeals (
  id text primary key check (btrim(id) <> ''),
  original_decision_id text not null,
  original_deciding_body text not null,
  appellate_body text not null check (btrim(appellate_body) <> ''),
  synthetic_appellant_ref text not null check (synthetic_appellant_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  filed_at timestamptz not null,
  grounds text not null check (char_length(btrim(grounds)) >= 10),
  status text not null check (status in ('filed', 'independent_review', 'decided')),
  outcome text check (outcome is null or outcome in ('upheld', 'varied', 'remitted', 'rejected')),
  rationale text,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (original_decision_id, original_deciding_body) references public.pilot_directive_recognition_decisions(id, deciding_body) on update cascade on delete restrict,
  check (appellate_body <> original_deciding_body)
);

create table if not exists public.pilot_directive_double_counting_registry (
  id text primary key check (btrim(id) <> ''),
  synthetic_holder_ref text not null check (synthetic_holder_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  credential_fingerprint text not null check (credential_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  target_program_key text not null check (btrim(target_program_key) <> ''),
  target_requirement_key text not null check (btrim(target_requirement_key) <> ''),
  recognition_case_id text not null references public.pilot_directive_recognition_cases(id) on update cascade on delete cascade,
  record_status text not null check (record_status in ('reserved_for_review', 'counted', 'released')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (synthetic_holder_ref, credential_fingerprint, target_program_key, target_requirement_key)
);

create table if not exists public.pilot_directive_commission_meetings (
  id text primary key check (btrim(id) <> ''),
  meeting_reference text not null unique check (meeting_reference ~ '^SENTETIK-TOPLANTI-[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  body_unit_id text not null references public.pilot_directive_units(id) on update cascade on delete restrict,
  scheduled_at timestamptz not null,
  quorum_required integer not null check (quorum_required > 0),
  present_voters integer not null check (present_voters >= 0),
  quorum_met boolean generated always as (present_voters >= quorum_required) stored,
  status text not null check (status in ('scheduled', 'quorum_recorded', 'closed')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic)
);

create table if not exists public.pilot_directive_meeting_participants (
  meeting_id text not null references public.pilot_directive_commission_meetings(id) on update cascade on delete cascade,
  membership_id text not null references public.pilot_directive_body_memberships(id) on update cascade on delete restrict,
  present boolean not null default true,
  conflict_declared boolean not null default false,
  recused boolean not null default false,
  voting_eligible boolean not null default true,
  vote_allowed boolean generated always as (present and voting_eligible and not conflict_declared and not recused) stored,
  conflict_note text,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  primary key (meeting_id, membership_id),
  unique (meeting_id, membership_id, vote_allowed),
  check (not conflict_declared or recused),
  check (not recused or not voting_eligible)
);

create table if not exists public.pilot_directive_commission_votes (
  id text primary key check (btrim(id) <> ''),
  meeting_id text not null,
  membership_id text not null,
  vote_allowed boolean not null default true check (vote_allowed),
  resolution_key text not null check (btrim(resolution_key) <> ''),
  vote text not null check (vote in ('approve', 'reject', 'abstain')),
  recorded_at timestamptz not null,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (meeting_id, membership_id, vote_allowed) references public.pilot_directive_meeting_participants(meeting_id, membership_id, vote_allowed) on update cascade on delete restrict,
  unique (meeting_id, membership_id, resolution_key)
);

create table if not exists public.pilot_directive_commission_resolutions (
  id text primary key check (btrim(id) <> ''),
  meeting_id text not null references public.pilot_directive_commission_meetings(id) on update cascade on delete restrict,
  resolution_key text not null check (btrim(resolution_key) <> ''),
  subject_type text not null check (subject_type in ('program_version', 'recognition_case', 'appeal', 'quality_review')),
  subject_reference text not null check (btrim(subject_reference) <> ''),
  decision_stage text not null check (decision_stage in ('first_instance', 'appeal_review')),
  outcome text not null check (outcome in ('approved', 'revision_requested', 'rejected', 'deferred', 'remitted')),
  rationale text not null check (char_length(btrim(rationale)) >= 10),
  quorum_snapshot jsonb not null check (jsonb_typeof(quorum_snapshot) = 'object'),
  independent_review_confirmed boolean not null default false,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  institutional_validation_confirmed boolean not null default false check (not institutional_validation_confirmed),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (meeting_id, resolution_key),
  check (decision_stage <> 'appeal_review' or independent_review_confirmed),
  check (outcome <> 'approved' or institutional_validation_confirmed)
);

create table if not exists public.pilot_directive_credentials (
  id text primary key check (btrim(id) <> ''),
  public_document_id text not null unique check (public_document_id ~ '^MYD-VERIFY-[A-Z0-9]{12}$'),
  holder_internal_ref text not null check (holder_internal_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  holder_display_masked text not null check (holder_display_masked ~ '\*'),
  credential_title text not null check (btrim(credential_title) <> ''),
  issuing_country_or_region text not null check (btrim(issuing_country_or_region) <> ''),
  awarding_body text not null check (btrim(awarding_body) <> ''),
  issue_date date not null,
  learning_outcomes jsonb not null check (jsonb_typeof(learning_outcomes) = 'array' and jsonb_array_length(learning_outcomes) > 0),
  learner_workload_hours numeric(6,1) not null check (learner_workload_hours between 25 and 180),
  learner_workload_unit text not null default 'hours' check (learner_workload_unit = 'hours'),
  pedagogical_reference_level smallint check (pedagogical_reference_level between 1 and 8),
  level_status text not null default 'advisory_not_official_placement' check (level_status = 'advisory_not_official_placement'),
  participation_form text not null check (btrim(participation_form) <> ''),
  assessment_type text not null check (btrim(assessment_type) <> ''),
  quality_assurance_basis text not null check (btrim(quality_assurance_basis) <> ''),
  program_id text not null,
  program_version_no integer not null,
  status text not null check (status in ('draft_simulation', 'issued_simulation', 'revoked_simulation', 'expired_simulation')),
  expires_on date,
  public_verification_enabled boolean not null default true,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, program_version_no) references public.pilot_directive_program_versions(program_id, version_no) on update cascade on delete restrict,
  check (expires_on is null or expires_on >= issue_date)
);

create table if not exists public.pilot_directive_credential_revocations (
  id text primary key check (btrim(id) <> ''),
  credential_id text not null references public.pilot_directive_credentials(id) on update cascade on delete restrict,
  revoked_at timestamptz not null,
  reason text not null check (char_length(btrim(reason)) >= 10),
  authorized_body text not null check (btrim(authorized_body) <> ''),
  replacement_credential_id text references public.pilot_directive_credentials(id) on update cascade on delete restrict,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (credential_id),
  check (replacement_credential_id is null or replacement_credential_id <> credential_id)
);

create table if not exists public.pilot_directive_verification_events (
  id text primary key check (btrim(id) <> ''),
  credential_id text not null references public.pilot_directive_credentials(id) on update cascade on delete cascade,
  viewed_at timestamptz not null,
  requester_class text not null check (requester_class in ('public_anonymous', 'authorized_staff_simulation')),
  verification_result text not null check (verification_result in ('valid_simulation', 'revoked_simulation', 'not_found_simulation')),
  disclosed_fields jsonb not null check (jsonb_typeof(disclosed_fields) = 'array'),
  network_identifier_stored boolean not null default false check (not network_identifier_stored),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic)
);

create table if not exists public.pilot_directive_award_states (
  id text primary key check (btrim(id) <> ''),
  synthetic_holder_ref text not null check (synthetic_holder_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  program_id text not null,
  program_version_no integer not null,
  completion_status text not null check (completion_status in ('not_started', 'completed_simulation', 'failed_simulation')),
  badge_status text not null check (badge_status in ('not_eligible', 'eligible_not_issued', 'issued_simulation', 'revoked_simulation')),
  credential_status text not null check (credential_status in ('not_eligible', 'eligible_not_issued', 'issued_simulation', 'revoked_simulation')),
  ects_recognition_status text not null check (ects_recognition_status in ('not_requested', 'pending_human_decision', 'recognized_simulation', 'not_recognized')),
  course_substitution_status text not null check (course_substitution_status in ('not_requested', 'pending_human_decision', 'substituted_simulation', 'not_substituted')),
  state_rationale jsonb not null check (jsonb_typeof(state_rationale) = 'object'),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, program_version_no) references public.pilot_directive_program_versions(program_id, version_no) on update cascade on delete restrict,
  unique (synthetic_holder_ref, program_id, program_version_no)
);

create table if not exists public.pilot_directive_quality_reviews (
  id text primary key check (btrim(id) <> ''),
  program_id text not null,
  program_version_no integer not null,
  review_type text not null check (review_type in ('initial_quality_gate', 'periodic_review', 'incident_review', 'sunset_review')),
  pdca_stage text not null check (pdca_stage in ('plan', 'do', 'check', 'act')),
  planned_at date not null,
  completed_at date,
  evidence_summary jsonb not null check (jsonb_typeof(evidence_summary) = 'object'),
  review_outcome text not null check (review_outcome in ('pending', 'continue_simulation', 'improvement_required', 'sunset_recommended')),
  next_review_on date,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, program_version_no) references public.pilot_directive_program_versions(program_id, version_no) on update cascade on delete cascade,
  check (completed_at is null or completed_at >= planned_at),
  check (next_review_on is null or next_review_on >= planned_at)
);

create table if not exists public.pilot_directive_sunset_plans (
  id text primary key check (btrim(id) <> ''),
  program_id text not null,
  program_version_no integer not null,
  decision_reference text not null check (btrim(decision_reference) <> ''),
  enrollment_closes_on date not null,
  teach_out_ends_on date not null,
  remaining_synthetic_learners integer not null default 0 check (remaining_synthetic_learners >= 0),
  credential_correction_until date,
  status text not null check (status in ('planned', 'teach_out_simulation', 'completed_simulation')),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, program_version_no) references public.pilot_directive_program_versions(program_id, version_no) on update cascade on delete cascade,
  unique (program_id, program_version_no),
  check (teach_out_ends_on >= enrollment_closes_on),
  check (credential_correction_until is null or credential_correction_until >= teach_out_ends_on)
);

create table if not exists public.pilot_directive_finance_cases (
  id text primary key check (btrim(id) <> ''),
  program_id text not null,
  program_version_no integer not null,
  synthetic_instructor_ref text not null check (synthetic_instructor_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  teaching_hours numeric(6,1) not null check (teaching_hours >= 0),
  workload_approval_status text not null check (workload_approval_status in ('pending_personnel_validation', 'simulation_approved', 'simulation_rejected')),
  budget_approval_status text not null check (budget_approval_status in ('pending_financial_validation', 'simulation_approved', 'simulation_rejected')),
  payment_eligibility_status text not null check (payment_eligibility_status in ('not_evaluated', 'eligible_simulation', 'not_eligible_simulation')),
  estimated_amount numeric(12,2) not null default 0 check (estimated_amount >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  dry_run_only boolean not null default true check (dry_run_only),
  payment_executed boolean not null default false check (not payment_executed),
  invoice_created boolean not null default false check (not invoice_created),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, program_version_no) references public.pilot_directive_program_versions(program_id, version_no) on update cascade on delete restrict
);

create table if not exists public.pilot_directive_rule_evaluations (
  id text primary key check (btrim(id) <> ''),
  rule_parameter_id text not null references public.pilot_directive_rule_parameters(id) on update cascade on delete restrict,
  subject_type text not null check (subject_type in ('program_version', 'offering', 'recognition_case', 'enrollment_queue')),
  subject_reference text not null check (btrim(subject_reference) <> ''),
  evaluation_result text not null check (evaluation_result in ('pass', 'warning', 'manual_block_pending_validation', 'not_applicable')),
  observed_value numeric,
  calculated_limit numeric,
  rationale text not null check (btrim(rationale) <> ''),
  rule_snapshot jsonb not null check (jsonb_typeof(rule_snapshot) = 'object'),
  evaluated_at timestamptz not null,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic)
);

create table if not exists public.pilot_directive_audit_events (
  id text primary key check (btrim(id) <> ''),
  aggregate_type text not null check (btrim(aggregate_type) <> ''),
  aggregate_id text not null check (btrim(aggregate_id) <> ''),
  event_type text not null check (btrim(event_type) <> ''),
  actor_ref text not null check (actor_ref ~ '^SENTETIK-[A-Z0-9-]+$'),
  source_version text not null check (btrim(source_version) <> ''),
  event_payload jsonb not null check (jsonb_typeof(event_payload) = 'object'),
  correlation_id text not null check (btrim(correlation_id) <> ''),
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  occurred_at timestamptz not null,
  personal_identifiers_present boolean not null default false check (not personal_identifiers_present),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic)
);

create table if not exists public.pilot_directive_outbox (
  id text primary key check (btrim(id) <> ''),
  audit_event_id text not null references public.pilot_directive_audit_events(id) on update cascade on delete cascade,
  destination_system text not null check (destination_system in ('OBS_DRY_RUN', 'OYS_DRY_RUN', 'EBYS_DRY_RUN', 'MYS_MAYS_DRY_RUN', 'GIB_DRY_RUN', 'BADGE_WALLET_DRY_RUN')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  delivery_status text not null default 'dry_run_only' check (delivery_status = 'dry_run_only'),
  live_dispatch_enabled boolean not null default false check (not live_dispatch_enabled),
  dispatched_at timestamptz check (dispatched_at is null),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic)
);

-- Index every foreign-key access path and common rule/audit lookup.
create index if not exists pilot_directive_versions_source_idx on public.pilot_directive_versions(source_id);
create index if not exists pilot_directive_rules_version_idx on public.pilot_directive_rule_parameters(directive_version_id, rule_key, version_no);
create index if not exists pilot_directive_decisions_version_idx on public.pilot_directive_decision_register(directive_version_id, status);
create index if not exists pilot_directive_memberships_unit_idx on public.pilot_directive_body_memberships(unit_id, body_type, role_key);
create index if not exists pilot_directive_programs_owner_idx on public.pilot_directive_programs(owner_unit_id, program_type);
create index if not exists pilot_directive_versions_policy_idx on public.pilot_directive_program_versions(directive_version_id, status);
create index if not exists pilot_directive_workload_program_idx on public.pilot_directive_workload_items(program_id, program_version_no);
create index if not exists pilot_directive_offerings_term_idx on public.pilot_directive_offerings(term_id, status);
create index if not exists pilot_directive_queue_offering_idx on public.pilot_directive_enrollment_queue(offering_id, requested_at, queue_position);
create index if not exists pilot_directive_recognition_checks_case_idx on public.pilot_directive_recognition_checks(case_id, check_type);
create index if not exists pilot_directive_recognition_decisions_case_idx on public.pilot_directive_recognition_decisions(case_id, decision_type, decision_round);
create index if not exists pilot_directive_recognition_appeal_decision_idx on public.pilot_directive_recognition_appeals(original_decision_id, original_deciding_body);
create index if not exists pilot_directive_double_counting_case_idx on public.pilot_directive_double_counting_registry(recognition_case_id);
create index if not exists pilot_directive_participants_membership_idx on public.pilot_directive_meeting_participants(membership_id, meeting_id);
create index if not exists pilot_directive_votes_participant_idx on public.pilot_directive_commission_votes(meeting_id, membership_id, vote_allowed);
create index if not exists pilot_directive_resolutions_meeting_idx on public.pilot_directive_commission_resolutions(meeting_id, decision_stage);
create index if not exists pilot_directive_credentials_program_idx on public.pilot_directive_credentials(program_id, program_version_no);
create index if not exists pilot_directive_revocations_replacement_idx on public.pilot_directive_credential_revocations(replacement_credential_id);
create index if not exists pilot_directive_verification_credential_idx on public.pilot_directive_verification_events(credential_id, viewed_at);
create index if not exists pilot_directive_award_program_idx on public.pilot_directive_award_states(program_id, program_version_no);
create index if not exists pilot_directive_quality_program_idx on public.pilot_directive_quality_reviews(program_id, program_version_no, planned_at);
create index if not exists pilot_directive_sunset_program_idx on public.pilot_directive_sunset_plans(program_id, program_version_no);
create index if not exists pilot_directive_finance_program_idx on public.pilot_directive_finance_cases(program_id, program_version_no);
create index if not exists pilot_directive_rule_eval_rule_idx on public.pilot_directive_rule_evaluations(rule_parameter_id, subject_type, subject_reference);
create index if not exists pilot_directive_outbox_event_idx on public.pilot_directive_outbox(audit_event_id, delivery_status);

-- Controlled synthetic seed. Public sources are registry metadata only; draft text
-- and internal opinions are intentionally not stored or exposed.
insert into public.pilot_directive_source_registry
  (id, source_key, title, issuing_institution, publication_date, version_or_decision_no, source_url, accessed_on, supported_clauses, source_hash, official_primary_source, verification_status)
values
  ('SRC-DPU-DRAFT-2026', 'dpu_micro_directive_draft_v3', 'DPÜ Mikro Yeterlilik Programları Yönergesi Taslağı — yalnız dosya üst verisi', 'Kütahya Dumlupınar Üniversitesi', '2026-08-07', 'versiyon3', 'https://www.dpu.edu.tr/', '2026-08-20', '["Madde 1-16", "EK-1"]', 'sha256:d60ac26c1548401c9ab0815522b9384c55bebd152464a875b3a9009d6b82ab3b', false, 'source_not_verified'),
  ('SRC-MYK-2025-02', 'tyc_micro_usul_2025_02', 'Türkiye Yeterlilikler Çerçevesi Kapsamında Mikro Yeterliliklere İlişkin Usul ve Esaslar', 'Mesleki Yeterlilik Kurumu', '2025-05-26', '2025/02', 'https://myk.gov.tr/tr/haberler/resimli-haberler-anasayfa/turkiye-yeterlilikler-cercevesi-kapsaminda-mikro-yeterliliklere-iliskin-usul-ve-esaslar-yururluge-girdi-174858994', '2026-08-20', '["ulusal mikro-yeterlilik çerçevesi"]', 'sha256:065227001104bf9444a360ee0501dbd92a0e3c54bbe1da64bed3171038989ff0', true, 'official_page_verified'),
  ('SRC-ECTS-2015', 'ects_users_guide_2015', 'ECTS Users’ Guide 2015', 'European Commission', '2015-01-01', '2015', 'https://op.europa.eu/publication/doi/10.2766/87592', '2026-08-20', '["AKTS ve öğrenen iş yükü"]', 'sha256:6cec6306a238a31af40646cb6f0379cc78d0bfe14190f5758c16fa201e028234', true, 'official_page_verified')
on conflict (id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  accessed_on = excluded.accessed_on,
  supported_clauses = excluded.supported_clauses,
  source_hash = excluded.source_hash,
  hash_basis = excluded.hash_basis,
  official_primary_source = excluded.official_primary_source,
  verification_status = excluded.verification_status;

insert into public.pilot_directive_versions
  (id, source_id, document_type, version_label, title, status, legal_counsel_validation_status)
values
  ('DIR-DPU-MY-2026-DRAFT', 'SRC-DPU-DRAFT-2026', 'yonerge', '2026.08.20-review-1', 'Kütahya Dumlupınar Üniversitesi Mikro Yeterlilik Programları Yönergesi — Kurumsal Değerlendirme Taslağı', 'draft_for_institutional_review', 'pending')
on conflict (id) do update set
  version_label = excluded.version_label,
  title = excluded.title,
  status = excluded.status,
  senate_approval_reference = null;

insert into public.pilot_directive_rule_parameters
  (id, directive_version_id, rule_key, version_no, source_clause, program_type, calculation_basis, numerator, denominator, rounding_rule, exception_rule, interpretation_note, enforcement_mode)
values
  ('RULE-CREDIT-TEN-PERCENT', 'DIR-DPU-MY-2026-DRAFT', 'total_program_ects_ten_percent', 1, 'Taslak Madde 7 — yorum/payda kurumsal doğrulama bekliyor', 'formal_elective', 'program toplam AKTS paydası kurumca doğrulanmadan otomatik işlem yapılmaz', 10, 100, 'Kurumsal karar bekliyor', 'Program türü ve müfredat paydası doğrulanmalıdır', 'Sistem yalnız uyarı üretir; kesin mevzuat sınırı olarak sunulmaz.', 'manual_block_pending_validation'),
  ('RULE-REMOTE-FIFTY-PERCENT', 'DIR-DPU-MY-2026-DRAFT', 'remote_recognition_fifty_percent', 1, 'Taslak Madde 7 — kapsam ve payda kurumsal doğrulama bekliyor', 'all', 'uzaktan sunum/tanıma oranının paydası kurumsal karar gerektirir', 50, 100, 'Kurumsal karar bekliyor', 'Hibrit ve tek program edge-case kararı gerekir', 'Sunum biçimi tek başına otomatik ret oluşturmaz.', 'warning_only'),
  ('RULE-TERM-FIVE-ECTS', 'DIR-DPU-MY-2026-DRAFT', 'term_five_ects', 1, 'Taslak Madde 7 — 6 AKTS program edge-case kararı bekliyor', 'formal_elective', 'aynı akademik dönemde tanınan mikro-yeterlilik AKTS toplamı', 5, 1, 'Kısmi tanıma kuralı kurumca belirlenir', '6 AKTS program ve mezuniyet durumu ayrıca incelenir', '6 AKTS mikro-yeterlilik için otomatik ret verilmez; insan kararı gerekir.', 'manual_block_pending_validation'),
  ('RULE-ACTIVITY-HALF', 'DIR-DPU-MY-2026-DRAFT', 'activity_half_of_allowed_load', 1, 'Taslak Madde 7 — izinli yük paydası belirsiz', 'formal_elective', 'spor/kültür/sanat/sosyal faaliyet kategorisinde izinli yük', 1, 2, 'Kurumsal karar bekliyor', 'Kategori ve izinli yük tanımı doğrulanmalıdır', 'Yalnız uyarı ve hesap önizlemesi üretir.', 'warning_only'),
  ('RULE-SEMESTER-THREE-EIGHT', 'DIR-DPU-MY-2026-DRAFT', 'eligible_semesters_three_to_eight', 1, 'Taslak Madde 7 — önlisans/lisansüstü uygulanabilirliği belirsiz', 'formal_elective', 'öğrencinin program türü ve dönem bilgisi', 3, 8, 'Uygulanmaz', 'Önlisans, lisansüstü ve mezun durumları için ayrı karar gerekir', 'Sistem program türü doğrulanmadan kesin blok uygulamaz.', 'warning_only'),
  ('RULE-REVIEW-THIRTY-DAYS', 'DIR-DPU-MY-2026-DRAFT', 'review_target_thirty_days', 1, 'Taslak Madde 9 — başlangıç/duruş/uzama halleri belirsiz', 'all', 'tam dosyanın yetkili birimce teslim alındığı tarih', 30, 1, 'Takvim veya iş günü tercihi kurumsal karar bekliyor', 'Eksik belge, revizyon ve mücbir sebep sayaçları ayrıca belirlenir', 'SLA göstergesidir; kendiliğinden kabul veya ret doğurmaz.', 'warning_only')
on conflict (id) do update set
  source_clause = excluded.source_clause,
  interpretation_note = excluded.interpretation_note,
  enforcement_mode = excluded.enforcement_mode;

insert into public.pilot_directive_decision_register
  (id, directive_version_id, decision_key, category, subject, decision_owner, status, current_safe_assumption, blocking_scope)
values
  ('DEC-REG-DOC-TYPE', 'DIR-DPU-MY-2026-DRAFT', 'document_type', 'document_type', 'Yönerge / Usul ve Esaslar belge türü', 'Senato ve Hukuk Müşavirliği', 'institutional_decision_required', 'Pilot, görev ve süreç düzenlediği için yönerge çalışma başlığını kullanır; resmî tercih yapılmış sayılmaz.', '["publication", "production"]'),
  ('DEC-REG-NUMERIC-RULES', 'DIR-DPU-MY-2026-DRAFT', 'numeric_limits', 'academic', 'Oran, dönem ve süre parametrelerinin payda/istisna/yuvarlama yorumu', 'Senato ve Eğitim-Öğretim Komisyonu', 'academic_validation_required', 'Tümü sürümlü uyarı kuralıdır; validasyon olmadan otomatik nihai işlem yoktur.', '["automatic_final_decision", "production"]'),
  ('DEC-REG-FINANCE', 'DIR-DPU-MY-2026-DRAFT', 'finance_personnel', 'financial', 'Ders yükü, bütçe, mali hak ediş ve ücret ayrımı', 'Personel Daire Başkanlığı ve mali birimler', 'institutional_decision_required', 'Yalnız sıfır tutarlı dry-run gösterilir.', '["payment", "invoice", "entitlement"]'),
  ('DEC-REG-PRIVACY', 'DIR-DPU-MY-2026-DRAFT', 'credential_identity', 'privacy_security', 'Belge ve doğrulama ekranındaki kimlik alanları', 'KVKK/Bilgi Güvenliği ve Öğrenci İşleri', 'legal_review_required', 'Tam TCKN/YKN tutulmaz veya kamu görünümünde gösterilmez; sentetik rastgele kimlik kullanılır.', '["real_identity", "public_disclosure"]')
on conflict (id) do update set
  subject = excluded.subject,
  status = excluded.status,
  current_safe_assumption = excluded.current_safe_assumption;

insert into public.pilot_directive_units (id, parent_unit_id, unit_code, unit_name, unit_type, decision_scope)
values
  ('UNIT-DPU', null, 'DPU-SIM', 'Kütahya Dumlupınar Üniversitesi — SENTETİK', 'university', '["institutional_governance"]'),
  ('UNIT-MYKOORD', 'UNIT-DPU', 'MYKOORD-SIM', 'Mikro Yeterlilik Koordinatörlüğü — SENTETİK', 'coordinator_office', '["coordination", "pre_review"]'),
  ('UNIT-MYKOM', 'UNIT-DPU', 'MYKOM-SIM', 'Mikro Yeterlilik Komisyonu — SENTETİK', 'board', '["academic_human_review"]'),
  ('UNIT-OIDB', 'UNIT-DPU', 'OIDB-SIM', 'Öğrenci İşleri — SENTETİK', 'administrative_unit', '["record_dry_run"]'),
  ('UNIT-BIDB', 'UNIT-DPU', 'BIDB-SIM', 'Bilgi İşlem — SENTETİK', 'administrative_unit', '["technical_dry_run"]'),
  ('UNIT-MALI', 'UNIT-DPU', 'MALI-SIM', 'Mali İşler — SENTETİK', 'administrative_unit', '["finance_dry_run"]')
on conflict (id) do update set
  unit_name = excluded.unit_name,
  decision_scope = excluded.decision_scope;

insert into public.pilot_directive_body_memberships
  (id, unit_id, body_type, synthetic_actor_ref, role_key, mandate_from, mandate_to, membership_role, decision_scope, may_vote, may_make_academic_decision, may_make_financial_decision)
values
  ('MEM-LEARNER', 'UNIT-DPU', 'student_affairs', 'SENTETIK-ROL-LEARNER', 'learner', '2026-08-20', '2027-08-19', 'observer', '["own_simulation"]', false, false, false),
  ('MEM-INSTRUCTOR', 'UNIT-MYKOORD', 'coordinator_office', 'SENTETIK-ROL-INSTRUCTOR', 'instructor', '2026-08-20', '2027-08-19', 'reviewer', '["draft_program"]', false, false, false),
  ('MEM-EXTERNAL', 'UNIT-MYKOORD', 'coordinator_office', 'SENTETIK-ROL-EXTERNAL', 'externalInstructor', '2026-08-20', '2027-08-19', 'reviewer', '["draft_external_program"]', false, false, false),
  ('MEM-COORD', 'UNIT-MYKOORD', 'coordinator_office', 'SENTETIK-ROL-COORDINATOR', 'coordinator', '2026-08-20', '2027-08-19', 'chair', '["pre_review", "agenda"]', false, false, false),
  ('MEM-COMM-CHAIR', 'UNIT-MYKOM', 'unit_commission', 'SENTETIK-ROL-COMMISSION-CHAIR', 'commission', '2026-08-20', '2027-08-19', 'chair', '["academic_human_decision"]', true, true, false),
  ('MEM-COMM-MEMBER', 'UNIT-MYKOM', 'unit_commission', 'SENTETIK-ROL-COMMISSION-MEMBER', 'commission', '2026-08-20', '2027-08-19', 'member', '["academic_human_decision"]', true, true, false),
  ('MEM-COMM-MEMBER-2', 'UNIT-MYKOM', 'unit_commission', 'SENTETIK-ROL-COMMISSION-MEMBER-2', 'commission', '2026-08-20', '2027-08-19', 'member', '["academic_human_decision"]', true, true, false),
  ('MEM-STUDENT-AFFAIRS', 'UNIT-OIDB', 'student_affairs', 'SENTETIK-ROL-STUDENT-AFFAIRS', 'studentAffairs', '2026-08-20', '2027-08-19', 'operator', '["record_dry_run"]', false, false, false),
  ('MEM-IT', 'UNIT-BIDB', 'information_technology', 'SENTETIK-ROL-IT', 'it', '2026-08-20', '2027-08-19', 'operator', '["technical_dry_run"]', false, false, false),
  ('MEM-FINANCE', 'UNIT-MALI', 'finance', 'SENTETIK-ROL-FINANCE', 'finance', '2026-08-20', '2027-08-19', 'operator', '["financial_human_decision"]', false, false, true),
  ('MEM-ADMIN', 'UNIT-BIDB', 'system_administration', 'SENTETIK-ROL-ADMIN', 'admin', '2026-08-20', '2027-08-19', 'operator', '["configuration_only"]', false, false, false)
on conflict (id) do update set
  decision_scope = excluded.decision_scope,
  may_vote = excluded.may_vote,
  may_make_academic_decision = excluded.may_make_academic_decision,
  may_make_financial_decision = excluded.may_make_financial_decision;

insert into public.pilot_directive_programs
  (id, myd_code, owner_unit_id, program_type, title, awarding_body_role, status)
values
  ('PROGRAM-DATA-LITERACY', 'MYD-2026-DPU-001', 'UNIT-MYKOORD', 'formal_elective', 'Veri Okuryazarlığı Mikro Yeterliliği — SENTETİK', 'dpu_awarding_body', 'approved_for_simulation')
on conflict (id) do update set
  title = excluded.title,
  status = excluded.status;

insert into public.pilot_directive_program_versions
  (program_id, version_no, program_type, directive_version_id, version_label, ects, total_learner_workload_hours, delivery_mode, pedagogical_reference_level, information_package, status)
values
  ('PROGRAM-DATA-LITERACY', 1, 'formal_elective', 'DIR-DPU-MY-2026-DRAFT', '1.0-SENTETIK', 3, 82.5, 'hybrid', 6,
   '{"learning_outcomes":["Veri problemini kanıta dayalı analiz eder"],"assessment":"proje+rubrik+sözlü savunma","official_placement_claim":false,"institutional_validation_required":true}',
   'simulation_ready')
on conflict (program_id, version_no) do update set
  ects = excluded.ects,
  total_learner_workload_hours = excluded.total_learner_workload_hours,
  information_package = excluded.information_package,
  status = excluded.status;

insert into public.pilot_directive_workload_items
  (id, program_id, program_version_no, component_type, planned_hours, realized_feedback_hours, calculation_note)
values
  ('WL-SYNC', 'PROGRAM-DATA-LITERACY', 1, 'synchronous_or_face_to_face', 12, 12, 'SENTETİK eş zamanlı/yüz yüze çalışma'),
  ('WL-ASYNC', 'PROGRAM-DATA-LITERACY', 1, 'asynchronous_learning', 10, 9.5, 'SENTETİK asenkron çalışma'),
  ('WL-READ', 'PROGRAM-DATA-LITERACY', 1, 'preparation_and_reading', 12, 13, 'SENTETİK hazırlık ve okuma'),
  ('WL-LAB', 'PROGRAM-DATA-LITERACY', 1, 'practice_or_laboratory', 12, 11, 'SENTETİK uygulama/laboratuvar'),
  ('WL-PROJECT', 'PROGRAM-DATA-LITERACY', 1, 'project_assignment_portfolio', 16, 17, 'SENTETİK proje/ödev/portfolyo'),
  ('WL-INDEPENDENT', 'PROGRAM-DATA-LITERACY', 1, 'independent_study', 10, 9, 'SENTETİK bağımsız çalışma'),
  ('WL-ASSESSMENT', 'PROGRAM-DATA-LITERACY', 1, 'assessment', 6, 6, 'SENTETİK ölçme ve değerlendirme'),
  ('WL-FEEDBACK', 'PROGRAM-DATA-LITERACY', 1, 'feedback_and_revision', 4.5, 5, 'SENTETİK geri bildirim ve düzeltme')
on conflict (id) do update set
  planned_hours = excluded.planned_hours,
  realized_feedback_hours = excluded.realized_feedback_hours,
  calculation_note = excluded.calculation_note;

insert into public.pilot_directive_terms
  (id, academic_period_label, starts_on, ends_on, application_opens_at, application_closes_at, status)
values
  ('TERM-2026-FALL-SIM', '2026-2027 Güz — SENTETİK', '2026-09-14', '2027-01-15', '2026-08-20T08:00:00Z', '2026-08-31T14:00:00Z', 'planned')
on conflict (id) do update set status = excluded.status;

insert into public.pilot_directive_offerings
  (id, program_id, program_version_no, term_id, capacity, reserved_capacity, status)
values
  ('OFF-DATA-2026-FALL', 'PROGRAM-DATA-LITERACY', 1, 'TERM-2026-FALL-SIM', 1, 0, 'open_for_simulation')
on conflict (id) do update set capacity = excluded.capacity, status = excluded.status;

insert into public.pilot_directive_enrollment_queue
  (id, offering_id, synthetic_learner_ref, requested_at, idempotency_key, queue_position, result_state)
values
  ('QUEUE-001', 'OFF-DATA-2026-FALL', 'SENTETIK-OGRENEN-001', '2026-08-20T10:00:00Z', 'SIM-ENROLL-001', 1, 'accepted_simulation'),
  ('QUEUE-002', 'OFF-DATA-2026-FALL', 'SENTETIK-OGRENEN-002', '2026-08-20T10:00:00Z', 'SIM-ENROLL-002', 2, 'waitlisted_simulation')
on conflict (id) do update set result_state = excluded.result_state;

insert into public.pilot_directive_recognition_cases
  (id, case_reference, synthetic_holder_ref, provider_name, awarding_body_name, credential_fingerprint, requested_ects, requested_course_code, online_delivery, status)
values
  ('REC-CASE-001', 'SENTETIK-TANIMA-2026-001', 'SENTETIK-OGRENEN-001', 'SENTETİK dış sağlayıcı', 'SENTETİK awarding body', 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 2.5, 'SEC-2XX', true, 'appeal_open')
on conflict (id) do update set status = excluded.status;

insert into public.pilot_directive_recognition_checks
  (id, case_id, check_type, result, rationale, evidence_summary)
values
  ('REC-CHECK-PROVIDER', 'REC-CASE-001', 'provider_and_awarding_body', 'human_review', 'Sağlayıcı ve belge düzenleyen kuruluş ayrımı insan incelemesine yönlendirildi.', 'SENTETİK kamu üst verisi'),
  ('REC-CHECK-OUTCOME', 'REC-CASE-001', 'learning_outcome_match', 'human_review', 'Çıktı eşleşmesi yalnız fiil değil nesne, bağlam, karmaşıklık ve kanıtla değerlendirildi.', 'SENTETİK çıktı matrisi'),
  ('REC-CHECK-PROCTOR', 'REC-CASE-001', 'proctoring', 'additional_evidence_required', 'Çevrim içi sunum otomatik ret değildir; gözetim kanıtı ayrıca istenir.', 'SENTETİK sınav açıklaması'),
  ('REC-CHECK-ORIGINALITY', 'REC-CASE-001', 'originality', 'human_review', 'Özgün proje ve sözlü savunma alternatifleri risk temelli incelenir.', 'SENTETİK portfolyo özeti'),
  ('REC-CHECK-DOUBLE', 'REC-CASE-001', 'double_counting', 'pass', 'Aynı belge ve hedef yükümlülük için önceki sayım bulunmadı.', 'SENTETİK hash karşılaştırması')
on conflict (id) do update set result = excluded.result, rationale = excluded.rationale;

insert into public.pilot_directive_recognition_decisions
  (id, case_id, decision_type, decision_round, outcome, recognized_ects, substituted_course_code, deciding_body, rationale, decision_rule_snapshot, appeal_path, decided_at)
values
  ('REC-DEC-CREDENTIAL', 'REC-CASE-001', 'credential_verification_or_recognition', 1, 'additional_evidence_required', null, null, 'SENTETİK Birim Komisyonu', 'Belge doğrulama kararı kurumsal kural doğrulaması bulunmadığından ek kanıt aşamasında tutuldu.', '{"rule_version":"DIR-DPU-MY-2026-DRAFT","automatic":false,"institutional_validation_confirmed":false}', 'Bağımsız üst inceleme — SENTETİK', '2026-08-20T11:00:00Z'),
  ('REC-DEC-ECTS', 'REC-CASE-001', 'ects_credit_recognition', 1, 'deferred', null, null, 'SENTETİK Birim Komisyonu', 'Kredi kararı kurumsal sınırların payda ve yorum doğrulaması tamamlanıncaya kadar ertelendi.', '{"rule_version":"DIR-DPU-MY-2026-DRAFT","automatic":false,"institutional_validation_confirmed":false}', 'Bağımsız üst inceleme — SENTETİK', '2026-08-20T11:05:00Z'),
  ('REC-DEC-COURSE', 'REC-CASE-001', 'course_or_requirement_substitution', 1, 'rejected', null, 'SEC-2XX', 'SENTETİK Birim Komisyonu', 'Belgenin tanınması belirli ders yerine sayılmayı kendiliğinden doğurmadı.', '{"rule_version":"DIR-DPU-MY-2026-DRAFT","automatic":false}', 'Bağımsız üst inceleme — SENTETİK', '2026-08-20T11:10:00Z')
on conflict (id) do update set
  outcome = excluded.outcome,
  recognized_ects = excluded.recognized_ects,
  rationale = excluded.rationale;

insert into public.pilot_directive_recognition_appeals
  (id, original_decision_id, original_deciding_body, appellate_body, synthetic_appellant_ref, filed_at, grounds, status)
values
  ('REC-APPEAL-001', 'REC-DEC-COURSE', 'SENTETİK Birim Komisyonu', 'SENTETİK Eğitim-Öğretim Komisyonu', 'SENTETIK-OGRENEN-001', '2026-08-20T12:00:00Z', 'Ders çıktısı eşleşmesinin bağımsız kurulca yeniden incelenmesi talebi.', 'independent_review')
on conflict (id) do update set status = excluded.status;

insert into public.pilot_directive_double_counting_registry
  (id, synthetic_holder_ref, credential_fingerprint, target_program_key, target_requirement_key, recognition_case_id, record_status)
values
  ('DOUBLE-COUNT-001', 'SENTETIK-OGRENEN-001', 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'SENTETIK-LISANS-240', 'SEC-2XX', 'REC-CASE-001', 'reserved_for_review')
on conflict (id) do update set record_status = excluded.record_status;

insert into public.pilot_directive_commission_meetings
  (id, meeting_reference, body_unit_id, scheduled_at, quorum_required, present_voters, status)
values
  ('MEETING-001', 'SENTETIK-TOPLANTI-2026-08-20', 'UNIT-MYKOM', '2026-08-20T09:00:00Z', 2, 2, 'quorum_recorded')
on conflict (id) do update set present_voters = excluded.present_voters, status = excluded.status;

insert into public.pilot_directive_meeting_participants
  (meeting_id, membership_id, present, conflict_declared, recused, voting_eligible, conflict_note)
values
  ('MEETING-001', 'MEM-COMM-CHAIR', true, false, false, true, null),
  ('MEETING-001', 'MEM-COMM-MEMBER', true, true, true, false, 'SENTETİK çıkar çatışması; üye çekildi ve oy kullanamaz.'),
  ('MEETING-001', 'MEM-COMM-MEMBER-2', true, false, false, true, null)
on conflict (meeting_id, membership_id) do update set
  present = excluded.present,
  conflict_declared = excluded.conflict_declared,
  recused = excluded.recused,
  voting_eligible = excluded.voting_eligible,
  conflict_note = excluded.conflict_note;

insert into public.pilot_directive_commission_votes
  (id, meeting_id, membership_id, vote_allowed, resolution_key, vote, recorded_at)
values
  ('VOTE-001', 'MEETING-001', 'MEM-COMM-CHAIR', true, 'RES-PROGRAM-DATA-001', 'approve', '2026-08-20T09:30:00Z'),
  ('VOTE-002', 'MEETING-001', 'MEM-COMM-MEMBER-2', true, 'RES-PROGRAM-DATA-001', 'approve', '2026-08-20T09:31:00Z')
on conflict (id) do update set vote = excluded.vote;

insert into public.pilot_directive_commission_resolutions
  (id, meeting_id, resolution_key, subject_type, subject_reference, decision_stage, outcome, rationale, quorum_snapshot, independent_review_confirmed)
values
  ('RESOLUTION-001', 'MEETING-001', 'RES-PROGRAM-DATA-001', 'program_version', 'PROGRAM-DATA-LITERACY:1', 'first_instance', 'deferred', 'SENTETİK öneri, kurumsal kural doğrulaması bulunmadığından komisyon kaydında ertelendi.', '{"required":2,"present":2,"recused":1,"institutional_validation_required":true,"institutional_validation_confirmed":false}', false)
on conflict (id) do update set outcome = excluded.outcome, rationale = excluded.rationale;

insert into public.pilot_directive_credentials
  (id, public_document_id, holder_internal_ref, holder_display_masked, credential_title, issuing_country_or_region, awarding_body, issue_date, learning_outcomes, learner_workload_hours, pedagogical_reference_level, participation_form, assessment_type, quality_assurance_basis, program_id, program_version_no, status)
values
  ('CRED-V2-001', 'MYD-VERIFY-A1B2C3D4E5F6', 'SENTETIK-OGRENEN-001', 'Ö***** Ö*****', 'Veri Okuryazarlığı Mikro Yeterliliği — SENTETİK', 'Türkiye', 'Kütahya Dumlupınar Üniversitesi — SENTETİK PİLOT', '2026-08-20', '["Veri problemini kanıta dayalı analiz eder"]', 82.5, 6, 'Hibrit — SENTETİK', 'Proje, rubrik ve sözlü savunma — SENTETİK', 'İnsan incelemeli PUKÖ pilot kaydı; resmî TYÇ yerleştirmesi değildir.', 'PROGRAM-DATA-LITERACY', 1, 'issued_simulation'),
  ('CRED-V2-REVOKED', 'MYD-VERIFY-Z9Y8X7W6V5U4', 'SENTETIK-OGRENEN-002', 'A***** D*****', 'Veri Okuryazarlığı Mikro Yeterliliği — İPTAL SİMÜLASYONU', 'Türkiye', 'Kütahya Dumlupınar Üniversitesi — SENTETİK PİLOT', '2026-08-19', '["Veri problemini kanıta dayalı analiz eder"]', 82.5, 6, 'Hibrit — SENTETİK', 'Proje, rubrik ve sözlü savunma — SENTETİK', 'İptal/doğrulama akışını sınayan sentetik kayıt.', 'PROGRAM-DATA-LITERACY', 1, 'revoked_simulation')
on conflict (id) do update set status = excluded.status, public_verification_enabled = true;

insert into public.pilot_directive_credential_revocations
  (id, credential_id, revoked_at, reason, authorized_body)
values
  ('REVOCATION-001', 'CRED-V2-REVOKED', '2026-08-20T12:20:00Z', 'Belge iptal ve kamu doğrulama davranışını sınayan sentetik pilot nedeni.', 'SENTETİK yetkili kurul')
on conflict (id) do update set reason = excluded.reason, revoked_at = excluded.revoked_at;

insert into public.pilot_directive_verification_events
  (id, credential_id, viewed_at, requester_class, verification_result, disclosed_fields)
values
  ('VERIFY-EVENT-001', 'CRED-V2-001', '2026-08-20T12:30:00Z', 'public_anonymous', 'valid_simulation', '["public_document_id","credential_title","awarding_body","issue_date","status"]'),
  ('VERIFY-EVENT-REVOKED', 'CRED-V2-REVOKED', '2026-08-20T12:31:00Z', 'public_anonymous', 'revoked_simulation', '["public_document_id","credential_title","awarding_body","issue_date","status"]')
on conflict (id) do update set verification_result = excluded.verification_result;

insert into public.pilot_directive_award_states
  (id, synthetic_holder_ref, program_id, program_version_no, completion_status, badge_status, credential_status, ects_recognition_status, course_substitution_status, state_rationale)
values
  ('AWARD-STATE-001', 'SENTETIK-OGRENEN-001', 'PROGRAM-DATA-LITERACY', 1, 'completed_simulation', 'issued_simulation', 'issued_simulation', 'not_recognized', 'not_substituted', '{"badge_and_credential":"achievement_recorded","ects":"separate_human_decision_not_granted","course_substitution":"separate_human_decision_not_granted"}')
on conflict (id) do update set
  badge_status = excluded.badge_status,
  ects_recognition_status = excluded.ects_recognition_status,
  course_substitution_status = excluded.course_substitution_status;

insert into public.pilot_directive_quality_reviews
  (id, program_id, program_version_no, review_type, pdca_stage, planned_at, completed_at, evidence_summary, review_outcome, next_review_on)
values
  ('QUALITY-REVIEW-001', 'PROGRAM-DATA-LITERACY', 1, 'initial_quality_gate', 'check', '2026-08-20', '2026-08-20', '{"workload_feedback":"captured","learning_outcome_alignment":"human_reviewed","accessibility":"manual_review_required"}', 'improvement_required', '2027-02-20')
on conflict (id) do update set review_outcome = excluded.review_outcome, next_review_on = excluded.next_review_on;

insert into public.pilot_directive_sunset_plans
  (id, program_id, program_version_no, decision_reference, enrollment_closes_on, teach_out_ends_on, remaining_synthetic_learners, credential_correction_until, status)
values
  ('SUNSET-001', 'PROGRAM-DATA-LITERACY', 1, 'SENTETIK-SUNSET-PLAN', '2027-01-31', '2027-06-30', 2, '2027-12-31', 'planned')
on conflict (id) do update set status = excluded.status;

insert into public.pilot_directive_finance_cases
  (id, program_id, program_version_no, synthetic_instructor_ref, teaching_hours, workload_approval_status, budget_approval_status, payment_eligibility_status, estimated_amount, idempotency_key)
values
  ('FINANCE-CASE-001', 'PROGRAM-DATA-LITERACY', 1, 'SENTETIK-EGITICI-001', 12, 'pending_personnel_validation', 'pending_financial_validation', 'not_evaluated', 0, 'SIM-FINANCE-001')
on conflict (id) do update set
  workload_approval_status = excluded.workload_approval_status,
  budget_approval_status = excluded.budget_approval_status,
  estimated_amount = 0,
  payment_executed = false,
  invoice_created = false;

insert into public.pilot_directive_rule_evaluations
  (id, rule_parameter_id, subject_type, subject_reference, evaluation_result, observed_value, calculated_limit, rationale, rule_snapshot, evaluated_at)
values
  ('RULE-EVAL-6-ECTS', 'RULE-TERM-FIVE-ECTS', 'program_version', 'PROGRAM-EDGE-6-ECTS', 'manual_block_pending_validation', 6, 5, '6 AKTS program için kısmi tanıma/istisna kararı olmadan otomatik ret verilmedi.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:00:00Z'),
  ('RULE-EVAL-120', 'RULE-CREDIT-TEN-PERCENT', 'program_version', 'SENTETIK-ONLISANS-120', 'warning', 12, 12, '120 AKTS paydası için yalnız hesap önizlemesi; program türü doğrulanmalıdır.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:01:00Z'),
  ('RULE-EVAL-240', 'RULE-CREDIT-TEN-PERCENT', 'program_version', 'SENTETIK-LISANS-240', 'warning', 24, 24, '240 AKTS paydası için yalnız hesap önizlemesi; Senato yorumu beklenir.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:02:00Z'),
  ('RULE-EVAL-REMOTE-SINGLE', 'RULE-REMOTE-FIFTY-PERCENT', 'recognition_case', 'SENTETIK-TEK-UZAKTAN', 'warning', 100, 50, 'Tek uzaktan mikro-yeterlilik sunum biçimi nedeniyle otomatik reddedilmedi; risk ve kanıt incelemesi istendi.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:03:00Z'),
  ('RULE-EVAL-HYBRID', 'RULE-REMOTE-FIFTY-PERCENT', 'program_version', 'PROGRAM-DATA-LITERACY:1', 'warning', 40, 50, 'Hibrit program oranı yalnız önizlendi; senkron/asenkron paydanın kurumsal yorumu beklenir.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:04:00Z'),
  ('RULE-EVAL-PARTIAL', 'RULE-TERM-FIVE-ECTS', 'recognition_case', 'REC-CASE-001', 'pass', 1.5, 5, 'Kısmi 1,5 AKTS tanıma ayrı insan kararı olarak kaydedildi; belge ve ders yerine sayma kararına karıştırılmadı.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:05:00Z'),
  ('RULE-EVAL-GRADUATE', 'RULE-SEMESTER-THREE-EIGHT', 'enrollment_queue', 'SENTETIK-MEZUN-DURUM', 'not_applicable', 9, 8, 'Mezun durumundaki kişi için 3–8 dönem kuralı otomatik uygulanmadı; kurumsal karar gerektirir.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:06:00Z'),
  ('RULE-EVAL-ASSOCIATE', 'RULE-SEMESTER-THREE-EIGHT', 'enrollment_queue', 'SENTETIK-ONLISANS-DONEM-2', 'warning', 2, 3, 'Önlisans için dönem kuralının uygulanabilirliği doğrulanmadan nihai blok verilmedi.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:07:00Z'),
  ('RULE-EVAL-GRADUATE-STUDY', 'RULE-SEMESTER-THREE-EIGHT', 'enrollment_queue', 'SENTETIK-LISANSUSTU-DONEM-1', 'not_applicable', 1, 3, 'Lisansüstü program için 3–8 dönem hükmü otomatik genellenmedi.', '{"institutional_validation_required":true,"automatic_final_decision":false}', '2026-08-20T13:08:00Z')
on conflict (id) do update set evaluation_result = excluded.evaluation_result, rationale = excluded.rationale;

insert into public.pilot_directive_audit_events
  (id, aggregate_type, aggregate_id, event_type, actor_ref, source_version, event_payload, correlation_id, idempotency_key, occurred_at)
values
  ('AUDIT-DIR-001', 'program_version', 'PROGRAM-DATA-LITERACY:1', 'directive_contract_evaluated', 'SENTETIK-ROL-COORDINATOR', 'DIR-DPU-MY-2026-DRAFT', '{"result":"simulation_ready","production":false,"live_requests":false}', 'SIM-CORR-001', 'SIM-AUDIT-001', '2026-08-20T14:00:00Z')
on conflict (id) do update set event_payload = excluded.event_payload;

insert into public.pilot_directive_outbox
  (id, audit_event_id, destination_system, payload, idempotency_key)
values
  ('OUTBOX-OBS-001', 'AUDIT-DIR-001', 'OBS_DRY_RUN', '{"action":"transcript_preview","executed":false,"contains_personal_data":false}', 'SIM-OUTBOX-001')
on conflict (id) do update set
  payload = excluded.payload,
  delivery_status = 'dry_run_only',
  live_dispatch_enabled = false,
  dispatched_at = null;

-- RLS and explicit Data API grants. The 2026 Data API default no longer
-- guarantees automatic grants; every permission is declared here.
alter table public.pilot_directive_source_registry enable row level security;
alter table public.pilot_directive_source_registry force row level security;
revoke all on table public.pilot_directive_source_registry from public, anon, authenticated;
grant select on table public.pilot_directive_source_registry to anon, authenticated;
drop policy if exists pilot_directive_source_public_read on public.pilot_directive_source_registry;
create policy pilot_directive_source_public_read on public.pilot_directive_source_registry
for select to anon, authenticated
using (public_reference and not production_allowed and not real_system_effect);

do $security$
declare
  table_name text;
begin
  foreach table_name in array array[
    'pilot_directive_versions',
    'pilot_directive_rule_parameters',
    'pilot_directive_decision_register',
    'pilot_directive_units',
    'pilot_directive_body_memberships',
    'pilot_directive_programs',
    'pilot_directive_program_versions',
    'pilot_directive_workload_items',
    'pilot_directive_terms',
    'pilot_directive_offerings',
    'pilot_directive_enrollment_queue',
    'pilot_directive_recognition_cases',
    'pilot_directive_recognition_checks',
    'pilot_directive_recognition_decisions',
    'pilot_directive_recognition_appeals',
    'pilot_directive_double_counting_registry',
    'pilot_directive_commission_meetings',
    'pilot_directive_meeting_participants',
    'pilot_directive_commission_votes',
    'pilot_directive_commission_resolutions',
    'pilot_directive_credentials',
    'pilot_directive_credential_revocations',
    'pilot_directive_verification_events',
    'pilot_directive_award_states',
    'pilot_directive_quality_reviews',
    'pilot_directive_sunset_plans',
    'pilot_directive_finance_cases',
    'pilot_directive_rule_evaluations',
    'pilot_directive_audit_events',
    'pilot_directive_outbox'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select on table public.%I to anon, authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_synthetic_read', table_name);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (is_synthetic = true and institutional_validation_required = true and production_allowed = false and real_system_effect = false)',
      table_name || '_synthetic_read', table_name
    );
  end loop;
end
$security$;

-- Security-invoker views expose only minimum pilot DTOs. They never bypass RLS.
create or replace view public.pilot_directive_policy_catalog
with (security_invoker = true)
as
select
  v.id,
  v.document_type,
  v.version_label,
  v.title,
  v.status,
  v.legal_counsel_validation_status,
  v.institutional_validation_required,
  v.production_allowed,
  s.source_key,
  s.source_url,
  s.verification_status
from public.pilot_directive_versions v
join public.pilot_directive_source_registry s on s.id = v.source_id
where v.public_summary_allowed and v.is_synthetic and not v.real_system_effect and not v.production_allowed;

create or replace view public.pilot_directive_rule_catalog
with (security_invoker = true)
as
select
  id,
  directive_version_id,
  rule_key,
  version_no,
  source_clause,
  effective_from,
  effective_to,
  program_type,
  calculation_basis,
  numerator,
  denominator,
  rounding_rule,
  exception_rule,
  interpretation_note,
  enforcement_mode,
  institutional_validation_required
from public.pilot_directive_rule_parameters
where is_synthetic and institutional_validation_required and not production_allowed and not real_system_effect;

create or replace view public.pilot_directive_governance_catalog
with (security_invoker = true)
as
select
  m.id,
  m.unit_id,
  u.unit_name,
  u.unit_type,
  m.body_type,
  m.synthetic_actor_ref,
  m.role_key,
  m.membership_role,
  m.mandate_from,
  m.mandate_to,
  m.decision_scope,
  m.may_vote,
  m.may_make_academic_decision,
  m.may_make_financial_decision,
  m.system_admin_restriction,
  m.institutional_validation_required
from public.pilot_directive_body_memberships m
join public.pilot_directive_units u on u.id = m.unit_id
where m.is_synthetic and u.is_synthetic and not m.production_allowed and not m.real_system_effect;

create or replace view public.pilot_directive_program_compliance_catalog
with (security_invoker = true)
as
select
  p.id as program_id,
  p.myd_code,
  p.title,
  p.program_type,
  v.version_no,
  v.version_label,
  v.ects,
  v.total_learner_workload_hours,
  coalesce(sum(w.planned_hours), 0)::numeric(6,1) as workload_component_total,
  (v.total_learner_workload_hours >= 25 * v.ects and v.total_learner_workload_hours <= 30 * v.ects) as ects_band_valid,
  (coalesce(sum(w.planned_hours), 0) = v.total_learner_workload_hours) as component_sum_valid,
  count(w.id)::integer as workload_component_count,
  v.delivery_mode,
  v.pedagogical_reference_level,
  v.level_claim_status,
  v.status,
  v.institutional_validation_required
from public.pilot_directive_programs p
join public.pilot_directive_program_versions v on v.program_id = p.id
left join public.pilot_directive_workload_items w on w.program_id = v.program_id and w.program_version_no = v.version_no
where p.is_synthetic and v.is_synthetic and not p.production_allowed and not v.production_allowed
group by p.id, p.myd_code, p.title, p.program_type, v.version_no, v.version_label, v.ects,
  v.total_learner_workload_hours, v.delivery_mode, v.pedagogical_reference_level,
  v.level_claim_status, v.status, v.institutional_validation_required;

create or replace view public.pilot_directive_recognition_catalog
with (security_invoker = true)
as
select
  c.id as case_id,
  c.case_reference,
  c.provider_name,
  c.awarding_body_name,
  c.requested_ects,
  c.requested_course_code,
  c.online_delivery,
  d.id as decision_id,
  d.decision_type,
  d.decision_round,
  d.outcome,
  d.recognized_ects,
  d.substituted_course_code,
  d.deciding_body,
  d.rationale,
  d.appeal_path,
  exists(select 1 from public.pilot_directive_recognition_appeals a where a.original_decision_id = d.id) as appeal_recorded,
  d.institutional_validation_required,
  d.institutional_validation_confirmed
from public.pilot_directive_recognition_cases c
join public.pilot_directive_recognition_decisions d on d.case_id = c.id
where c.is_synthetic and d.is_synthetic and not c.production_allowed and not d.production_allowed;

create or replace view public.pilot_directive_commission_catalog
with (security_invoker = true)
as
select
  m.id as meeting_id,
  m.meeting_reference,
  m.quorum_required,
  m.present_voters,
  m.quorum_met,
  r.id as resolution_id,
  r.resolution_key,
  r.subject_type,
  r.subject_reference,
  r.decision_stage,
  r.outcome,
  r.rationale,
  r.independent_review_confirmed,
  count(distinct v.id)::integer as recorded_vote_count,
  count(distinct p.membership_id) filter (where p.vote_allowed)::integer as eligible_voter_count,
  (m.present_voters = count(distinct p.membership_id) filter (where p.vote_allowed)) as quorum_integrity_valid,
  count(distinct p.membership_id) filter (where p.conflict_declared)::integer as conflict_count,
  count(distinct p.membership_id) filter (where p.recused)::integer as recusal_count,
  r.institutional_validation_required,
  r.institutional_validation_confirmed
from public.pilot_directive_commission_meetings m
join public.pilot_directive_commission_resolutions r on r.meeting_id = m.id
left join public.pilot_directive_meeting_participants p on p.meeting_id = m.id
left join public.pilot_directive_commission_votes v on v.meeting_id = m.id and v.resolution_key = r.resolution_key
where m.is_synthetic and r.is_synthetic and not m.production_allowed and not r.production_allowed
group by m.id, m.meeting_reference, m.quorum_required, m.present_voters, m.quorum_met,
  r.id, r.resolution_key, r.subject_type, r.subject_reference, r.decision_stage,
  r.outcome, r.rationale, r.independent_review_confirmed, r.institutional_validation_required,
  r.institutional_validation_confirmed;

create or replace view public.pilot_directive_credential_public_catalog
with (security_invoker = true)
as
select
  public_document_id,
  holder_display_masked,
  credential_title,
  issuing_country_or_region,
  awarding_body,
  issue_date,
  learning_outcomes,
  learner_workload_hours,
  learner_workload_unit,
  pedagogical_reference_level,
  level_status,
  participation_form,
  assessment_type,
  quality_assurance_basis,
  status,
  expires_on,
  institutional_validation_required,
  false as official_tyc_placement_claim,
  false as real_credential
from public.pilot_directive_credentials
where is_synthetic and public_verification_enabled and not production_allowed and not real_system_effect;

create or replace view public.pilot_directive_award_state_catalog
with (security_invoker = true)
as
select
  id,
  synthetic_holder_ref,
  program_id,
  program_version_no,
  completion_status,
  badge_status,
  credential_status,
  ects_recognition_status,
  course_substitution_status,
  state_rationale,
  institutional_validation_required
from public.pilot_directive_award_states
where is_synthetic and not production_allowed and not real_system_effect;

create or replace view public.pilot_directive_quality_finance_catalog
with (security_invoker = true)
as
select
  q.id as quality_review_id,
  q.program_id,
  q.program_version_no,
  q.review_type,
  q.pdca_stage,
  q.review_outcome,
  q.next_review_on,
  f.id as finance_case_id,
  f.workload_approval_status,
  f.budget_approval_status,
  f.payment_eligibility_status,
  f.estimated_amount,
  f.dry_run_only,
  f.payment_executed,
  f.invoice_created,
  q.institutional_validation_required
from public.pilot_directive_quality_reviews q
left join public.pilot_directive_finance_cases f
  on f.program_id = q.program_id and f.program_version_no = q.program_version_no
where q.is_synthetic and not q.production_allowed and not q.real_system_effect
  and (f.id is null or (f.is_synthetic and not f.production_allowed and not f.real_system_effect));

create or replace view public.pilot_directive_readiness_catalog
with (security_invoker = true)
as
select
  'directive-alignment-2026-08-20-1'::text as contract_version,
  (select count(*) from public.pilot_directive_rule_parameters)::integer as versioned_rule_count,
  (select count(*) from public.pilot_directive_body_memberships where role_key in ('learner','instructor','externalInstructor','coordinator','commission','studentAffairs','it','finance','admin'))::integer as role_membership_count,
  (select count(distinct role_key) from public.pilot_directive_body_memberships)::integer as distinct_role_count,
  (select count(*) from public.pilot_directive_workload_items where program_id = 'PROGRAM-DATA-LITERACY' and program_version_no = 1)::integer as workload_component_count,
  (select count(distinct decision_type) from public.pilot_directive_recognition_decisions where case_id = 'REC-CASE-001')::integer as recognition_decision_type_count,
  (select count(*) from public.pilot_directive_decision_register where status <> 'deferred_for_pilot')::integer as institutional_decision_count,
  (select bool_and(not production_allowed and not real_system_effect and institutional_validation_required) from public.pilot_directive_versions)::boolean as production_no_go,
  (select bool_and(not live_dispatch_enabled and delivery_status = 'dry_run_only' and dispatched_at is null) from public.pilot_directive_outbox)::boolean as integration_dry_run_only,
  (select bool_and(not payment_executed and not invoice_created and estimated_amount = 0) from public.pilot_directive_finance_cases)::boolean as finance_dry_run_only,
  true::boolean as synthetic_data_only,
  true::boolean as senate_approval_absent,
  'KURUMSAL DEĞERLENDİRME TASLAĞI — SENATO ONAYI YOKTUR — PRODUCTION NO-GO'::text as pilot_notice;

do $views$
declare
  view_name text;
begin
  foreach view_name in array array[
    'pilot_directive_policy_catalog',
    'pilot_directive_rule_catalog',
    'pilot_directive_governance_catalog',
    'pilot_directive_program_compliance_catalog',
    'pilot_directive_recognition_catalog',
    'pilot_directive_commission_catalog',
    'pilot_directive_credential_public_catalog',
    'pilot_directive_award_state_catalog',
    'pilot_directive_quality_finance_catalog',
    'pilot_directive_readiness_catalog'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', view_name);
    execute format('grant select on table public.%I to anon, authenticated', view_name);
  end loop;
end
$views$;

comment on table public.pilot_directive_rule_parameters is
  'Sürümlü, kaynak maddeli ve kurumsal doğrulama kapılı pilot kural parametreleri; kesin mevzuat hükmü değildir.';
comment on table public.pilot_directive_recognition_decisions is
  'Belge doğrulama/tanıma, AKTS kredi tanıma ve ders/yükümlülük yerine saymayı üç ayrı insan kararı olarak saklar.';
comment on table public.pilot_directive_credentials is
  'AB zorunlu mikro-yeterlilik alanlarını kanonik kayıtta tutan sentetik belge modeli; TCKN/YKN içermez.';
comment on view public.pilot_directive_credential_public_catalog is
  'Kamu doğrulama ekranı için asgari maskeli sentetik görünüm; holder_internal_ref alanını içermez.';
comment on view public.pilot_directive_readiness_catalog is
  'Yönerge uyarlaması için salt-okunur pilot sözleşme ve Production NO-GO özeti.';

commit;
