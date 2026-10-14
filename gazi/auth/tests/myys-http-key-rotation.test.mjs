import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {LocalAcceptanceStore} from '../myys/store.mjs';
import {LocalIdentityRateLimit} from '../myys/identity-rate-limit.mjs';
const code=c=>e=>e.code===c;
function setup(f){
 let now=Date.parse('2026-10-14T12:00:00.000Z');const config={tenant:'test-gazi',issuer:'https://idp.invalid',audience:'myys'},keys=[randomBytes(32),randomBytes(32),randomBytes(32)],limits={global:5,network:2,browser:1,seconds:60};
 return {keys,config,limits,advance:n=>now+=n,make:(patch={})=>new LocalIdentityRateLimit({store:f.s,identityConfig:config,key:keys[0],keyRevision:1,clock:()=>new Date(now),limits,...patch}),req:{purpose:'start',network:'127.0.0.1',browserHash:'a'.repeat(64)}};
}
test('B07 anahtar değişimi canlı oran bütçesini sıfırlamaz; önceki işçi bütçeyi aşamaz',()=>use(f=>{
 const h=setup(f),a=h.make(),b=h.make({key:h.keys[1],keyRevision:2});a.check(h.req);assert.throws(()=>a.check(h.req),code('identity_rate'));const before=JSON.stringify(f.s.db.prepare('SELECT * FROM identity_rate_buckets').all());assert.throws(()=>b.check(h.req),code('identity_key_rotation_wait'));assert.equal(JSON.stringify(f.s.db.prepare('SELECT * FROM identity_rate_buckets').all()),before);assert.equal(f.s.db.prepare('SELECT revision FROM identity_http_key_epochs').get().revision,1);
 h.advance(60000);b.check(h.req);assert.equal(f.s.db.prepare('SELECT revision FROM identity_http_key_epochs').get().revision,2);assert.throws(()=>a.check(h.req),code('identity_key_epoch'));assert.throws(()=>b.check(h.req),code('identity_rate'));assert.equal(f.s.db.prepare('SELECT count(*) n FROM identity_http_key_history').get().n,2);
}));
test('B07 aynı revizyonda farklı anahtar/limit, atlanan revizyon ve eski anahtarın yeniden kullanımı kapalı',()=>use(f=>{
 const h=setup(f),a=h.make();a.assertCurrent();assert.throws(()=>h.make({key:h.keys[1]}).assertCurrent(),code('identity_key_epoch'));assert.throws(()=>h.make({limits:{...h.limits,global:100}}).assertCurrent(),code('identity_key_epoch'));assert.throws(()=>h.make({key:h.keys[2],keyRevision:3}).assertCurrent(),code('identity_key_epoch'));
 h.make({key:h.keys[1],keyRevision:2}).assertCurrent();assert.throws(()=>h.make({key:h.keys[0],keyRevision:3}).assertCurrent(),code('identity_key_epoch'));assert.throws(()=>a.assertCurrent(),code('identity_key_epoch'));
}));
test('B07 iki SQLite bağlantısı aynı revizyonu görür; çakışan yeni yapılandırmadan yalnız biri etkinleşir',()=>use(f=>{
 const h=setup(f),second=new LocalAcceptanceStore(f.path);try{h.make().assertCurrent();const b=h.make({store:second,key:h.keys[1],keyRevision:2}),c=h.make({key:h.keys[2],keyRevision:2});b.assertCurrent();assert.throws(()=>c.assertCurrent(),code('identity_key_epoch'));assert.equal(second.db.prepare('SELECT count(*) n FROM identity_http_key_history').get().n,2);assert.throws(()=>h.make().assertCurrent(),code('identity_key_epoch'));}finally{second.close();}
}));
test('B07 bütün amaçlardaki sayaçlar bitmeden anahtar dönüşümü yapılmaz',()=>use(f=>{
 const h=setup(f),a=h.make();a.check({...h.req,purpose:'backchannel'});h.advance(59000);assert.throws(()=>h.make({key:h.keys[1],keyRevision:2}).check({...h.req,purpose:'login'}),code('identity_key_rotation_wait'));h.advance(1000);h.make({key:h.keys[1],keyRevision:2}).check({...h.req,purpose:'login'});
}));
test('B07 anahtar sürümü audit ile atomik kaydedilir; başarısız kayıt eski sürümü kapatmaz',()=>use(f=>{
 const h=setup(f);h.make().assertCurrent();f.s.db.exec("CREATE TRIGGER epoch_fail BEFORE INSERT ON audit WHEN NEW.action='identity.http-key-epoch' BEGIN SELECT RAISE(ABORT,'synthetic'); END");assert.throws(()=>h.make({key:h.keys[1],keyRevision:2}).assertCurrent());assert.equal(f.s.db.prepare('SELECT revision FROM identity_http_key_epochs').get().revision,1);assert.equal(f.s.db.prepare('SELECT count(*) n FROM identity_http_key_history').get().n,1);h.make().assertCurrent();f.s.db.exec('DROP TRIGGER epoch_fail');h.make({key:h.keys[1],keyRevision:2}).assertCurrent();assert.equal(f.s.db.prepare('SELECT revision FROM identity_http_key_epochs').get().revision,2);
}));
test('B07 anahtar revizyonu kurum/issuer/audience ile ayrılır; kalıcı kayıtta ham sır tutulmaz',()=>use(f=>{
 const h=setup(f);h.make().assertCurrent();h.make({key:h.keys[1],keyRevision:2}).assertCurrent();for(const config of [{...h.config,tenant:'other'},{...h.config,issuer:'https://other.invalid'},{...h.config,audience:'other'}])h.make({identityConfig:config}).assertCurrent();assert.equal(f.s.db.prepare('SELECT count(*) n FROM identity_http_key_epochs').get().n,4);const rows=JSON.stringify(f.s.db.prepare('SELECT * FROM identity_http_key_epochs').all());for(const k of h.keys){assert.equal(rows.includes(k.toString('hex')),false);assert.equal(rows.includes(k.toString('base64url')),false);}
}));
test('B07 eski sürüm işaretlenmemiş canlı sayaçlar göçte korunur; bütçe dolmadan yeni başlangıç yok',()=>use(f=>{
 const h=setup(f),a=h.make(),namespace=createHash('sha256').update(JSON.stringify([h.config.issuer,h.config.audience])).digest('hex'),start=Date.parse('2026-10-14T12:00:00.000Z');f.s.db.prepare('INSERT INTO identity_rate_buckets VALUES(?,?,?,?,?,?,?)').run('test-gazi',namespace,'start','legacy',start,start+60000,1);
 assert.throws(()=>a.assertCurrent(),code('identity_key_rotation_wait'));assert.equal(f.s.db.prepare('SELECT count(*) n FROM identity_http_key_epochs').get().n,0);h.advance(60000);a.check(h.req);assert.equal(f.s.db.prepare('SELECT count(*) n FROM identity_rate_buckets WHERE bucket=?').get('legacy').n,0);
}));
