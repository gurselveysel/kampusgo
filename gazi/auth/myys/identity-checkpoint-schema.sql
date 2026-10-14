-- REVIEW CANDIDATE ONLY. Explicit empty test database installation; never runtime DDL.
CREATE TABLE myys_identity_checkpoint_head (
 singleton BOOLEAN PRIMARY KEY CHECK(singleton),
 journal_id UUID NOT NULL,
 profile TEXT NOT NULL CHECK(profile IN ('myys-sql-identity-checkpoint/1','myys-sql-identity-academic-checkpoint/1')),
 fence BIGINT NOT NULL CHECK(fence BETWEEN 1 AND 9007199254740991),
 operation_id UUID NOT NULL,
 state_digest TEXT NOT NULL CHECK(state_digest ~ '^[a-f0-9]{64}$')
);
