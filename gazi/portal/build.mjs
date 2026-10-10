import {mkdir,writeFile} from 'node:fs/promises';
import {curricula,lessonsFor} from './src/learning-data.mjs';
import {cases} from './src/learning-cases.mjs';
import {sources,programResources} from './src/learning-resources.mjs';
import {renderSlides,renderCaseCsv} from './src/learning-materials.mjs';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
await build({entryPoints:['src/main.jsx'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'../portal.js',legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
await build({entryPoints:['src/learning-entry.jsx'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'../learning.js',legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/style.css','-o','../portal.css','--minify'],{stdio:'inherit'});

await mkdir('../content',{recursive:true});
for(const id of Object.keys(curricula)){for(const lesson of lessonsFor(id))await writeFile('../content/'+lesson.id+'-Sunum.html',renderSlides(lesson,programResources[id].map(k=>sources[k])));}
for(const [id,x] of Object.entries(cases))await writeFile('../content/'+id+'-Vaka.csv',renderCaseCsv(x));
