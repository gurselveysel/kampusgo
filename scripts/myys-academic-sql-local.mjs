import {sqlIdentityHttpFixture} from '../gazi/auth/tests/helpers/sql-identity-http.mjs';
const fixture=await sqlIdentityHttpFixture({academic:true,checkpoint:process.env.MYYS_ACADEMIC_CHECKPOINT==='1',limits:{global:1000,network:500,browser:100,seconds:60}});
console.log('MYYS_SQL_ORIGIN='+fixture.origin);
console.log('MYYS_SQL_PROVIDER='+fixture.providerOrigin);
console.log('MYYS_SQL_SPKI='+fixture.spki);
let closing=false;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{if(closing)return;closing=true;await fixture.close();process.exit(0);});

// Test-only parent IPC. No HTTP route, generic SQL or production import exposes this fault.
if(process.env.MYYS_ACADEMIC_CHECKPOINT==='1'&&process.send)process.on('message',async message=>{
 if(message?.type!=='synthetic-academic-restore-fault')return;
 try{await fixture.f.sql.db.exec("ALTER TABLE myys_academic_audit DISABLE TRIGGER USER;UPDATE myys_academic_audit SET recorded_at='2020-01-01T00:00:00.000Z';ALTER TABLE myys_academic_audit ENABLE TRIGGER USER;");process.send({type:'synthetic-fault-applied'});}catch{process.send({type:'synthetic-fault-failed'});}
});
