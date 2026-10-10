import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Render the actual component with its shared UI; no replacement controls.
const code=buildSync({stdin:{contents:"import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {AppealsWorkspace} from './appeals-workspace.jsx';export const render=(data,busy=false)=>renderToStaticMarkup(<AppealsWorkspace data={data} busy={busy} command={()=>{}}/>);",resolveDir:dirname(fileURLToPath(import.meta.url)),loader:'jsx'},bundle:true,platform:'node',format:'cjs',packages:'external',write:false}).outputFiles[0].text;
const module={exports:{}};new Function('require','module','exports',code)(createRequire(import.meta.url),module,module.exports);const {render}=module.exports;
const data=()=>({programs:[{id:'p',title:'Örnek veri programı'}],assessments:[{id:'s',score:80}],decisions:[{id:'d',programId:'p',assessmentId:'s',outcome:'approved',reason:'İlk gerekçeli karar korunur.'}],appeals:[{id:'a',decisionId:'d',reason:'<script>alert(1)</script> Öğrenenin itiraz gerekçesi',allowedActions:[],resolution:null}]});
test('yetkisiz öğrenen görünümü karar formu içermez; gerekçe HTML olarak çalışmaz',()=>{
 const html=render(data());assert.doesNotMatch(html,/<form|<script/);assert.match(html,/&lt;script&gt;/);assert.match(html,/İlk gerekçeli karar korunur/);assert.match(html,/İnceleme bekliyor/);
});
test('bağımsız inceleme formu yalnız sunucunun eylem izniyle ve gerekçe zorunluluğuyla görünür',()=>{
 const d=data();d.appeals[0].allowedActions=['resolve'];const html=render(d,true);assert.match(html,/<form/);assert.match(html,/name="outcome" required/);assert.match(html,/name="reason" required/);assert.match(html,/minLength="20"/);assert.match(html,/<button[^>]*disabled/);
});
test('sonuçlanan itiraz ilk ve yeni gerekçeyi birlikte gösterir; yeniden değerlendirme başarı gibi sunulmaz',()=>{
 const d=data();d.appeals[0].resolution={outcome:'reassessment',reason:'Yeni ve bağımsız inceleme gerekçesi.'};const html=render(d);assert.match(html,/İlk gerekçeli karar korunur/);assert.match(html,/Yeni ve bağımsız inceleme gerekçesi/);assert.match(html,/Yeniden değerlendirme gerekli/);assert.match(html,/tamamlanmadan belgeye ilerlenemez/);assert.doesNotMatch(html,/<form/);
});
test('bağlı yeni puan ve karar eski gerekçeyle birlikte görünür; sonuç eski bekleme mesajını kullanmaz',()=>{
 const d=data();d.appeals[0].resolution={id:'r',outcome:'reassessment',reason:'Bağımsız inceleme gerekçesi.'};
 d.assessments.push({id:'s2',resolutionId:'r',supersedesAssessmentId:'s',score:75,passed:true,reason:'Yeni rubrik incelemesi.'});
 let html=render(d);assert.match(html,/Yeniden değerlendirildi · Karar bekleniyor/);assert.match(html,/75\/100/);
 d.decisions.push({id:'d2',assessmentId:'s2',outcome:'approved',reason:'Yeni akademik karar gerekçesi.',usable:true});
 html=render(d);assert.match(html,/Yeniden değerlendirme kararı kaydedildi/);assert.match(html,/İlk gerekçeli karar korunur/);assert.match(html,/Yeni akademik karar gerekçesi/);assert.doesNotMatch(html,/tamamlanmadan belgeye ilerlenemez/);
});
test('ilgisiz yeniden değerlendirme aynı itirazın sonucu gibi gösterilmez',()=>{
 const d=data();d.appeals[0].resolution={id:'r',outcome:'reassessment',reason:'İnceleme sonucu.'};
 d.assessments.push({id:'foreign',resolutionId:'r',supersedesAssessmentId:'another',score:100,reason:'İlgisiz gizli gerekçe.'});
 const html=render(d);assert.doesNotMatch(html,/İlgisiz gizli gerekçe/);assert.match(html,/Yeniden değerlendirme gerekli/);
});
