# College Hackathon Platform frontend

The React/Vite frontend provides student registration, sign-in, session restoration, and role-protected temporary landing pages.

## Setup

Install dependencies and configure the backend URL:

```powershell
npm install
if (-not (Test-Path .env.development)) {
  Copy-Item .env.example .env.development
}
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.development` to the backend API base URL, normally `http://localhost:5000/api/v1`. Vite environment values are public; do not put credentials or secrets in them.

## Authentication behavior

- The access token is kept in application memory only.
- The refresh token stays in the backend's HttpOnly cookie and is never read by frontend JavaScript.
- API requests send credentials so the browser can include that cookie on refresh and logout.
- On startup, the app attempts to restore a session. Concurrent expired-token requests share a single refresh operation.
- Frontend role routes are navigation checks only; backend authentication and RBAC remain authoritative.

Routes include `/login`, `/register`, `/admin`, `/faculty`, `/student`, `/unauthorized`, and `/status`.

## Commands

- `npm run dev` — start the Vite development server.
- `npm run lint` — run ESLint.
- `npm run build` — create a production build.
