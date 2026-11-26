/* ===== Secret Catalyst pixel sprite kit v2 (shared by every mockup). 1 char = 1 art pixel. =====
 * Reference implementation for src/lib/sprites.ts + <Sprite>/<Halo>/<Hazard>.
 * Round 2: Rare is a diamond-shouldered decanter with a 6-row gem stopper; halos are stepped
 * octagons built from 2x2 art-px blocks (no circles, no gradients); sealed "?" flask for public surfaces.
 */
const P={k:'#071312',K:'#071312',g:'#183b36',G:'#2c5a52',w:'#e9fff9',l:'#dce7ee',m:'#a9bcc8',R:'#8a3b32',r:'#5a231e',c:'#9a7048',C:'#5e4026',
 Y:'#f7c61b',o:'#ff5a36',y:'#ffb547',W:'#fff4c2',A:'#c98a2a',a:'#ffb547',S:'#ffe14a',Z:'#d9a400',f:'#dce7ee',P:'#a57bff',E:'#4db2ff',N:'#4bf08b',
 n:'#b9ffd2',Q:'#ff5fae',q:'#b8306e',T:'#ffffff',t:'#9daec6',x:'#e9e2d0',z:'#071312',v:'#5e676b',V:'#8a9599',F:'#bdf4ff',j:'#6cc9e6',s:'#8a9a96',
 p:'#eadf9e',U:'#ff4b3e',u:'#7a1f19'};
const LIQ={common:{L:'#9fc2b8',D:'#6f9388',H:'#cfe6de'},uncommon:{L:'#3ff0e6',D:'#16b3b5',H:'#b5fff8'},rare:{L:'#e4ecf7',D:'#9daec6',H:'#ffffff'},
 isotope:{L:'#d4ff2a',D:'#8dc20a',H:'#f3ffb0'},legendary:{L:'#ffcb3d',D:'#d9851c',H:'#fff0b0',c:'#ffcb3d'},
 heat:{L:'#ff5a36',D:'#b8321c',H:'#ffb09a'},pressure:{L:'#a57bff',D:'#6c46c9',H:'#d9c7ff'},light:{L:'#ffe14a',D:'#c9a400',H:'#fff4b0'},
 electricity:{L:'#4db2ff',D:'#1f6fc2',H:'#b8e0ff'},enzyme:{L:'#4bf08b',D:'#1fa85a',H:'#b9ffd2'},acid:{L:'#ff5fae',D:'#b8306e',H:'#ffc2e0'},
 sludge:{L:'#6b5a2e',D:'#463a1c',H:'#8c7a44'},frozen:{L:'#bdf4ff',D:'#6cc9e6',H:'#ffffff',l:'#e9fbff',m:'#9fdcf0',g:'#9fdcf0',G:'#bdf4ff'},
 empty:{L:'#183b36',D:'#183b36',H:'#2c5a52'},
 /* PUBLIC SURFACES ONLY: catalyzed compounds are wrapped in parchment with a red wax seal, so the liquid color can't out the catalyst. */
 sealed:{L:'#eadf9e',D:'#c9b96a',H:'#f6efc4',c:'#ff4b3e'}};
