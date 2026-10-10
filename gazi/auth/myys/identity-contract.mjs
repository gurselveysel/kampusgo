// B06/B07 readiness contract. Not an HTTP login handler.
// No discovery/network, provisioning, production database or pilot-gateway changes.
import {createLocalJWKSet, decodeProtectedHeader, jwtVerify} from 'jose';
import {timingSafeEqual} from 'node:crypto';
import {CoreError, LocalAcceptanceStore, requireThat} from './store.mjs';
import {ROLES} from './core.mjs';

const text = v => typeof v === 'string' && v.length > 0 && v.length <= 512;
const integer = v => Number.isSafeInteger(v) && v >= 0;
const fail = () => new CoreError('identity_token', 'Kurumsal kimlik kanıtı doğrulanamadı.', 403);
const timestamp = date => {
 const value = date instanceof Date ? date.getTime() : NaN;
 requireThat(Number.isFinite(value), 'identity_clock', 'Geçerli sunucu zamanı gerekli.', 500);
 return Math.floor(value / 1000);
};

export function createIdentityContract(input) {
 // Copy server-owned configuration: callers cannot mutate trust after construction.
 const c = structuredClone(input);
 let issuer;
 try { issuer = new URL(c.issuer); } catch { throw new CoreError('identity_config', 'Kimlik sağlayıcısı sözleşmesi geçersiz.', 500); }
 const config = condition => requireThat(condition, 'identity_config', 'Kimlik sağlayıcısı sözleşmesi geçersiz.', 500);
 config(issuer.protocol === 'https:' && !issuer.username && !issuer.password && !issuer.search && !issuer.hash);
 config(text(c.version) && text(c.tenant) && text(c.audience));
 config(Array.isArray(c.algorithms) && c.algorithms.length > 0 && c.algorithms.every(a => ['RS256','ES256'].includes(a)));
 config(integer(c.maxTokenAgeSeconds) && c.maxTokenAgeSeconds > 0 && c.maxTokenAgeSeconds <= 900);
 config(integer(c.maxAuthAgeSeconds) && c.maxAuthAgeSeconds > 0 && c.maxAuthAgeSeconds <= 3600);
 config(integer(c.clockToleranceSeconds) && c.clockToleranceSeconds <= 30);
 config(Array.isArray(c.mfaProfiles) && c.mfaProfiles.every(p => text(p.acr) && Array.isArray(p.amr) && p.amr.length > 0 && p.amr.every(text)));
 config(Array.isArray(c.jwks?.keys) && c.jwks.keys.length > 0 && c.jwks.keys.length <= 8);
 const kids = new Set();
 for (const k of c.jwks.keys) {
  config(text(k.kid) && !kids.has(k.kid) && c.algorithms.includes(k.alg));
  config(!['d','p','q','dp','dq','qi','oth','k','jku','x5u'].some(field => field in k));
  config((k.alg === 'RS256' && k.kty === 'RSA') || (k.alg === 'ES256' && k.kty === 'EC' && k.crv === 'P-256'));
  config((!k.use || k.use === 'sig') && (!k.key_ops || (Array.isArray(k.key_ops) && k.key_ops.length === 1 && k.key_ops[0] === 'verify')));
  kids.add(k.kid);
 }
 const keys = createLocalJWKSet(c.jwks), proofs = new WeakMap();
 function resolveMember(proof, {store, now = new Date(), requireMfa = true} = {}, commit = actor => actor) {
  const at = timestamp(now), identity = proofs.get(proof);
  requireThat(identity && at >= identity.at && at < identity.expires && at - identity.at <= c.maxTokenAgeSeconds, 'identity_proof', 'Güncel doğrulanmış kimlik kanıtı gerekli.', 403);
  requireThat(store instanceof LocalAcceptanceStore && !process.env.VERCEL && !process.env.VERCEL_ENV, 'local_only', 'Bu kimlik eşlemesi yalnız yerel kabul deposu içindir.', 503);
  requireThat(typeof requireMfa === 'boolean' && (!requireMfa || identity.mfa), 'identity_mfa', 'Bu işlem için kurumun doğruladığı çok faktörlü kimlik kanıtı gerekli.', 403);
  return store.transaction(() => {
   const person = store.db.prepare('SELECT id FROM persons WHERE issuer=? AND subject=? AND active=1').get(identity.issuer, identity.subject);
   requireThat(person, 'identity_member', 'Etkin kurum kişisi bulunamadı.', 403);
   const memberships = store.db.prepare('SELECT unit,roles,expires FROM memberships WHERE tenant=? AND person=? AND active=1 AND expires>?').all(c.tenant, person.id, now.toISOString()).map(row => {
    let roles;
    try { roles = JSON.parse(row.roles); } catch { roles = null; }
    requireThat(Number.isFinite(Date.parse(row.expires)) && Date.parse(row.expires) > now.getTime() && text(row.unit) && Array.isArray(roles) && roles.length > 0 && roles.every(r => ROLES.includes(r)), 'identity_directory', 'Üyelik yetki kaydı doğrulanamadı.', 403);
    return {unit: row.unit, roles};
   });
   requireThat(memberships.length > 0, 'membership_required', 'Kurum üyeliği yok veya süresi dolmuş.', 403);
   return commit({id: person.id, tenant: c.tenant, mfa: identity.mfa, memberships}, {expiresAt: new Date(identity.expires * 1000).toISOString(), contractVersion: c.version});
  });
 }
 return Object.freeze({
  async verify(token, {expectedNonce, now = new Date()} = {}) {
   const at = timestamp(now);
   // expectedNonce is read from a server challenge, never from token claims or a form.
   requireThat(typeof expectedNonce === 'string' && /^[A-Za-z0-9_-]{32,256}$/.test(expectedNonce), 'identity_challenge', 'Sunucuda saklanan kimlik isteği gerekli.', 403);
   try {
    if (typeof token !== 'string' || token.length > 16384 || token.split('.').length !== 3) throw fail();
    const header = decodeProtectedHeader(token);
    if (!kids.has(header.kid) || !c.algorithms.includes(header.alg) || (header.typ && header.typ !== 'JWT') || ['jku','jwk','x5u'].some(k => k in header)) throw fail();
    const {payload: p} = await jwtVerify(token, keys, {
     issuer: c.issuer, audience: c.audience, algorithms: c.algorithms,
     currentDate: now, clockTolerance: c.clockToleranceSeconds, maxTokenAge: c.maxTokenAgeSeconds,
     requiredClaims: ['iss','sub','aud','iat','exp','nonce','auth_time'],
    });
    // This profile trusts one audience only. Additional audiences require a new contract.
    const audiences = Array.isArray(p.aud) ? p.aud : [p.aud];
    if (audiences.length !== 1 || audiences[0] !== c.audience || (p.azp !== undefined && p.azp !== c.audience)) throw fail();
    if (typeof p.sub !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(p.sub)) throw fail();
    if (![p.iat,p.exp,p.auth_time].every(integer) || p.exp <= p.iat || p.auth_time > p.iat + c.clockToleranceSeconds || p.auth_time > at + c.clockToleranceSeconds || at - p.auth_time > c.maxAuthAgeSeconds + c.clockToleranceSeconds) throw fail();
    const wanted = Buffer.from(expectedNonce), received = Buffer.from(typeof p.nonce === 'string' ? p.nonce : '');
    if (wanted.length !== received.length || !timingSafeEqual(wanted, received)) throw fail();
    const mfa = Array.isArray(p.amr) && p.amr.every(text) && c.mfaProfiles.some(profile => profile.acr === p.acr && profile.amr.every(method => p.amr.includes(method)));
    const proof = Object.freeze({});
    proofs.set(proof, {issuer: c.issuer, subject: p.sub, mfa, at, expires: Math.min(p.exp, p.iat + c.maxTokenAgeSeconds + c.clockToleranceSeconds, p.auth_time + c.maxAuthAgeSeconds + c.clockToleranceSeconds)});
    return proof;
   } catch { throw fail(); } // Never expose token, claims, provider messages or key details.
  },
  resolveLocalMember(proof, options) { return resolveMember(proof, options); },
  commitLocalMember(proof, options, commit) {
   requireThat(typeof commit === 'function', 'identity_commit', 'Yerel kabul işlemi gerekli.', 500);
   // Synchronous server-owned callback: member recheck and commit share one transaction.
   return resolveMember(proof, options, commit);
  },
 });
}
