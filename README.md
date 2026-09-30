# Driver Hub

Driver Hub connects professional drivers with employers hiring for driver roles. The repository is an npm workspace with a React/Vite/Capacitor client and a Node/Express/TypeScript API. PostgreSQL and Prisma provide persistence; JWT access tokens authenticate API requests.

## Structure

- `client/`: existing responsive React experience and Android Capacitor project.
- `server/`: Express API, Prisma schema/migrations, seed data, and API tests.

The client uses API authentication and the Driver workspace is connected to live API data. Employer and Admin workspaces remain role-protected Phase 5 surfaces.

## Setup

```sh
npm install
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Set a real PostgreSQL `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters in `server/.env`. Keep `CLIENT_ORIGIN=http://localhost:5173` for local browser CORS. Set `VITE_API_URL=http://localhost:4000/api` in `client/.env`. Then run:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:all
```

`npm run dev:all` starts both processes: the API on port 4000 and the Vite client on port 5173. The API REST prefix is `/api`.

## Phase 1 API

- `GET /api/health`
- `POST /api/auth/register` (Driver or Employer only)
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer access token required)

Use [server/requests.http](server/requests.http) with the VS Code REST Client extension to exercise registration, login, `/me`, and rejected Admin self-registration.

## Seed Credentials

Seeded driver accounts use `Driver@123`, employer accounts use `Employer@123`, and the admin account uses `Admin@123`.

- Admin: `admin@driverhub.com`
- Employers: `hiring@northstarfreight.com`, `jobs@goodwellsupply.com`
- Drivers: `jamie@driverhub.com`, `jordan@driverhub.com`, `riley@driverhub.com`, `alex@driverhub.com`, `casey@driverhub.com`

## Android

The Capacitor project is under `client/android`. After setting up the client, `npm run android:sync` rebuilds and copies web assets to the native wrapper; Android Studio and its SDK are required to build an APK.

## Checks

```sh
npm run build
npm test
```