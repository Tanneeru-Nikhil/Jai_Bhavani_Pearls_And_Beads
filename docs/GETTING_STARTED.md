# Getting Started: Jai Bhavani Pearls & Beads

This guide provides immediate instructions to launch both the backend and frontend servers, log into the admin portal, and test the platform.

---

## ⚡ Quick Start Cheatsheet

### 1. Start the Backend API (FastAPI)

```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Server: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Start the Frontend Application (Vite + React)

```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Credentials & Access

### Admin Portal
- **Login URL**: [http://localhost:3000/login](http://localhost:3000/login)
- **Direct Portal URL**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Email**: `admin@jaibhavani.com`
- **Password**: `admin123`

### Demo Customer
- **Login URL**: [http://localhost:3000/login](http://localhost:3000/login)
- **Mobile OTP Login (Default)**: Enter mobile number (e.g., `9811122233` or any 10-digit number) and verify with OTP code `123456`.
- **Email Login**: `customer@jaibhavani.com` / `customer123`

---

## 🛠️ Common Tasks & Commands

| Task | Command | Directory |
| :--- | :--- | :--- |
| **Run Frontend Dev Server** | `npm run dev` | `frontend/` |
| **Build Frontend for Production** | `npm run build` | `frontend/` |
| **TypeScript Typecheck** | `npm run type-check` | `frontend/` |
| **Preview Built Frontend** | `npm run preview` | `frontend/` |
| **Run Backend API** | `python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload` | `backend/` |
| **Reset Database** | Delete `backend/app.db` and re-run backend server (auto-reseeds) | `backend/` |
