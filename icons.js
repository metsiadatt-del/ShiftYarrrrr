// Draws the approved ShiftYar artwork into every install and shortcut image.
// Only plain shapes are rasterised, so the build never needs a browser.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { iconPalette } from '../icon-art.js';

const root=new URL('../',import.meta.url);
const out=new URL('icons/',root);
mkdirSync(out,{recursive:true});

const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
const P=hex(iconPalette.primary),A=hex(iconPalette.accent),K=hex(iconPalette.ink),W=hex(iconPalette.paper);
const CELLS=[[380,540],[500,540],[620,540],[380,660],[500,660]];

// Source of truth for the picture: calendar card, two rings, cells, one clock.
const symbol=`<g fill="none" stroke-linejoin="round">
<rect x="300" y="340" width="400" height="360" rx="40" fill="${P}"/>
<rect x="330" y="300" width="340" height="340" rx="34" fill="${W}" stroke="${P}" stroke-width="34"/>
<path d="M420 250v70M580 250v70" stroke="${K}" stroke-width="34" stroke-linecap="round"/>
${CELLS.map(([x,y])=>`<rect x="${x-34}" y="${y-34}" width="68" height="68" rx="16" fill="${P}"/>`).join('')}
<circle cx="640" cy="640" r="105" fill="${W}" stroke="${P}" stroke-width="30"/>
<path d="M640 585v62l46 34" stroke="${K}" stroke-width="30" stroke-linecap="round"/></g>`;

function svg(size,glyph){
  const scale=glyph/1000,offset=(size-glyph)/2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`+
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P}"/><stop offset="1" stop-color="${A}"/></linearGradient></defs>`+
    `<rect width="${size}" height="${size}" rx="${(size*.22).toFixed(2)}" fill="url(#g)"/>`+
    `<g transform="translate(${offset.toFixed(2)} ${offset.toFixed(2)}) scale(${scale.toFixed(4)})">${symbol}</g></svg>`;
}

// Distance (in glyph units) from a pixel centre to a shape boundary.
function distRoundRect(x,y,x0,y0,w,h,r){
  const qx=Math.max(x0+r-x,x-(x0+w-r),0),qy=Math.max(y0+r-y,y-(y0+h-r),0);
  return Math.hypot(qx,qy)-r;
}
const cover=d=>Math.min(1,Math.max(0,.5-d));

