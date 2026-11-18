import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const rgba=value=>{const m=/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(value);return m?{rgb:[+m[1],+m[2],+m[3]],a:+m[4]}:null;};
// Glass surfaces are translucent, so measure contrast against the worst-case backdrop:
// the surface over the light base or over the lightest colour blob.
const over=(fgValue,bgHex)=>{
  const fg=rgba(fgValue);
  if(!fg)return fgValue.toLowerCase();
  const bg=bgHex.slice(1).match(/../g).map(v=>parseInt(v,16));
  return '#'+fg.rgb.map((c,i)=>Math.round(c*fg.a+bg[i]*(1-fg.a)).toString(16).padStart(2,'0')).join('');
};
const block=(selector)=>{const body=css.split('\n').find(line=>line.startsWith(selector));if(!body)throw new Error('missing '+selector);return body.slice(0,body.indexOf('}')+1);};
for(const [selector,base] of [[':root{','#e9eef8'],[':root[data-theme=dark]{','#151a2e']]){
 test(`${selector} semantic text and essential controls meet contrast thresholds`,()=>{
  const body=block(selector);
  const tokens=Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))/gi)].map(m=>[m[1],m[2]]));
  for(const bg of ['bg-base','surface','surface-strong','surface-muted']){
   const solid=over(tokens[bg],base);
   for(const fg of ['primary','secondary'])assert.ok(contrast(over(tokens['text-'+fg],base),solid)>=4.5,`${selector} ${fg}/${bg} ${over(tokens['text-'+fg],base)} on ${solid}`);
   for(const fg of ['control-border','focus-ring'])assert.ok(contrast(tokens[fg],solid)>=3,`${selector} ${fg}/${bg}`);
  }
  for(const [fg,bg]of [['on-accent','primary-filled'],['success','success-bg'],['danger-ink','danger-soft'],['danger-ink','surface'],['danger-ink','bg-base'],['self','self-bg'],['deputy','deputy-bg'],['future','future-bg']])assert.ok(contrast(over(tokens[fg],base),over(tokens[bg],base))>=4.5,`${selector} ${fg} on ${bg}: ${over(tokens[fg],base)} / ${over(tokens[bg],base)}`);
 });
}
test('Requested design tokens are defined for both themes',()=>{
 const light=block(':root{'),dark=block(':root[data-theme=dark]{');
 for(const token of ['--bg-base','--bg-gradient','--surface','--surface-strong','--border-glass','--text-primary','--text-secondary','--text-muted','--primary','--primary-soft','--accent','--accent-soft','--warning','--danger','--danger-soft','--shadow'])assert.ok(light.includes(token+':'),token);
 for(const [token,value] of [['--bg-base','#eef1f7'],['--text-primary','#1f2433'],['--text-secondary','#5a6275'],['--primary','#5b6fe0'],['--accent','#2fa79b'],['--warning','#d9a441'],['--danger','#d46a6a'],['--danger-soft','rgba(212,106,106,.10)'],['--surface','rgba(255,255,255,.55)'],['--surface-strong','rgba(255,255,255,.75)'],['--border-glass','rgba(255,255,255,.6)'],['--primary-soft','rgba(91,111,224,.12)'],['--accent-soft','rgba(47,167,155,.12)'],['--shadow','0 8px 32px rgba(31,36,51,.08)']])assert.ok(light.includes(`${token}:${value}`),`${token} ${value}`);
 for(const [token,value] of [['--bg-base','#0e1220'],['--text-primary','#e7eaf2'],['--primary','#8396f2'],['--accent','#52c7ba'],['--warning','#e3b862'],['--danger','#e28585'],['--surface','rgba(30,37,58,.45)'],['--surface-strong','rgba(36,44,68,.70)'],['--border-glass','rgba(255,255,255,.08)'],['--shadow','0 8px 32px rgba(0,0,0,.35)'],['--text-secondary','#a9b0c2']])assert.ok(dark.includes(`${token}:${value}`),`${token} ${value}`);
 assert.ok(css.includes('transition:background-color .3s,color .3s'));
 assert.ok(css.includes('@media(prefers-color-scheme:dark)')||css.includes('prefers-color-scheme'));
});
test('Glassmorphism applies to fields, cards and dialogs with a readable fallback',()=>{
 assert.ok(css.includes('backdrop-filter:blur(14px) saturate(140%)'));
 assert.ok(css.includes('-webkit-backdrop-filter:blur(14px) saturate(140%)'));
 assert.ok(css.includes('@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)))'));
 const fallback=css.slice(css.indexOf('@supports not'));
 for(const selector of ['button','input','select','textarea','.card','dialog'])assert.ok(fallback.includes(selector),selector);
 assert.ok(fallback.includes('background:var(--surface-strong)'));
 for(const rule of ['body::before','body::after','filter:blur(80px)','pointer-events:none','position:fixed','--bg-gradient'])assert.ok(css.includes(rule),rule);
});
test('Offline font and accessible touch and focus rules are shipped',async()=>{
 for(const file of ['vazirmatn-arabic.woff2','vazirmatn-latin.woff2','vazirmatn-LICENSE.txt'])await access(new URL('../assets/'+file,import.meta.url));
 for(const rule of ['font-display:swap','font:15px/1.6 Vazirmatn,Tahoma,sans-serif','font-size:16px','min-height:44px','input:focus,select:focus,textarea:focus{outline:none;border-color:var(--primary)','box-shadow:0 0 0 3px var(--primary-soft)','prefers-reduced-motion','font-variant-numeric:tabular-nums','safe-area-inset-bottom','button:active{transform:scale(.98)}'])assert.ok(css.includes(rule),rule);
 assert.ok(!/background-wave/.test(css));
 assert.ok(css.includes('@keyframes met-shine'));assert.ok(css.includes('animation:met-shine 5s'));
});
test('Mobile layout is compact and keeps sticky tabs and two-column short fields',()=>{
 for(const rule of ['max-width:767px','repeat(3,minmax(0,1fr))','.calendar:not(.zoom) .shift-chip{display:none}','.calendar-summary{display:block','body:has(input:focus) .sidebar','max-height:65dvh','touch-action:pan-x pan-y','height:100dvh','.is-fullscreen .plan-board-scroll{flex:1;min-height:0;max-height:none}','.planning-tabs{position:sticky','.shift-row,.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))','.card{padding:var(--space-3)'])assert.ok(css.includes(rule),rule);
 assert.ok(!css.includes('plan-matrix'));
 assert.ok(!/color:\s*#[0-9a-f]{3,6}/i.test(css.slice(0,css.indexOf('@media print')).replace(/--[\w-]+:#[0-9a-f]{3,6}/gi,'')));
});
test('Planning uses a separate local font without changing the application font',async()=>{
 for(const file of ['noto-arabic.woff2','noto-latin.woff2','noto-LICENSE.txt'])await access(new URL('../assets/'+file,import.meta.url));
 assert.ok(css.includes('.planning-page #main,.planning-page dialog,.planning-page #print-area{font-family:PlanningNoto,Tahoma,sans-serif}'));
 assert.ok(css.includes('font:15px/1.6 Vazirmatn,Tahoma,sans-serif'));
});
test('Printing keeps full shift details independently of mobile display',()=>{
 const print=css.slice(css.indexOf('@media print'));
 assert.ok(print.includes('#print-area .calendar .shift-chip{display:block}'));
 assert.ok(print.includes('#print-area .calendar-summary{display:none}'));
});
