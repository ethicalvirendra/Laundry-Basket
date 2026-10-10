const fs = require('fs');
const c = fs.readFileSync('C:/Projects/Laundry Basket/Web/server.js', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('static') || l.includes('sendFile') || l.includes('express.static')) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
