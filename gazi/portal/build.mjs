import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
await build({entryPoints:['src/main.jsx'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'../portal.js',legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'}});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/style.css','-o','../portal.css','--minify'],{stdio:'inherit'});
