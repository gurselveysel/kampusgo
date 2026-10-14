// Supplemental bounded render measurement; NEVER rewrites an axe incomplete as a pass.
// Text fill is temporarily transparent only to capture the actual background. Color,
// currentColor graphics, backgrounds and layout are not changed. Exact inline style
// and scroll positions are restored; axe always runs on the original rendered page.
const path = require('node:path');
const { PNG } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules', 'pngjs'));
function luminance(rgb) {
  return rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
function contrast(a, b) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
function composite(fg, bg) { return bg.map((v,i) => fg[i]*fg[3]+v*(1-fg[3])); }
async function measureGradientText(frame, target) {
  const review = reason => ({ status:'review', reason });
  if (!Array.isArray(target) || target.length!==1 || typeof target[0]!=='string') return review('unsupported-target');
  const loc=frame.locator(target[0]);if(await loc.count()!==1)return review('ambiguous-target');
  const el=await loc.elementHandle();let original;const scrollHandles=[];
  try {
    // Include ancestors of enclosing iframes; ElementHandle screenshots may scroll
    // both the inner document and the outer page. No state is stored on window.
    let current=frame,node=el;
    while(current){
      scrollHandles.push(await node.evaluateHandle(n=>{const entries=[];for(let p=n;p;p=p.parentElement)entries.push([p,p.scrollLeft,p.scrollTop]);return entries;}));
      if(node!==el)await node.dispose();
      if(!current.parentFrame())break;
      node=await current.frameElement();current=current.parentFrame();
    }
    await el.scrollIntoViewIfNeeded({timeout:3000});
    await frame.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    const meta=await el.evaluate(n=>{
      const fail=reason=>({reason});if(!(n instanceof HTMLElement))return fail('non-html-text');
      if(n.matches('input,textarea,select,canvas,svg,img,video'))return fail('replaced-content');
      const cs=getComputedStyle(n),r=n.getBoundingClientRect();
      if(r.width<=0||r.height<=0||r.x<0||r.y<0||r.right>innerWidth||r.bottom>innerHeight)return fail('not-fully-in-frame');
      if(r.width*r.height>2000000)return fail('capture-size');
      if(cs.visibility!=='visible'||cs.display==='none')return fail('not-visible');
      if(cs.textShadow!=='none'||parseFloat(cs.webkitTextStrokeWidth)!==0)return fail('text-effects');
      const parse=cs.webkitTextFillColor.match(/^rgba?\((\d+(?:\.\d+)?), (\d+(?:\.\d+)?), (\d+(?:\.\d+)?)(?:, ([\d.]+))?\)$/);
      if(!parse)return fail('non-srgb-fill');const fg=[+parse[1],+parse[2],+parse[3],parse[4]===undefined?1:+parse[4]];
      if(fg.slice(0,3).some(c=>c<0||c>255)||fg[3]<=0||fg[3]>1)return fail('invalid-fill');
      const backgrounds=[];
      for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);
        if(+s.opacity!==1||s.filter!=='none'||s.backdropFilter!=='none'||s.mixBlendMode!=='normal'||s.transform!=='none'||s.backgroundClip==='text')return fail('compositing-effect');
        if(s.backgroundImage.includes('url('))return fail('image-background');
        if(p.getAnimations({subtree:false}).some(a=>a.playState==='running'))return fail('animated-background');
        const q=p.getBoundingClientRect();backgrounds.push({tag:p.tagName,className:p.className,background:s.background,rect:{x:q.x,y:q.y,width:q.width,height:q.height}});
        for(const pseudo of ['::before','::after']){const ps=getComputedStyle(p,pseudo);if(ps.content!=='none'&&ps.content!=='normal'&&ps.display!=='none')return fail('pseudo-overlap-unreviewed');}
      }
      const rects=[];let text='';for(const child of n.childNodes){if(child.nodeType!==Node.TEXT_NODE||!child.textContent.trim())continue;
        text+=child.textContent;const range=document.createRange();range.selectNodeContents(child);
        for(const q of range.getClientRects()){if(!q.width||!q.height)continue;
          if(q.x<0||q.y<0||q.right>innerWidth||q.bottom>innerHeight)return fail('text-clipped');
          for(const x of [q.x+.5,(q.x+q.right)/2,q.right-.5])for(const y of [q.y+.5,(q.y+q.bottom)/2,q.bottom-.5]){const top=document.elementFromPoint(x,y);if(top!==n&&!n.contains(top))return fail('text-obscured');}
          rects.push({x:q.x-r.x,y:q.y-r.y,width:q.width,height:q.height});
        }
      }
      if(!rects.length)return fail('no-direct-text');
      const size=parseFloat(cs.fontSize),weight=Number(cs.fontWeight),large=size>=24||(weight>=700&&size>=56/3);
      return {text:text.trim(),foreground:fg,fontSize:size,fontWeight:weight,threshold:large?3:4.5,rects,box:{width:r.width,height:r.height},backgrounds,style:n.getAttribute('style')};
    });
    if(meta.reason)return review(meta.reason);original=meta.style;
    await el.evaluate(n=>n.style.setProperty('-webkit-text-fill-color','transparent','important'));
    if(!await el.evaluate(n=>getComputedStyle(n).webkitTextFillColor==='rgba(0, 0, 0, 0)'))return review('fill-override-blocked');
    const png=PNG.sync.read(await el.screenshot({animations:'disabled',timeout:5000}));
    if(Math.abs(png.width-meta.box.width)>2||Math.abs(png.height-meta.box.height)>2)return review('capture-geometry-changed');
    let min=Infinity,worst=null,pixels=0;
    for(const r of meta.rects){
      // One pixel outward rounding makes this a conservative rectangle sample,
      // rather than pretending the exact glyph edge is known from anti-aliasing.
      const left=Math.max(0,Math.floor(r.x)-1),right=Math.min(png.width,Math.ceil(r.x+r.width)+1);
      const top=Math.max(0,Math.floor(r.y)-1),bottom=Math.min(png.height,Math.ceil(r.y+r.height)+1);
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
        const i=(y*png.width+x)*4;if(png.data[i+3]!==255)return review('nonopaque-capture');
        const bg=Array.from(png.data.subarray(i,i+3)),ratio=contrast(composite(meta.foreground,bg),bg);pixels++;
        if(ratio<min){min=ratio;worst=bg;}
      }
    }
    if(!pixels)return review('no-sampled-pixels');
    // A guard margin is used for 8-bit capture/rounding. It is not a WCAG threshold.
    const guard=meta.threshold+.15;
    return {status:min>=guard?'sample-sufficient':'sample-below-target',ratio:min,threshold:meta.threshold,guard,pixels,worstBackground:worst,text:meta.text,foreground:meta.foreground,fontSize:meta.fontSize,fontWeight:meta.fontWeight,backgrounds:meta.backgrounds,method:'rendered-background-under-direct-text-rectangles',scope:'this-render-only'};
  } catch(e) { return review('capture-error:'+e.name); }
  finally {
    if(original!==undefined)await el.evaluate((n,s)=>{if(s===null)n.removeAttribute('style');else n.setAttribute('style',s);if(n.getAttribute('style')!==s)throw Error('Inline style restoration failed');},original);
    for(const h of scrollHandles){await h.evaluate(entries=>{for(const [n,x,y]of entries){n.scrollLeft=x;n.scrollTop=y;}for(const [n,x,y]of entries)if(n.scrollLeft!==x||n.scrollTop!==y)throw Error('Scroll restoration failed');});await h.dispose();}
    await el.dispose();
  }
}
module.exports={luminance,contrast,composite,measureGradientText};
