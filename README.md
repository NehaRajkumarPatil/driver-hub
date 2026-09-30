# Driver Hub

Live web: `https://<your-vercel-domain>`  
Live API: `https://<your-render-service>.onrender.com/api`

## Demo logins

- Driver: `jamie@driverhub.com` / `Driver@123`
- Employer: `hiring@northstarfreight.com` / `Employer@123`
- Admin: `admin@driverhub.com` / `Admin@123`

## Run locally

```powershell
npm install
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Set `DATABASE_URL` and a 32+ character `JWT_SECRET` in `server/.env`. Keep `CLIENT_ORIGIN=http://localhost:5173`; set `VITE_API_URL=http://localhost:4000/api` in `client/.env`. Then initialize Neon/Postgres and start both apps:

```powershell
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev:all
```

## Deploy

1. **Neon:** Create a PostgreSQL database. Put its SSL connection string in `server/.env` as `DATABASE_URL`, then run `npm run db:deploy` and `npm run db:seed` once.
2. **Vercel:** Import the repository with Root Directory `client`. Use `client/vercel.json` (build `npm run build`, output `dist`) and deploy to reserve the site domain.
3. **Render:** Create a Web Service from this repository using `render.yaml` (root directory `.`). Set `DATABASE_URL` to the Neon URL and `CLIENT_ORIGIN` to the Vercel origin, for example `https://driver-hub.vercel.app`. Render builds with `npm ci && npm run db:generate --workspace server && npm run build --workspace server`, starts with `npm run start --workspace server`, and checks `/api/health`. Keep the generated `JWT_SECRET` private.
4. **Connect Vercel:** Set `VITE_API_URL` to `https://<your-render-service>.onrender.com/api` in Vercel and redeploy. Add comma-separated Vercel preview origins to Render's `CLIENT_ORIGIN` if those previews need API access.

The Driver workspace uses the live API. Employer and Admin workspaces include job management, applicant hiring actions/contact controls, driver search, account moderation, job review, applications, and platform stats. Android uses the same client build.