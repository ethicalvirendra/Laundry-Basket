const fs = require('fs'); 
const txt = fs.readFileSync('manager-panel/src/app/page.tsx', 'utf8'); 
const lines = txt.split('\n'); 
lines.forEach((l, i) => { if(l.toLowerCase().includes('gst')) console.log(i, l); });
