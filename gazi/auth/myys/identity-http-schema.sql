-- Candidate schema only. No runtime module installs it; production migration is not authorized.
CREATE TABLE myys_identity_http_epochs (
 tenant TEXT NOT NULL, issuer TEXT NOT NULL, audience TEXT NOT NULL,
 revision BIGINT NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 key_digest TEXT NOT NULL CHECK(key_digest ~ '^[a-f0-9]{64}$'),
 policy_digest TEXT NOT NULL CHECK(policy_digest ~ '^[a-f0-9]{64}$'),
 origin TEXT NOT NULL, contract_digest TEXT NOT NULL CHECK(contract_digest ~ '^[a-f0-9]{64}$'),
 activated BIGINT NOT NULL CHECK(activated BETWEEN 0 AND 9007199254740991),
 PRIMARY KEY(tenant,issuer,audience)
);
CREATE TABLE myys_identity_http_history (
 id UUID PRIMARY KEY, tenant TEXT NOT NULL, issuer TEXT NOT NULL, audience TEXT NOT NULL,
 revision BIGINT NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 key_digest TEXT NOT NULL CHECK(key_digest ~ '^[a-f0-9]{64}$'),
 policy_digest TEXT NOT NULL CHECK(policy_digest ~ '^[a-f0-9]{64}$'),
 origin TEXT NOT NULL, contract_digest TEXT NOT NULL CHECK(contract_digest ~ '^[a-f0-9]{64}$'),
 limits JSONB NOT NULL CHECK(jsonb_typeof(limits)='object'),
 operator_ref TEXT NOT NULL, authority_digest TEXT NOT NULL CHECK(authority_digest ~ '^[a-f0-9]{64}$'),
 activated BIGINT NOT NULL CHECK(activated BETWEEN 0 AND 9007199254740991),
 UNIQUE(tenant,issuer,audience,revision), UNIQUE(tenant,issuer,audience,key_digest)
);
CREATE TABLE myys_identity_http_buckets (
 tenant TEXT NOT NULL, issuer TEXT NOT NULL, audience TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN('login','start','callback','session','logout','backchannel','academic-read','academic-write')),
 kind TEXT NOT NULL CHECK(kind IN('global','network','browser')),
 bucket TEXT NOT NULL CHECK(bucket ~ '^[a-f0-9]{64}$'),
 started BIGINT NOT NULL CHECK(started BETWEEN 0 AND 9007199254740991),
 ends BIGINT NOT NULL CHECK(ends>started AND ends<=9007199254740991),
 used INTEGER NOT NULL CHECK(used BETWEEN 1 AND 3600),
 PRIMARY KEY(tenant,issuer,audience,purpose,kind,bucket),
 FOREIGN KEY(tenant,issuer,audience) REFERENCES myys_identity_http_epochs(tenant,issuer,audience)
);
CREATE INDEX myys_identity_http_bucket_expiry ON myys_identity_http_buckets(tenant,issuer,audience,ends);
