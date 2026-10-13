import {localIssuer} from '../../myys/key-registry.mjs';
// Only generated synthetic public material enters the disposable acceptance store.
export function localKey(f,material,{reviewed=true,replacesId=null}={}){
 const reason='Sentetik anahtar kabulü; gerçek kurum imza yetkisi veya erişim değildir.';
 const key=f.run('it','key-register',{unit:'engineering',mode:'local-acceptance',issuer:localIssuer,publicJwk:material.jwk,reason,custodyReference:reason,replacesId});
 if(reviewed)f.run('admin','key-review',{keyId:key.id,outcome:'accepted',reason});return key;
}
