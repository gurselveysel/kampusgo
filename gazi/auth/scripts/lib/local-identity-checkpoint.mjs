// Isolated acceptance journal ONLY. Separate directory from the SQL data/snapshots.
// This reference driver is not a distributed consensus service or a production rollback-proof store.
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync,openSync,closeSync,fsyncSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {CoreError,requireThat} from '../../myys/store.mjs';
import {stableStringify} from '../../myys/program-model.mjs';
import {identityCheckpointProfile,validIdentityCheckpointHead} from '../../myys/identity-checkpoint.mjs';
const local=()=>requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Kontrol kaydı yalnız izole yerel kabulde çalışır.',503);
const closed=()=>new CoreError('identity_checkpoint','Kimlik güvenlik kaydının güncelliği doğrulanamadı. Erişim kapalı.',503);
const check=v=>{if(!v)throw closed();};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const same=(a,b)=>stableStringify(a)===stableStringify(b);
const privatePath=(path,directory)=>{const s=lstatSync(path);check((directory?s.isDirectory():s.isFile()&&s.nlink===1)&&!s.isSymbolicLink()&&(s.mode&0o777)===(directory?0o700:0o600)&&s.uid===process.getuid());};
const syncDirectory=path=>{const fd=openSync(path,'r');try{fsyncSync(fd);}finally{closeSync(fd);}};
const token=Symbol('local-checkpoint-constructor');
export class LocalIdentityCheckpointJournal {
 #db;#id;
 static create({directory,journalId}){
  local();check(uuid(journalId)&&typeof directory==='string'&&resolve(directory)===directory);
  let db;
  try{
   mkdirSync(directory,{mode:0o700});privatePath(directory,true);check(realpathSync(directory)===directory);
   const path=join(directory,'checkpoint.sqlite'),fd=openSync(path,'wx',0o600);closeSync(fd);
   db=new DatabaseSync(path,{timeout:50,allowExtension:false,defensive:true});
   db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=EXTRA; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF;
    BEGIN IMMEDIATE;
    CREATE TABLE state(singleton INTEGER PRIMARY KEY CHECK(singleton=1),journal_id TEXT NOT NULL,issued INTEGER NOT NULL CHECK(issued BETWEEN 0 AND 9007199254740991),head TEXT,pending TEXT);
    CREATE TABLE events(fence INTEGER NOT NULL,phase TEXT NOT NULL CHECK(phase IN('reserve','commit','abort')),operation_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(fence,phase));
    CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'immutable'); END;
    CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'immutable'); END;`);
   db.prepare('INSERT INTO state VALUES(1,?,0,NULL,NULL)').run(journalId);db.exec('COMMIT');db.close();db=null;
   syncDirectory(directory);syncDirectory(dirname(directory));
   return this.open({directory,journalId});
  }catch{try{db?.close();}catch{}throw closed();}
 }
 static open({directory,journalId}){
  local();check(uuid(journalId)&&typeof directory==='string'&&resolve(directory)===directory);let db;
  try{
   privatePath(directory,true);check(realpathSync(directory)===directory);const path=join(directory,'checkpoint.sqlite');privatePath(path,false);
   db=new DatabaseSync(path,{timeout:50,allowExtension:false,defensive:true});
   db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=EXTRA; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF;');
   check(db.prepare('PRAGMA integrity_check').get().integrity_check==='ok'&&db.prepare('PRAGMA synchronous').get().synchronous===3&&db.prepare('PRAGMA foreign_key_check').all().length===0);
   const journal=new this(token,db,journalId);journal.inspect();return journal;
  }catch{try{db?.close();}catch{}throw closed();}
 }
 constructor(key,db,id){check(key===token);this.#db=db;this.#id=id;}
 #read(){
  const rows=this.#db.prepare('SELECT * FROM state').all();check(rows.length===1);const s=rows[0];
  check(s.journal_id===this.#id&&Number.isSafeInteger(s.issued)&&s.issued>=0);
  const head=s.head===null?null:JSON.parse(s.head),pending=s.pending===null?null:JSON.parse(s.pending);
  check(head===null||validIdentityCheckpointHead(head)&&head.journalId===this.#id&&head.fence<=s.issued);
  if(pending)check(pending.journalId===this.#id&&pending.profile===identityCheckpointProfile&&pending.fence===s.issued&&uuid(pending.operationId)&&['initialize','operation'].includes(pending.kind)&&same(pending.base,head));
  const counts=this.#db.prepare("SELECT count(*) AS n,coalesce(max(fence),0) AS last FROM events WHERE phase='reserve'").get();check(counts.n===s.issued&&counts.last===s.issued);
  if(s.issued){
   const reserve=this.#db.prepare("SELECT operation_id,payload FROM events WHERE fence=? AND phase='reserve'").get(s.issued);check(reserve);
   const r=JSON.parse(reserve.payload).reservation;check(r.fence===s.issued&&r.operationId===reserve.operation_id&&r.journalId===this.#id);
   const ends=this.#db.prepare("SELECT phase,operation_id,payload FROM events WHERE fence=? AND phase<>'reserve'").all(s.issued);
   if(pending)check(same(r,pending)&&ends.length===0);
   else{check(ends.length===1&&ends[0].operation_id===r.operationId);const end=JSON.parse(ends[0].payload);check(ends[0].phase==='commit'?same(end.next,head):same(r.base,head));}
  }else check(head===null&&pending===null);
  return {issued:s.issued,head,pending};
 }
 #atomic(work){
  local();let open=false;
  try{check(this.#db);this.#db.exec('BEGIN IMMEDIATE');open=true;const value=work(this.#read());this.#db.exec('COMMIT');open=false;return structuredClone(value);}
  catch{if(open)try{this.#db.exec('ROLLBACK');}catch{}throw closed();}
 }
 reserve({journalId,profile,kind,control},{signal}={}){
  return this.#atomic(s=>{
   check(!signal?.aborted&&journalId===this.#id&&profile===identityCheckpointProfile&&!s.pending&&s.issued<Number.MAX_SAFE_INTEGER);
   check(kind==='initialize'?s.head===null&&control&&/^[A-Za-z0-9._:-]{1,160}$/.test(control.operatorRef)&&/^[a-f0-9]{64}$/.test(control.authorityDigest):kind==='operation'&&s.head!==null&&control===null);
   const r={journalId,profile,kind,fence:s.issued+1,operationId:randomUUID(),base:s.head};
   this.#db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(r.fence,'reserve',r.operationId,JSON.stringify({reservation:r,control}));
   this.#db.prepare('UPDATE state SET issued=?,pending=? WHERE singleton=1').run(r.fence,JSON.stringify(r));return r;
  });
 }
 commit({reservation:r,next},{signal}={}){
  return this.#atomic(s=>{
   check(!signal?.aborted&&same(s.pending,r)&&validIdentityCheckpointHead(next)&&next.journalId===this.#id&&next.fence===r.fence&&next.operationId===r.operationId);
   this.#db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(r.fence,'commit',r.operationId,JSON.stringify({next}));
   this.#db.prepare('UPDATE state SET head=?,pending=NULL WHERE singleton=1').run(JSON.stringify(next));return next;
  });
 }
 abort({reservation:r},{signal}={}){
  return this.#atomic(s=>{
   check(!signal?.aborted&&same(s.pending,r));
   this.#db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(r.fence,'abort',r.operationId,JSON.stringify({base:r.base}));
   this.#db.prepare('UPDATE state SET pending=NULL WHERE singleton=1').run();return {aborted:true,base:r.base};
  });
 }
 // Trusted diagnostics only: no SQL rows, session tokens, subject identities or KMS material.
 inspect(){local();try{check(this.#db);return structuredClone(this.#read());}catch{throw closed();}}
 close(){if(this.#db){this.#db.close();this.#db=null;}}
}