const SPR={
jar:["................","................","................","....kkkkkkkk....","....kRRRRRRk....","....krrrrrrk....","...kkkkkkkkkk...","..kwggggggggGk..","..kwggggggggGk..","..kHHHHHHHHHHk..","..kLllllllllLk..","..kLllllllllLk..","..kLllllllllLk..","..kLllllllllLk..","..kLmmmmmmmmLk..","..kwLLLLLLLLLk..","..kLLLLLLLLLLk..","..kDLLLLLLLLDk..","..kDDDDDDDDDDk..","...kkkkkkkkkk..."],
flask:["................","......kkkk......","......kcck......","......kCCk......",".....kkkkkk.....","......kwgk......","......kwgk......",".....kkwgkk.....","....kgwgggGk....","...kHHHHHHHHk...","..kLllllllllLk..","..kLllllllllLk..",".kLLllllllllLLk.",".kLLllllllllLLk.",".kwLmmmmmmmmLLk.",".kwLLLLLLLLLLLk.",".kLLLLLLLLLLLDk.","..kDLLLLLLLLDk..","...kDDDDDDDDk...","....kkkkkkkk...."],
/* RARE v2: 6-row faceted gem stopper, 2-px neck (jar mouth is 8), diamond shoulders 16 wide (jar is 12), tapered body on a stem + foot. */
decanter:[".......kk.......","......kTTk......",".....kTTttk.....",".....ktTTtk.....","......kttk......",".......kk.......","......kwgk......","......kwgk......",".....kHHHHk.....","....kwLLLLLk....","...kllllllllk...","..kLllllllllLk..",".kwLllllllllLLk.","kwLLmmmmmmmmLLLk",".kwLLLLLLLLLLLk.","..kLLLLLLLLLLk..","...kDLLLLLLDk...","....kDDDDDDk....","......kGGk......","....kkkkkkkk...."],
ampoule:[".......kk.......","......kwgk......","......kwgk......",".....kkwgkk.....","....kYKYKYKk....","....kKYKYKYk....","....kwggggGk....","...kkHHHHHHkk...","..kwLLLLLLLLLk..","..kwLLLLLLLLLk..","..kLllllllllLk..","..kLllllllllLk..","..kLllllllllLk..","..kLllllllllLk..","..kLmmmmmmmmLk..","..kwLLLLLLLLLk..","..kLLLLLLLLLLk..","...kDLLLLLLDk...","....kDDDDDDk....",".....kkkkkk....."],
erlen:["................",".....kkkkkk.....",".....kcccck.....","......kkkk......","......kwgk......","......kwgk......","......kwgk......",".....kwgggk.....",".....kwgggk.....","....kHHHHHHk....","....kwLLLLLk....","...kwLLLLLLLk...","...kLLLLLLLLk...","..kLLLLLLLLLLk..","..kLLLLLLLLLLk..",".kLLLLLLLLLLLLk.",".kLLLLLLLLLLLLk.","kDLLLLLLLLLLLLDk","kDDDDDDDDDDDDDDk","kkkkkkkkkkkkkkkk"],
qmark:[".kkk.","k...k","....k","..kk.","..k..",".....","..k.."],
tube:["kkkkkk",".kkkk.",".kwgk.",".kwgk.",".kHHk.",".kwLk.",".kwLk.",".kLLk.",".kLLk.",".kLLk.",".kLLk.",".kLLk.",".kLLk.",".kDLk.",".kDDk.","..kk.."],
lampBase:[".....kk.....","...kkkkkk...","..kAaaaaAk..",".kAaaaaaaAk.",".kAaaaaaaAk.","..kkkkkkkk.."],
fA:["......o.....",".....oy.....",".....oyo....","....oyWyo...","....oyWyo...",".....oyo...."],
fB:[".....o......",".....oyo....","....oyyo....","....oyWyo...","....oyWyo...",".....oyo...."],
fC:["......o.....","......yo....",".....oyyo...","....oyWyo...","....oyWyo...",".....oyo...."],
/* ref-2 alarm lamp: lit + dim frames, swapped in steps(1). */
alarmOn:["..kkkk..",".kUUUUk.","kUWUUUUk","kUUUUUUk","kvvvvvvk","kkkkkkkk"],
alarmOff:["..kkkk..",".kuuuuk.","kuuuuuuk","kuuuuuuk","kvvvvvvk","kkkkkkkk"],
i_heat:["....kk....","...kok....","...kook...","..kooyok..","..koyyok..",".kooyWyok.",".koyWWyok.",".koyWWyok.","..koyyok..","...kkkk..."],
i_pressure:["...kkkk...",".kkPPPPkk.",".kPffffPk.","kPffffkfPk","kPfffkffPk","kPffkkffPk","kPffffffPk",".kPffffPk.",".kkPPPPkk.","...kkkk..."],
i_light:["....ZZ....",".Z.kkkk.Z.","..kSSSSk..",".kSWWSSSk.","ZkSWSSSSkZ","ZkSSSSSSkZ",".kSSSSSSk.","..kSSSSk..",".Z.kkkk.Z.","....ZZ...."],
i_electricity:[".....kkkk.","....kEEk..","...kEEk...","..kEEkkkk.",".kEEEEEEk.",".kkkkEEk..","....kEk...","...kEk....","..kEk.....","..kk......"],
i_enzyme:[".kk....kk.",".kNk..knk.","..kNkknk..","...kNnk...","...knNk...","..knkkNk..",".knk..kNk.",".knk..kNk.","..knkkNk..","...kNnk..."],
i_acid:["....kk....","....kk....","...kQQk...","...kQQk...","..kQWQQk..",".kQWQQQQk.",".kQQQQQQk.",".kQQQQqQk.","..kQqqQk..","...kkkk..."],
/* "some catalyst": the public stand-in for every catalyst icon. */
i_mystery:[".kkkkkkkk.","kppppppppk","kppkkkkppk","kpkppppkpk","kppppppkpk","kpppppkppk","kppppkpppk","kppppppppk","kppppkpppk",".kkkkkkkk."],
q7:["kkkkkkk","kpkkppk","kpppkpk","kppkppk","kpppppk","kppkppk","kkkkkkk"],
sun:["k..k..k",".kSSSk.","kSSWSSk",".kSSSk.","k..k..k"],
moon:[".kkk.","kFFk.","kFk..","kFFk.",".kkk."],
mini:["..kk..",".kwgk.","kHHHHk","kLLLLk","kLLLLk",".kkkk."],
flame7:["...k...","..kok..",".koyok.",".koyok.","koyWyok","koyWyok",".kkkkk."],
star:["...k...","..kSk..","kkSWSkk","kSSSSSk",".kSSSk.","kSSkSSk","kk...kk"],
flake:["...F...",".F.F.F.","..FFF..","FFFjFFF","..FFF..",".F.F.F.","...F..."],
haz:["kkkkkkk","kYkYkYk","kkYkYkk","kYkYkYk","kkkkkkk"],
up:["..k..",".kNk.","kNNNk"],
dn:["kQQQk",".kQk.","..k.."],
smoke:["...kkk....","..ksssk...",".ksssssk..","ksssssssk.",".ksssssssk","..kssssk..","...kkkk..."],
qr:["kkk.k.kkk","k.k...k.k","kkk.k.kkk","....k....","k.kk.kk.k","....k....","kkk..k.k.","k.k.kk..k","kkk.k.kk."]
};
const TSPR={common:'jar',uncommon:'flask',rare:'decanter',isotope:'ampoule'};
const PIPN={common:1,uncommon:2,rare:3,isotope:4,legendary:5};

