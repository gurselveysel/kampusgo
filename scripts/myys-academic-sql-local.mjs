import {sqlIdentityHttpFixture} from '../gazi/auth/tests/helpers/sql-identity-http.mjs';
const fixture=await sqlIdentityHttpFixture({academic:true,limits:{global:1000,network:500,browser:100,seconds:60}});
console.log('MYYS_SQL_ORIGIN='+fixture.origin);
console.log('MYYS_SQL_PROVIDER='+fixture.providerOrigin);
console.log('MYYS_SQL_SPKI='+fixture.spki);
let closing=false;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{if(closing)return;closing=true;await fixture.close();process.exit(0);});
