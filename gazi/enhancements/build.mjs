import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('.',import.meta.url)));
await build({entryPoints:['src/main.jsx'],bundle:true,minify:true,format:'esm',target:['es2022'],outfile:'../enhanced.js',legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/tailwind.css','-o','../enhanced.css','--minify'],{stdio:'inherit'});
