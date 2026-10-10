const fs = require('fs'); 
let t = fs.readFileSync('Pages/booking.html', 'utf8'); 
t = t.replace("modal.style.display = 'flex';", "window.location.href = 'thank-you.html?orderId=' + savedOrder.id; // modal.style.display = 'flex';"); 
fs.writeFileSync('Pages/booking.html', t);
