// TOKEN_DIGEST is a SHA-256 verifier, never the server credential itself.
const TOKEN_DIGEST='__TOKEN_DIGEST__';
const hex=(v:ArrayBuffer)=>[...new Uint8Array(v)].map(x=>x.toString(16).padStart(2,'0')).join('');
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const isHash=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'Reddedildi'},405);
 const token=req.headers.get('x-gazi-gateway')||'';
 if(token.length!==64||hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))!==TOKEN_DIGEST)return reply({error:'Reddedildi'},401);
 const raw=await req.text();if(raw.length>64000)return reply({error:'Reddedildi'},413);
 try{
  const b=JSON.parse(raw);if(!['production','preview'].includes(b.scope))return reply({error:'Reddedildi'},400);
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db=async(path:string,method='POST',body?:unknown)=>{
   const r=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(6000)});
   if(!r.ok)throw new Error('store');return r.status===204?null:await r.json();
  };
  if(b.action==='limit'&&isHash(b.ip))return reply({allowed:await db('rpc/gazi_gate_allow_attempt','POST',{p_scope:b.scope,p_ip:b.ip})});
  if(b.action==='consume'&&isHash(b.hash)&&Number.isSafeInteger(b.step))return reply({expires:await db('rpc/gazi_gate_consume','POST',{p_scope:b.scope,p_step:b.step,p_hash:b.hash})});
  if(b.action==='session'&&isHash(b.hash)){
   const rows=await db('gazi_gate_sessions?token_hash=eq.'+b.hash+'&scope=eq.'+b.scope+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=expires_at','GET');
   return reply({expires:rows[0]?.expires_at??null});
  }
  if(b.action==='logout'&&isHash(b.hash)){await db('gazi_gate_sessions?token_hash=eq.'+b.hash+'&scope=eq.'+b.scope,'DELETE');return reply({ok:true});}
  if(b.action==='badge_status'){
   const rows=await db('gazi_badge_records?scope=eq.'+b.scope+'&revoked_at=not.is.null&select=status_index&order=status_index.asc&limit=1000','GET');
   // Explicit paging prevents the Data API's row cap from truncating revocations.
   let indices=rows.map((r:any)=>r.status_index),offset=rows.length;
   while(rows.length&&offset%1000===0){const page=await db('gazi_badge_records?scope=eq.'+b.scope+'&revoked_at=not.is.null&select=status_index&order=status_index.asc&limit=1000&offset='+offset,'GET');indices.push(...page.map((r:any)=>r.status_index));offset+=page.length;if(page.length<1000)break;}
   return reply({indices});
  }
  if(typeof b.action==='string'&&b.action.startsWith('badge_')){
   if(!isHash(b.hash))return reply({error:'Reddedildi'},401);
   const sessions=await db('gazi_gate_sessions?token_hash=eq.'+b.hash+'&scope=eq.'+b.scope+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=expires_at','GET');
   if(!sessions.length)return reply({error:'Reddedildi'},401);
   const base='gazi_badge_records?scope=eq.'+b.scope;
   const validId=(id:unknown)=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
   const unpack=(r:any)=>r?{...r.record,revoked_at:r.revoked_at,digest:r.digest}:null;
   if(b.action==='badge_limit')return reply({allowed:await db('rpc/gazi_badge_allow_attempt','POST',{p_scope:b.scope,p_hash:b.hash})});
   if(b.action==='badge_index')return reply({index:await db('rpc/gazi_badge_next_index','POST',{})});
   if(b.action==='badge_list')return reply({records:(await db(base+'&select=record,revoked_at,digest&order=created_at.desc&limit=100','GET')).map(unpack)});
   if(b.action==='badge_get'&&validId(b.id))return reply({record:unpack((await db(base+'&id=eq.'+b.id+'&select=record,revoked_at,digest','GET'))[0])});
   if(b.action==='badge_create'){
    const r=b.record;
    if(!r||!validId(r.id)||!Number.isInteger(r.index)||r.index<0||r.index>=131072||!isHash(r.digest)||typeof r.jwt!=='string'||r.jwt.length>24000||!r.credential?.pilotMetadata?.pilot)return reply({error:'Reddedildi'},400);
    const old=await db(base+'&id=eq.'+r.id+'&select=record,revoked_at,digest','GET');if(old.length)return reply(unpack(old[0]));
    const created=await db('gazi_badge_records','POST',{scope:b.scope,id:r.id,status_index:r.index,record:r,digest:r.digest});return reply(unpack(created[0]));
   }
   if(b.action==='badge_revoke'&&validId(b.id)){
    await db(base+'&id=eq.'+b.id+'&revoked_at=is.null','PATCH',{revoked_at:new Date().toISOString()});
    const row=(await db(base+'&id=eq.'+b.id+'&select=record,revoked_at,digest','GET'))[0];return reply(row?{record:unpack(row)}:{error:'Kayıt bulunamadı'},row?200:404);
   }
  }
  return reply({error:'Reddedildi'},400);
 }catch{return reply({error:'Erişim doğrulanamadı'},503);}
});
