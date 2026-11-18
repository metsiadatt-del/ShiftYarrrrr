// Approved ShiftYar artwork. Kept at module scope so the interface can show the
// real icon and the PNG/ICO build step can reuse the exact same picture.
const iconPalette={primary:[0x5B,0x6F,0xE0],accent:[0x2F,0xA7,0x9B],ink:[0x1F,0x24,0x33],paper:[0xEE,0xF1,0xF7]};
// Calendar card with two rings and three rows of cells; the lower-right cell is
// replaced by a clock face. Drawing is linear on a 1000-unit grid.
function iconSymbol({ink,primary,paper},{rings=true,clock=true}={}){
  const cells=[[380,540],[500,540],[620,540],[380,660],[500,660]];
  const ringsSvg=rings?`<path d="M420 250v70M580 250v70" stroke="${ink}" stroke-width="34" stroke-linecap="round"/>`:'';
  return `<g fill="none" stroke-linejoin="round">
    <rect x="300" y="340" width="400" height="360" rx="40" fill="${primary}" stroke="none"/>
    <rect x="330" y="300" width="340" height="340" rx="34" fill="${paper}" stroke="${primary}" stroke-width="34"/>
    ${ringsSvg}
    ${cells.map(([x,y])=>`<rect x="${x-34}" y="${y-34}" width="68" height="68" rx="16" fill="${primary}" stroke="none"/>`).join('')}
    ${clock?`<circle cx="640" cy="640" r="105" fill="${paper}" stroke="${primary}" stroke-width="30"/>
    <path d="M640 585v62l46 34" stroke="${ink}" stroke-width="30" stroke-linecap="round"/>`:''}
  </g>`;
}
const iconFont='Vazirmatn,Tahoma,sans-serif';
const iconMark=(size=22)=>`<svg viewBox="0 0 1000 1000" width="${size}" height="${size}" aria-hidden="true">${iconSymbol({ink:`rgb(${iconPalette.ink})`,primary:`rgb(${iconPalette.primary})`,paper:`rgb(${iconPalette.paper})`})}</svg>`;
export { iconPalette, iconSymbol, iconFont, iconMark };
