# College Hackathon Platform

A web application foundation for a college hackathon platform. The current implementation provides a React development-status page and an Express API health endpoint backed by PostgreSQL. Business features are not implemented yet.

## Technology stack

- **Frontend:** React, Vite, JavaScript, Axios, React Router DOM
- **Backend:** Node.js, Express, Prisma ORM 6, Zod, Helmet, CORS, dotenv
- **Database:** PostgreSQL

## Project structure

```text
college-hackathon-platform/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/database.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .agents/          # Prisma-related local guidance
│   ├── .claude/          # Prisma-related local guidance
│   ├── .windsurf/        # Prisma-related local guidance
│   ├── .env.example
│   └── package.json
├── docs/
├── web/
│   ├── .env.development
│   ├── src/
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── healthService.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js and npm
- PostgreSQL 18 running locally or reachable from the backend

## PostgreSQL setup

Create a PostgreSQL database for local development if one does not already exist. For example, from `psql`:

```sql
CREATE DATABASE college_hackathon_platform;
```

Set `DATABASE_URL` in `backend/.env` to the connection URL for your own PostgreSQL installation. Do not commit this file or share its credentials. URL-encode special characters in the username or password.

## Environment setup

The backend reads `PORT`, `NODE_ENV`, `DATABASE_URL`, and `CLIENT_URL` from `backend/.env`. Use `backend/.env.example` as a reference and create the local file only if it does not already exist:

```powershell
if (-not (Test-Path backend\.env)) {
  Copy-Item backend\.env.example backend\.env
}
```

Edit `backend/.env` locally and provide your own database URL.

The Vite frontend reads `VITE_API_BASE_URL` from `web/.env.development`. The local development value is `http://localhost:5000/api/v1`; `web/.env.example` documents the same setting. Frontend environment variables are public to the browser and must not contain secrets.

## Install and run

Install backend dependencies and start the API in one terminal:

```powershell
cd backend
npm install
npm run dev
```

The backend connects to PostgreSQL before it starts listening. The health endpoint checks both the API and database.

Install frontend dependencies and start Vite in a second terminal:

```powershell
cd web
npm install
npm run dev
```

The frontend package also provides `npm run lint` and `npm run build`.

## Local development URLs

- Frontend: <http://localhost:5173>
- Backend health endpoint: <http://localhost:5000/api/v1/health>

The health endpoint returns HTTP 200 when PostgreSQL is available and HTTP 503 when the database check fails.

## Troubleshooting

- **Backend exits before listening:** Check that PostgreSQL is running, the database exists, and `DATABASE_URL` in `backend/.env` is correct. Keep credentials private and URL-encode special characters.
- **Frontend cannot reach the API:** Confirm the backend is listening on port 5000 and `VITE_API_BASE_URL` is `http://localhost:5000/api/v1`.
- **CORS error:** The backend's `CLIENT_URL` must match the frontend origin, normally `http://localhost:5173`.
- **Port already in use:** Stop the process using the configured port or change the corresponding local development port and URL settings.
