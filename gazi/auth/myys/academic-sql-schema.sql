-- REVIEW CANDIDATE ONLY. Install explicitly in an empty isolated test database.
-- No production migration, provisioning, grant or RLS acceptance is implied.
CREATE TABLE public.myys_academic_records (
 position bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 tenant text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('program','publication','enrollment','evidence','assessment','decision','appeal','resolution')),
 id text NOT NULL,
 unit text NOT NULL,
 owner text NOT NULL REFERENCES public.myys_identity_persons(id),
 data jsonb NOT NULL CHECK (jsonb_typeof(data)='object' AND data ?& ARRAY['id','unit','owner','createdAt','createdBy']
  AND jsonb_typeof(data->'id')='string' AND jsonb_typeof(data->'unit')='string' AND jsonb_typeof(data->'owner')='string'
  AND jsonb_typeof(data->'createdAt')='string' AND jsonb_typeof(data->'createdBy')='string'
  AND data->>'id'=id AND data->>'unit'=unit AND data->>'owner'=owner),
 PRIMARY KEY (tenant,kind,id),
 FOREIGN KEY (tenant,owner,unit) REFERENCES public.myys_identity_memberships(tenant,person_id,unit)
);
CREATE INDEX myys_academic_records_order ON public.myys_academic_records(tenant,position);
CREATE TABLE public.myys_academic_commands (
 tenant text NOT NULL,
 person_id text NOT NULL REFERENCES public.myys_identity_persons(id),
 id text NOT NULL,
 action text NOT NULL CHECK (action IN ('program','publish','enroll','evidence','assess','decide','appeal','resolve')),
 digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
 result jsonb NOT NULL CHECK (jsonb_typeof(result)='object'),
 PRIMARY KEY (tenant,person_id,id)
);
CREATE TABLE public.myys_academic_audit (
 position bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant text NOT NULL,
 actor text NOT NULL REFERENCES public.myys_identity_persons(id),
 action text NOT NULL,
 record_id text NOT NULL,
 recorded_at text NOT NULL
);
CREATE FUNCTION public.myys_academic_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Academic history is append only' USING ERRCODE='55000'; END;
$$;
CREATE TRIGGER myys_academic_records_immutable BEFORE UPDATE OR DELETE ON public.myys_academic_records FOR EACH ROW EXECUTE FUNCTION public.myys_academic_immutable();
CREATE TRIGGER myys_academic_commands_immutable BEFORE UPDATE OR DELETE ON public.myys_academic_commands FOR EACH ROW EXECUTE FUNCTION public.myys_academic_immutable();
CREATE TRIGGER myys_academic_audit_immutable BEFORE UPDATE OR DELETE ON public.myys_academic_audit FOR EACH ROW EXECUTE FUNCTION public.myys_academic_immutable();

CREATE INDEX myys_academic_records_owner ON public.myys_academic_records(owner,tenant,unit);
CREATE INDEX myys_academic_records_membership ON public.myys_academic_records(tenant,owner,unit);
CREATE INDEX myys_academic_commands_person ON public.myys_academic_commands(person_id);
CREATE INDEX myys_academic_audit_actor ON public.myys_academic_audit(actor);
REVOKE ALL ON public.myys_academic_records,public.myys_academic_commands,public.myys_academic_audit FROM PUBLIC;
REVOKE ALL ON FUNCTION public.myys_academic_immutable() FROM PUBLIC;