function raster(size,glyph){
  const px=new Float32Array(size*size*4),scale=size/1000,off=(size-glyph)/2;
  const toLocal=v=>(v-off)/scale;
  const blend=(x,y,colour,alpha)=>{
    if(alpha<=0||x<0||y<0||x>=size||y>=size)return;
    const i=(y*size+x)*4;px[i]=px[i]*(1-alpha)+colour[0]*alpha;px[i+1]=px[i+1]*(1-alpha)+colour[1]*alpha;px[i+2]=px[i+2]*(1-alpha)+colour[2]*alpha;px[i+3]=px[i+3]*(1-alpha)+alpha*255;
  };
  // Card background: rounded square with a diagonal primary→accent gradient.
  const corner=size*.22;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=Math.min(Math.max(x+.5,corner),size-corner),ny=Math.min(Math.max(y+.5,corner),size-corner);
    const d=Math.hypot(x+.5-nx,y+.5-ny)-corner;
    if(d>.5)continue;
    const t=((x/(size-1))+(y/(size-1)))/2;
    blend(x,y,[0,1,2].map(k=>Math.round(iconPalette.primary[k]+(iconPalette.accent[k]-iconPalette.primary[k])*t)),cover(d)||1);
  }
  const each=(x0,y0,x1,y1,fn)=>{for(let y=Math.max(0,y0);y<Math.min(size,y1);y++)for(let x=Math.max(0,x0);x<Math.min(size,x1);x++)fn(x,y);};
  const fillRect=(x0,y0,w,h,r,colour)=>each(Math.floor(off+x0*scale),Math.floor(off+y0*scale),Math.ceil(off+(x0+w)*scale)+1,Math.ceil(off+(y0+h)*scale)+1,(x,y)=>blend(x,y,colour,cover(distRoundRect(toLocal(x+.5),toLocal(y+.5),x0,y0,w,h,r))));
  const strokeRect=(x0,y0,w,h,r,width,colour)=>each(Math.floor(off+(x0-width)*scale),Math.floor(off+(y0-width)*scale),Math.ceil(off+(x0+w+width)*scale)+1,Math.ceil(off+(y0+h+width)*scale)+1,(x,y)=>blend(x,y,colour,cover(Math.abs(distRoundRect(toLocal(x+.5),toLocal(y+.5),x0,y0,w,h,r))-width/2)));
  const fillCircle=(cx,cy,r,colour)=>each(Math.floor(off+(cx-r)*scale),Math.floor(off+(cy-r)*scale),Math.ceil(off+(cx+r)*scale)+1,Math.ceil(off+(cy+r)*scale)+1,(x,y)=>blend(x,y,colour,cover(Math.hypot(toLocal(x+.5)-cx,toLocal(y+.5)-cy)-r)));
  const strokeCircle=(cx,cy,r,width,colour)=>each(Math.floor(off+(cx-r-width)*scale),Math.floor(off+(cy-r-width)*scale),Math.ceil(off+(cx+r+width)*scale)+1,Math.ceil(off+(cy+r+width)*scale)+1,(x,y)=>blend(x,y,colour,cover(Math.abs(Math.hypot(toLocal(x+.5)-cx,toLocal(y+.5)-cy)-r)-width/2)));
  const line=(x1,y1,x2,y2,width,colour)=>{const steps=Math.ceil(Math.hypot(off+x2*scale-off-x1*scale,off+y2*scale-off-y1*scale)*2);for(let i=0;i<=steps;i++){const t=i/steps;fillCircle(x1+(x2-x1)*t,y1+(y2-y1)*t,width/2,colour);}void 0;};
  fillRect(560,620,110,40,20,iconPalette.primary);
  fillRect(330,300,340,340,34,iconPalette.paper);
  strokeRect(330,300,340,340,34,34,iconPalette.primary);
  line(420,267,420,320,34,iconPalette.ink);line(580,267,580,320,34,iconPalette.ink);
  for(const [x,y] of CELLS)fillRect(x-34,y-34,68,68,16,iconPalette.primary);
  fillCircle(640,640,120,iconPalette.primary);
  fillCircle(640,640,105,iconPalette.paper);
  line(640,588,640,646,30,iconPalette.ink);line(640,646,686,681,30,iconPalette.ink);
  const data=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++){data[y*(size*4+1)]=0;for(let x=0;x<size;x++){const i=(y*size+x)*4;for(let k=0;k<4;k++)data[y*(size*4+1)+1+x*4+k]=Math.round(Math.min(255,Math.max(0,px[i+k])));}}
  return data;
}

let table;
function crc32(buffer){if(!table){table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0;}}let c=0xFFFFFFFF;for(const b of buffer)c=table[(c^b)&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function png(size,glyph){
  const raw=raster(size,glyph);
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const body=Buffer.concat([Buffer.from(type),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body));return Buffer.concat([len,body,crc]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}

function ico(entries){
  const header=Buffer.alloc(6);header.writeUInt16LE(1,2);header.writeUInt16LE(entries.length,4);
  const dirs=[];let offset=6+16*entries.length;
  for(const {size,data} of entries){const d=Buffer.alloc(16);d[0]=size>=256?0:size;d[1]=size>=256?0:size;d.writeUInt16LE(1,4);d.writeUInt16LE(32,6);d.writeUInt32LE(data.length,8);d.writeUInt32LE(offset,12);offset+=data.length;dirs.push(d);}
  return Buffer.concat([header,...dirs,...entries.map(e=>e.data)]);
}

const files={
  'icon.svg':svg(512,512*.78),
  'icon-192.png':png(192,192*.78),
  'icon-512.png':png(512,512*.78),
  'icon-maskable-192.png':png(192,192*.6),
  'icon-maskable-512.png':png(512,512*.6),
  'apple-touch-icon.png':png(180,180*.76),
  'favicon-32.png':png(32,32*.84),
  'favicon-16.png':png(16,16*.88)
};
for(const [name,content] of Object.entries(files))writeFileSync(new URL(name,out),content);
writeFileSync(new URL('favicon.ico',root),ico([[16,files['favicon-16.png']],[32,files['favicon-32.png']],[48,png(48,48*.82)],[64,png(64,64*.8)],[128,png(128,128*.78)],[256,png(256,256*.78)]].map(([size,data])=>({size,data}))));
console.log('icons written:',Object.keys(files).join(', '),', favicon.ico');
