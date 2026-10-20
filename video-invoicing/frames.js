// Scene frame map for storyboard stills. Reads LEAD/TAIL from src/timing.ts so it can never drift from the composition.
const fs=require('fs');
const t=fs.readFileSync(__dirname+'/src/timing.ts','utf8');
const LEAD=parseFloat(/LEAD = ([0-9.]+)/.exec(t)[1]), TAIL=parseFloat(/TAIL = ([0-9.]+)/.exec(t)[1]), FPS=30;
const vo=require('./public/vo/vo.json');
let f=0; const out=[];
for (const s of vo.scenes){ const len=Math.ceil((LEAD+s.duration+TAIL)*FPS); out.push({id:s.id,start:f,len,mid:f+Math.round(len*0.72),end:f+len-12}); f+=len; }
console.log(JSON.stringify({lead:LEAD,tail:TAIL,total:f,seconds:(f/FPS).toFixed(1),scenes:out}));