function rects(rows,pal={},ox=0,oy=0){let s='';rows.forEach((row,y)=>{let x=0;while(x<row.length){const ch=row[x];if(ch==='.'){x++;continue}let e=x;while(e<row.length&&row[e]===ch)e++;const col=pal[ch]||P[ch];if(col)s+=`<rect x="${x+ox}" y="${y+oy}" width="${e-x}" height="1" fill="${col}" class="c-${ch}"/>`;x=e}});return s}
function wrap(w,h,sc,inner,cls=''){return `<svg class="sprite ${cls}" width="${w*sc}" height="${h*sc}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`}
function spr(name,sc,pal){const r=SPR[name];return wrap(r[0].length,r.length,sc,rects(r,pal))}
function bubbles(list,ox=0,oy=0){return list.map(([x,y],i)=>`<rect class="bub" x="${x+ox}" y="${y+oy}" width="1" height="1" fill="#ffffff" style="animation-delay:${-i*400}ms"/>`).join('')}
/* 4-point sparkles. The FIRST one never animates, so Rare reads on a still screenshot and under reduced motion. */
function sparkles(list){return list.map(([x,y],i)=>`<g class="${i?'spk':''}" style="animation-delay:${-i*530}ms"><rect x="${x-1}" y="${y}" width="3" height="1" fill="#ffffff"/><rect x="${x}" y="${y-1}" width="1" height="3" fill="#ffffff"/></g>`).join('')}
function bottle(tier,sc,o={}){const rows=SPR[TSPR[tier]];
 if(o.ghost)return wrap(16,20,sc,rects(rows.map(r=>r.replace(/[^k.]/g,'.')),{k:o.ghostCol||'#2a5c54'}),'ghost');
 let s=rects(rows,LIQ[o.liq||tier]);
 if(!o.still&&!o.liq&&tier==='uncommon')s+=bubbles([[6,16],[9,15],[11,16]]);
 if(!o.liq&&tier==='rare')s+=sparkles([[2,8],[14,16],[13,3]]);
 return wrap(16,20,sc,s,tier==='isotope'&&!o.liq?'iso':'')}
