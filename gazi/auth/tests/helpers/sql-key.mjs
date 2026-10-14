import {generateKeyPairSync} from 'node:crypto';
import {localIssuer} from '../../myys/key-registry.mjs';
import {sqlAcademicReason as reason} from './sql-academic.mjs';
// Only a disposable public JWK leaves this helper; no private credential is persisted.
export const sqlOpenKey=(name='synthetic-key')=>({...generateKeyPairSync('rsa',{modulusLength:2048}).publicKey.export({format:'jwk'}),kid:'https://local-acceptance.invalid/api/rozet/anahtarlar#'+name});
export const sqlKeyInput=(publicJwk=sqlOpenKey())=>({unit:'engineering',mode:'local-acceptance',issuer:localIssuer,publicJwk,reason,custodyReference:reason});
export async function sqlKey(f,{reviewed=true,input=sqlKeyInput()}={}){const k=await f.run('it','key-register',input);if(reviewed)await f.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason});return k;}
