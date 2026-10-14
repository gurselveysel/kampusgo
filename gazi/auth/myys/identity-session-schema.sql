-- REVIEW CANDIDATE ONLY. Tests explicitly install in an empty PGlite database.
CREATE TABLE myys_identity_persons (
 id text PRIMARY KEY,
 issuer text NOT NULL,
 subject text NOT NULL,
 active boolean NOT NULL,
 revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
 UNIQUE (issuer,subject)
);
CREATE TABLE myys_identity_memberships (
 tenant text NOT NULL,
 person_id text NOT NULL REFERENCES myys_identity_persons(id),
 unit text NOT NULL,
 roles jsonb NOT NULL CHECK (jsonb_typeof(roles)='array' AND jsonb_array_length(roles)>0),
 active boolean NOT NULL,
 not_before text NOT NULL,
 expires text NOT NULL CHECK (expires>not_before),
 revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY (tenant,person_id,unit)
);
CREATE TABLE myys_identity_sessions (
 session_hash text PRIMARY KEY CHECK (session_hash ~ '^[a-f0-9]{64}$'),
 tenant text NOT NULL,
 issuer text NOT NULL,
 audience text NOT NULL,
 contract_digest text NOT NULL CHECK (contract_digest ~ '^[a-f0-9]{64}$'),
 contract_version text NOT NULL,
 person_id text NOT NULL REFERENCES myys_identity_persons(id),
 person_revision bigint NOT NULL,
 membership_digest text NOT NULL CHECK (membership_digest ~ '^[a-f0-9]{64}$'),
 parent_hash text NOT NULL CHECK (parent_hash ~ '^[a-f0-9]{64}$'),
 request_id uuid NOT NULL UNIQUE REFERENCES myys_identity_challenges(id),
 subject_hash text NOT NULL CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
 sid_hash text CHECK (sid_hash IS NULL OR sid_hash ~ '^[a-f0-9]{64}$'),
 issued bigint NOT NULL,
 authenticated bigint NOT NULL,
 mfa boolean NOT NULL,
 created text NOT NULL,
 expires text NOT NULL CHECK (expires>created),
 status text NOT NULL CHECK (status IN ('active','revoked')),
 revoked_at text,
 CHECK ((status='active' AND revoked_at IS NULL) OR (status='revoked' AND revoked_at>=created))
);
CREATE INDEX myys_identity_sessions_parent ON myys_identity_sessions(tenant,issuer,audience,parent_hash);
CREATE INDEX myys_identity_sessions_subject ON myys_identity_sessions(tenant,issuer,audience,subject_hash,sid_hash);
CREATE TABLE myys_identity_logout_receipts (
 tenant text NOT NULL,
 issuer text NOT NULL,
 audience text NOT NULL,
 jti_hash text NOT NULL CHECK (jti_hash ~ '^[a-f0-9]{64}$'),
 digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
 subject_hash text,
 sid_hash text,
 issued bigint NOT NULL,
 expires bigint NOT NULL CHECK (expires>issued),
 received text NOT NULL,
 PRIMARY KEY (tenant,issuer,audience,jti_hash),
 CHECK ((subject_hash IS NOT NULL OR sid_hash IS NOT NULL)
  AND (subject_hash IS NULL OR subject_hash ~ '^[a-f0-9]{64}$')
  AND (sid_hash IS NULL OR sid_hash ~ '^[a-f0-9]{64}$'))
);
CREATE TABLE myys_identity_session_audit (
 id uuid PRIMARY KEY,
 tenant text NOT NULL,
 issuer text NOT NULL,
 audience text NOT NULL,
 actor_ref text NOT NULL,
 event text NOT NULL CHECK (event IN ('person','membership','accept','logout','backchannel')),
 record_ref text NOT NULL,
 authority_digest text CHECK (authority_digest IS NULL OR authority_digest ~ '^[a-f0-9]{64}$'),
 recorded_at text NOT NULL
);
