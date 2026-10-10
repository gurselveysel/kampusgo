import {generateKeyPairSync} from 'node:crypto';
import {importJWK} from 'jose';
import {signApproved} from '../../myys/credentials.mjs';
export async function signedFixture(f){
 const initial=f.passed(),issuance=f.run('issuer','issue',{decisionId:initial.d.id});
 const base='https://local-acceptance.invalid',keys=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk=keys.privateKey.export({format:'jwk'});jwk.kid=base+'/api/rozet/anahtarlar#local-wallet';
 const material={privateKey:await importJWK(jwk,'RS256'),jwk:{...keys.publicKey.export({format:'jwk'}),kid:jwk.kid}};
 const signed=await signApproved(f.core,f.context('issuer'),issuance.id,material,base);
 return {...initial,issuance,signed,material,base};
}