/* Compounds: Erlenmeyer. o.sealed = public-surface version (parchment wrap, wax seal, "?"). */
function flask(liq,sc,o={}){if(o.sealed)return wrap(16,20,sc,rects(SPR.erlen,LIQ.sealed)+rects(SPR.qmark,{},6,11));
 let s=rects(SPR.erlen,LIQ[liq]);if(!o.still)s+=bubbles([[5,16],[8,14],[10,17]]);
 return wrap(16,20,sc,s,liq==='legendary'?'prism':(liq==='isotope'?'iso':''))}
function lamp(sc,o={}){let s=rects(SPR.lampBase,{},0,6);if(!o.out)s+=`<g class="f1">${rects(SPR.fA)}</g><g class="f2">${rects(SPR.fB)}</g><g class="f3">${rects(SPR.fC)}</g>`;return wrap(12,12,sc,s)}
/* THE one glow generator. A stepped octagon built from q x q art-px blocks (default 2), two rings at 38% / 16%.
 * Never a CSS circle, radial-gradient, blur or soft box-shadow. Projector and story card just pass their scale. */
function haloRects(r,color,q=2,ox=0,oy=0){let s='';const d=r*2;const lv=(bx,by)=>{const cx=Math.abs(bx+q/2-r),cy=Math.abs(by+q/2-r);const n=Math.max(cx,cy,(cx+cy)*0.75);return n<r*0.56?.38:n<r?.16:0};
 for(let by=0;by<d;by+=q){let bx=0;while(bx<d){const v=lv(bx,by);let e=bx;while(e<d&&lv(e,by)===v)e+=q;if(v)s+=`<rect x="${bx+ox}" y="${by+oy}" width="${e-bx}" height="${q}" fill="${color}" fill-opacity="${v}"/>`;bx=e}}return s}
function halo(r,color,sc,q=2){return wrap(r*2,r*2,sc,haloRects(r,color,q),'halo')}
/* ref-2 door stripes, drawn as a pixel staircase so the diagonal stays crisp. */
function hazard(w,h,sc,band=4){let s='';for(let y=0;y<h;y++){let x=0;const v0=a=>Math.floor((a+y)/band)%2;while(x<w){const v=v0(x);let e=x;while(e<w&&v0(e)===v)e++;s+=`<rect x="${x}" y="${y}" width="${e-x}" height="1" fill="${v?'#071312':'#f7c61b'}"/>`;x=e}}return wrap(w,h,sc,s)}
function mount(root=document){root.querySelectorAll('[data-s]').forEach(el=>{if(el.dataset.done)return;el.dataset.done=1;const d=el.dataset,x=+d.x||4;let h='';
 if(d.s==='bottle')h=bottle(d.t,x,{ghost:'g' in d,liq:d.liq,still:'still' in d});
 else if(d.s==='flask')h=flask(d.t,x,{still:'still' in d,sealed:'sealed' in d});
 else if(d.s==='lamp')h=lamp(x,{out:'out' in d});
 else if(d.s==='icon')h=wrap(10,10,x,rects(SPR['i_'+d.t]));
 else if(d.s==='halo')h=halo(+d.r,d.c,x,+(d.q||2));
 else if(d.s==='hazard')h=hazard(+d.w,+d.h,x);
 else h=spr(d.s,x);
 el.insertAdjacentHTML('afterbegin',h)})}
