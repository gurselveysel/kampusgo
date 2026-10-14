-- REVIEW CANDIDATE ONLY. No constructor, HTTP route or production startup executes this DDL.
-- Tests install it exclusively in an empty in-process PGlite database.
CREATE TABLE myys_identity_key_barriers (
 tenant text NOT NULL,
 purpose text NOT NULL CHECK (purpose IN ('pkce','nonce')),
 key_version text NOT NULL,
 revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
 metadata jsonb NOT NULL,
 PRIMARY KEY (tenant,purpose,key_version),
 CHECK (jsonb_typeof(metadata) = 'object'),
 CHECK (metadata ?& ARRAY['tenant','purpose','version','algorithm','state','notBefore','notAfter','retiredAt','revision']),
 CHECK (metadata - ARRAY['tenant','purpose','version','algorithm','state','notBefore','notAfter','retiredAt','revision'] = '{}'::jsonb),
 CHECK (metadata->>'tenant' = tenant AND metadata->>'purpose' = purpose AND metadata->>'version' = key_version),
 CHECK (metadata->>'algorithm' = 'HMAC-SHA-256' AND metadata->>'state' IN ('active','retired','revoked')),
 CHECK (metadata->'revision' = to_jsonb(revision))
);
-- Provider current-version selection cannot silently leave two active versions.
CREATE UNIQUE INDEX myys_identity_one_active_key ON myys_identity_key_barriers (tenant,purpose)
 WHERE metadata->>'state' = 'active';
CREATE TABLE myys_identity_key_audit (
 change_id uuid PRIMARY KEY,
 tenant text NOT NULL,
 purpose text NOT NULL,
 key_version text NOT NULL,
 revision bigint NOT NULL,
 issuer text NOT NULL,
 audience text NOT NULL,
 operator_ref text NOT NULL,
 authority_digest text NOT NULL CHECK (authority_digest ~ '^[a-f0-9]{64}$'),
 recorded_at text NOT NULL,
 metadata jsonb NOT NULL,
 UNIQUE (tenant,purpose,key_version,revision),
 FOREIGN KEY (tenant,purpose,key_version) REFERENCES myys_identity_key_barriers (tenant,purpose,key_version)
);
