// Bounded RFC 4180 reader. No spreadsheet evaluation.
export function parseTransferCsv(input){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>50000)throw Error('CSV en fazla 50 KB olmalı.');
 const text=input.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;continue;}
  if(ch==='"'){if(cell||closed)throw Error('CSV tırnak düzeni geçersiz.');quoted=true;}
  else if(ch===','){row.push(cell);cell='';closed=false;}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';closed=false;}
  else{if(closed)throw Error('CSV hücresinden sonra ayraç gerekli.');cell+=ch;}
  if(rows.length>101)throw Error('Toplu işlem en fazla 100 satır olmalı.');
 }
 if(quoted)throw Error('CSV tırnağı kapatılmamış.');
 if(cell||row.length||closed){row.push(cell);rows.push(row);}
 if(rows[0]?.length!==2||rows[0][0]!=='Karar kimliği'||rows[0][1]!=='Satır açıklaması')throw Error('Başlıklar: Karar kimliği,Satır açıklaması');
 if(rows.length<2||rows.length>101)throw Error('Toplu işlem 1–100 satır olmalı.');
 return rows.slice(1).map(r=>({decisionId:r[0]||'',label:r[1]||'',...(r.length!==2?{inputError:'column_count'}:{})}));
}
export function transferCsv(rows){
 const escape=value=>{let v=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(v)||/^[\t\r\n]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
 return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
}
