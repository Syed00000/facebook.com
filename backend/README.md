# 🚀 Facebook Clone - Backend

## 📋 What's in Backend:
- `server.js` - Main Express server
- `package.json` - Backend dependencies
- `.env` - Environment variables
- `test-app.js` - Database connection test

## ⚙️ Backend Features:
- Express.js REST API
- MongoDB with Mongoose
- CORS configured
- Login capture endpoints
- Admin panel API
- Real-time data storage

## 🚀 Start Backend:
```bash
cd backend
npm install
npm run dev
```

## 🔗 API Endpoints:
- `POST /api/login` - Capture login attempts
- `GET /api/admin/users` - Get all users (admin)
- `DELETE /api/admin/users/:id` - Delete user
- `DELETE /api/admin/users` - Clear all data

## 🌐 URLs:
- Server: http://localhost:3000
- API: http://localhost:3000/api

## 📊 Environment Variables:
```env
PORT=3000
MONGODB_URI=mongodb+srv://...
NODE_ENV=development
JWT_SECRET=...
```
