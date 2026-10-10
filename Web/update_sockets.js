const fs = require('fs');

let code = fs.readFileSync('C:/Projects/Laundry Basket/Web/server.js', 'utf-8');

code = code.replace(/(const newOrder = new Order\(orderData\);\s*await newOrder\.save\(\);)/g, `$1\n        req.io.emit("order_created", newOrder);`);
code = code.replace(/(const updatedOrder = await Order\.findOneAndUpdate\([\s\S]*?\{ new: true \}\s*\);)/g, `$1\n        req.io.emit("order_updated", updatedOrder);`);

code = code.replace(/(const newRate = new Rate\(req\.body\);\s*await newRate\.save\(\);)/g, `$1\n        req.io.emit("rates_updated", newRate);`);
code = code.replace(/(const updatedRate = await Rate\.findByIdAndUpdate\([\s\S]*?\{ new: true \}\s*\);)/g, `$1\n        req.io.emit("rates_updated", updatedRate);`);
code = code.replace(/(await Rate\.findByIdAndDelete\(req\.params\.id\);)/g, `$1\n        req.io.emit("rates_updated", { deleted: req.params.id });`);

code = code.replace(/(const newStore = new Store\(req\.body\);\s*await newStore\.save\(\);)/g, `$1\n        req.io.emit("stores_updated", newStore);`);
code = code.replace(/(const updatedStore = await Store\.findByIdAndUpdate\([\s\S]*?\{ new: true \}\s*\);)/g, `$1\n        req.io.emit("stores_updated", updatedStore);`);
code = code.replace(/(await Store\.findByIdAndDelete\(req\.params\.id\);)/g, `$1\n        req.io.emit("stores_updated", { deleted: req.params.id });`);

code = code.replace(/(const newTicket = new Ticket\(\{[\s\S]*?\}\);\s*await newTicket\.save\(\);)/g, `$1\n        req.io.emit("tickets_updated", newTicket);`);
code = code.replace(/(const updatedTicket = await Ticket\.findOneAndUpdate\([\s\S]*?\{ new: true \}\s*\);)/g, `$1\n        req.io.emit("tickets_updated", updatedTicket);`);

fs.writeFileSync('C:/Projects/Laundry Basket/Web/server.js', code, 'utf-8');
console.log("Updated server.js with socket emits!");
