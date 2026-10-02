# 🚀 Laundry Basket Web Deployment Guide

This guide contains instructions for deploying the Laundry Basket ecosystem (Backend & Frontend) to ensure everything stays in sync with your mobile applications.

## 1. Backend Deployment (Node.js)
The backend is located in the `Web/backend` directory.

### Prerequisites:
- Node.js (v16+)
- MongoDB Atlas (or local MongoDB)
- MSG91 Account (for OTP)

### Configuration:
1. Update `Web/backend/.env` with your production values:
   - `MONGODB_URI`: Your production database URL.
   - `PORT`: Usually 5000 or 5001.
   - `JWT_SECRET`: A strong secret key.
   - `MSG91_AUTH_KEY`: Your SMS auth key.

### Deployment Steps:
1. Upload the `Web/backend` folder to your server (e.g., Railway, Render, VPS).
2. Run `npm install`.
3. Start the server using `npm start` or `pm2 start server.js`.

---

## 2. Frontend Deployment (Landing Page & Dashboards)
The frontend consists of static files in the `Web` root and the `admin-dashboard` / `manager-panel` folders.

### Synchronization:
- All frontend JS files (`assets/js/scripts.js`, `Pages/booking.html`, etc.) are configured to automatically detect the environment.
- **Local:** Uses `http://localhost:5000/api`.
- **Production:** Uses `/api` (assumes the backend is serving the frontend or is behind a reverse proxy).

### Deployment Steps:
1. Upload the entire contents of the `Web` directory (excluding `backend`) to your web hosting provider (e.g., Vercel, Netlify, or your own server's public folder).
2. Ensure your domain is pointing to this folder.

---

## 3. Key Synchronization Rules
- **Order IDs:** Now generated exclusively by the backend to ensure the App, Web, and Admin Dashboard see the exact same ID (e.g., `LBBPL1`).
- **Store Mapping:** Ensure the `storeId` in the database matches the one used in the App configuration.

## 📱 Mobile Apps Stability
The apps have been hardened with `runZonedGuarded` and defensive error handling.

### Rider App (Delivery)
*   **Google Maps API:** The Rider App requires a valid Google Maps API key to initialize. Without this, the app will crash upon loading map-related views.
*   **Location Services:** Ensure "High Accuracy" location is enabled. The app now includes checks to prevent crashes if GPS is turned off.
*   **Permissions:** Physical activity and Background location are required for real-time tracking to work when the screen is off.
- **Authentication:** All platforms use the same JWT-based session system.

---

## 4. File Structure Summary
- `Web/index.html`: Main landing page (SEO optimized).
- `Web/Pages/`: All secondary pages (Services, Booking, Profile).
- `Web/admin-dashboard/`: Admin interface for global management.
- `Web/manager-panel/`: Store-specific management interface.
- `Web/backend/server.js`: The heart of the ecosystem.

---
*Developed by ethicalvirendra.com*
