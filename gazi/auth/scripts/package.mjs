import {cp,mkdir,writeFile,rm,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const names=['app.js','content/wai-intro.tr.vtt','assets/gazi-logo.svg','assets/go-icon.svg','assets/unigo-logo-tr.png','data/reference.json','demo/Unigo_Yonetici_Ozeti.pdf','demo/portal.css','demo/portal.js','embedded.css','enhanced.css','enhanced.js','governance.mjs','index.html','kurumsal-demo.html','learning.css','learning.js','legacy.html','model.mjs','portal.css','portal.js','role-dashboard.mjs','styles.css','ui-theme.css','workspace.css','workspace.js','workspaces.mjs'];
names.push(...(await readdir(resolve(root,'../content'))).filter(n=>/^P\d{2}-(L\d{2}-Sunum\.html|M\d{2}-Vaka\.csv)$/.test(n)).map(n=>'content/'+n));
await rm(resolve(root,'private'),{recursive:true,force:true});
for(const name of names){const dest=resolve(root,'private',name);await mkdir(dirname(dest),{recursive:true});await cp(resolve(root,'..',name),dest);}
await writeFile(resolve(root,'private/manifest.json'),JSON.stringify(names));
console.log('Korunan uygulama paketi: '+names.length+' dosya.');
