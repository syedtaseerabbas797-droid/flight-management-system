# ✈️ AeroNexus Flight Management System

A production-grade modern Flight Management & Operations Suite built with FastAPI, PostgreSQL (Neon), React, Vite, and Groq LLM.

---

## 📁 Monorepo Structure

```
Flight/
├── backend/               # 🐍 FastAPI Backend (FastAPI Cloud ready)
│   ├── app/               # Core application logic, routers, schemas, DB models
│   ├── alembic/           # Database migration revisions
│   ├── tests/             # Automated Pytest suite
│   ├── pyproject.toml     # FastAPI Cloud & packaging metadata
│   ├── requirements.txt   # Python dependencies
│   ├── alembic.ini        # Migration configuration
│   └── .env               # Secrets & DB connection string
│
└── frontend/              # ⚛️ React + TypeScript + Vite Frontends (Vercel ready)
    ├── customer/          # Passenger Booking Portal (Vercel Project 1)
    │   ├── src/
    │   └── vercel.json
    └── admin/             # Airline Operations Console (Vercel Project 2)
        ├── src/
        └── vercel.json
```

---

## 🚀 Deployment Instructions

### 1. Backend &rarr; FastAPI Cloud
```bash
cd backend
python -m fastapi login
python -m fastapi deploy
```
Set environment variables on FastAPI Cloud:
- `DATABASE_URL`: Your Neon Postgres connection string
- `GROQ_API_KEY`: Groq API Key
- `APP_SECRET_KEY`: Production secret key

---

### 2. Frontends &rarr; Vercel
1. **Customer Portal:**
   - Root Directory: `frontend/customer`
   - Framework: `Vite`
   - Environment Variable: `VITE_API_URL=https://<your-fastapi-cloud-app>.fastapicloud.dev/api/v1`

2. **Admin Operations Console:**
   - Root Directory: `frontend/admin`
   - Framework: `Vite`
   - Environment Variable: `VITE_API_URL=https://<your-fastapi-cloud-app>.fastapicloud.dev/api/v1`
