-- REVIEW CANDIDATE ONLY; test fixture installs this in an empty PGlite database.
CREATE TABLE myys_identity_challenges (
 id uuid PRIMARY KEY,
 tenant text NOT NULL,
 issuer text NOT NULL,
 audience text NOT NULL,
 contract_digest text NOT NULL CHECK (contract_digest ~ '^[a-f0-9]{64}$'),
 state_hash text NOT NULL UNIQUE CHECK (state_hash ~ '^[a-f0-9]{64}$'),
 browser_hash text NOT NULL CHECK (browser_hash ~ '^[a-f0-9]{64}$'),
 context_digest text NOT NULL UNIQUE CHECK (context_digest ~ '^[a-f0-9]{64}$'),
 created text NOT NULL,
 expires text NOT NULL CHECK (expires > created),
 pkce_binding jsonb NOT NULL,
 nonce_binding jsonb NOT NULL,
 status text NOT NULL CHECK (status IN ('pending','claimed','used','failed','cancelled')),
 claimed_at text,
 finished_at text,
 CHECK (claimed_at IS NULL OR (claimed_at >= created AND claimed_at < expires)),
 CHECK (finished_at IS NULL OR (finished_at >= created AND (claimed_at IS NULL OR finished_at >= claimed_at))),
 CHECK ((status='pending' AND claimed_at IS NULL AND finished_at IS NULL)
  OR (status='claimed' AND claimed_at IS NOT NULL AND finished_at IS NULL)
  OR (status IN ('used','failed') AND claimed_at IS NOT NULL AND finished_at IS NOT NULL)
  OR (status='cancelled' AND finished_at IS NOT NULL))
);
CREATE INDEX myys_identity_challenge_browser ON myys_identity_challenges (browser_hash,status);
CREATE TABLE myys_identity_challenge_audit (
 id uuid PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES myys_identity_challenges(id),
 tenant text NOT NULL,
 issuer text NOT NULL,
 audience text NOT NULL,
 event text NOT NULL CHECK (event IN ('begin','claim','use','fail','cancel','deny')),
 recorded_at text NOT NULL,
 UNIQUE (request_id,event)
);
