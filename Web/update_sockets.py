import re
with open('C:/Projects/Laundry Basket/Web/server.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(r'(const newOrder = new Order\(orderData\);\s*await newOrder\.save\(\);)', r'\1\n        req.io.emit("order_created", newOrder);', code)
code = re.sub(r'(const updatedOrder = await Order\.findOneAndUpdate\([\s\S]*?\{ new: true \}\s*\);)', r'\1\n        req.io.emit("order_updated", updatedOrder);', code)

code = re.sub(r'(const newRate = new Rate\(req\.body\);\s*await newRate\.save\(\);)', r'\1\n        req.io.emit("rates_updated", newRate);', code)
code = re.sub(r'(const updatedRate = await Rate\.findByIdAndUpdate\([\s\S]*?\{ new: true \}\s*\);)', r'\1\n        req.io.emit("rates_updated", updatedRate);', code)
code = re.sub(r'(await Rate\.findByIdAndDelete\(req\.params\.id\);)', r'\1\n        req.io.emit("rates_updated", { deleted: req.params.id });', code)

code = re.sub(r'(const newStore = new Store\(req\.body\);\s*await newStore\.save\(\);)', r'\1\n        req.io.emit("stores_updated", newStore);', code)
code = re.sub(r'(const updatedStore = await Store\.findByIdAndUpdate\([\s\S]*?\{ new: true \}\s*\);)', r'\1\n        req.io.emit("stores_updated", updatedStore);', code)
code = re.sub(r'(await Store\.findByIdAndDelete\(req\.params\.id\);)', r'\1\n        req.io.emit("stores_updated", { deleted: req.params.id });', code)

code = re.sub(r'(const newTicket = new Ticket\(\{[\s\S]*?\}\);\s*await newTicket\.save\(\);)', r'\1\n        req.io.emit("tickets_updated", newTicket);', code)
code = re.sub(r'(const updatedTicket = await Ticket\.findOneAndUpdate\([\s\S]*?\{ new: true \}\s*\);)', r'\1\n        req.io.emit("tickets_updated", updatedTicket);', code)

with open('C:/Projects/Laundry Basket/Web/server.js', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated server.js with socket emits!")
