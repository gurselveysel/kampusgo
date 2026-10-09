import {readFile,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../data/reference.json',import.meta.url),'utf8'));
const rows=[];
for(const kind of ['sources','frameworks','levels','types','programs','outcomes','qualifications'])for(const p of data[kind])rows.push({id:`${kind}:${p.id}`,kind,payload:p,parent_id:p.frameworkId?`frameworks:${p.frameworkId}`:p.programId?`programs:${p.programId}`:null,source_id:p.sourceId?`sources:${p.sourceId}`:null});
rows.push({id:'metadata:gazi',kind:'metadata',payload:{version:data.version,scope:data.scope,policy:data.policy,coverage:data.coverage},parent_id:null,source_id:null});
const quote=v=>v===null?'null':"'"+String(v).replaceAll("'","''")+"'";
const sql=`create table public.gazi_reference_records (
 id text primary key, kind text not null check (kind in ('sources','frameworks','levels','types','programs','outcomes','qualifications','metadata')),
 revision text not null, payload jsonb not null check (jsonb_typeof(payload)='object'),
 parent_id text references public.gazi_reference_records(id) deferrable initially deferred,
 source_id text references public.gazi_reference_records(id) deferrable initially deferred,
 published boolean not null default false, updated_at timestamptz not null default now()
);
create index gazi_reference_kind_idx on public.gazi_reference_records(kind);
create index gazi_reference_parent_idx on public.gazi_reference_records(parent_id);
create index gazi_reference_source_idx on public.gazi_reference_records(source_id);
alter table public.gazi_reference_records enable row level security;
revoke all on public.gazi_reference_records from public, anon, authenticated;
grant select on public.gazi_reference_records to anon, authenticated;
create policy gazi_reference_public_read on public.gazi_reference_records for select to anon, authenticated using (published = true);
insert into public.gazi_reference_records(id,kind,revision,payload,parent_id,source_id,published) values\n`+rows.map(r=>`(${quote(r.id)},${quote(r.kind)},${quote(data.version)},${quote(JSON.stringify(r.payload))}::jsonb,${quote(r.parent_id)},${quote(r.source_id)},true)`).join(',\n')+';\n';
await writeFile(new URL('../database/reference-schema.sql',import.meta.url),sql);console.log(rows.length+' bağlı kaynak kaydı hazır.');
