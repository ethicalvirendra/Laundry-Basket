#!/bin/bash
# ============================================================
# Laundry Basket - Hostinger Deployment Script
# ============================================================

set -e

echo "🚀 Starting Laundry Basket deployment..."

APP_DIR="/home/u130958259/domains/laundrybasketunicorn.com/public_html"
NODE_APP_DIR="/home/u130958259/domains/laundrybasketunicorn.com/public_html"

cd $APP_DIR

echo "📦 Installing backend dependencies..."
npm install --production

echo "📦 Installing manager-panel dependencies..."
cd manager-panel && npm install && npm run build && cd ..

echo "📦 Installing admin-dashboard dependencies..."
cd admin-dashboard && npm install && npm run build && cd ..

echo "🔧 Configuring PM2..."
pm2 delete all 2>/dev/null || true

pm2 start server.js --name "laundry-backend" --env production

pm2 start npm --name "manager-panel" -- run start --prefix manager-panel -- -p 3000
pm2 start npm --name "admin-dashboard" -- run start --prefix admin-dashboard -- -p 3001

pm2 save

echo "✅ Deployment complete!"
echo "🌍 Website: https://www.laundrybasketunicorn.com"
echo "👨‍💼 Manager: https://www.laundrybasketunicorn.com/manager/"
echo "🛡️ Admin: https://www.laundrybasketunicorn.com/admin/"

pm2 list
