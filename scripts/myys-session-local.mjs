// Disposable signed SQL identity fixture; IPC can only revoke its synthetic learner or advance its test clock.
import {sqlIdentityHttpFixture} from '../gazi/auth/tests/helpers/sql-identity-http.mjs';
if(process.env.VERCEL||process.env.VERCEL_ENV)throw Error('Local acceptance only');
let offset=0;
const fixture=await sqlIdentityHttpFixture({academic:true,checkpoint:true,clock:()=>new Date(Date.now()+offset),limits:{global:1000,network:500,browser:100,seconds:60}});
console.log('MYYS_SQL_ORIGIN='+fixture.origin);console.log('MYYS_SQL_PROVIDER='+fixture.providerOrigin);console.log('MYYS_SQL_SPKI='+fixture.spki);
let closing=false;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{if(closing)return;closing=true;await fixture.close();process.exit(0);});
if(process.send)process.on('message',async message=>{
 try{
  if(message?.type==='revoke-synthetic-student')await fixture.f.putMembership(fixture.f.membership('student',{active:false,revision:2}),1);
  else if(message?.type==='advance-synthetic-clock')offset+=301000;
  else return;
  process.send({type:'synthetic-change-applied'});
 }catch{process.send({type:'synthetic-change-failed'});}
});
