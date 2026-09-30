# Driver Hub

Driver Hub connects professional drivers with employers hiring for driver roles. The repository is an npm workspace with a React/Vite/Capacitor client and a Node/Express/TypeScript API. PostgreSQL and Prisma provide persistence; JWT access tokens authenticate API requests.

## Structure

- `client/`: existing responsive React experience and Android Capacitor project.
- `server/`: Express API, Prisma schema/migrations, seed data, and API tests.

The client UI is still the original local demo in this phase. Frontend authentication and API integration are planned for Phase 4.

## Setup

```sh
npm install
Copy-Item server/.env.example server/.env
```

Set a real PostgreSQL `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters in `server/.env`. Then run:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:server
```

In another terminal, start the existing web client with `npm run dev`. The API listens on port 4000 by default; its REST prefix is `/api`.

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