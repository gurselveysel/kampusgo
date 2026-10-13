// Disposable HTTPS, synthetic IdP and generated in-memory keys; no live site calls.
import {identityHttpFixture} from '../gazi/auth/tests/helpers/local-identity-http.mjs';
const h=await identityHttpFixture({tenant:'gazi'});
console.log('MYYS_LOCAL_IDENTITY_SPKI='+h.spki);
console.log('MYYS_LOCAL_PROVIDER='+h.providerOrigin);
console.log('MYYS_LOCAL_IDENTITY='+h.origin+'/__identity/login');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await h.close();process.exit(0);});
