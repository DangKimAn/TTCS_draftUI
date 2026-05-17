# Timesheet Pro Backend

NestJS API for Timesheet Pro.

## Stack

- NestJS 11 + TypeScript
- Prisma ORM
- PostgreSQL/Supabase
- JWT auth + RBAC guards
- Swagger/OpenAPI

## Environment

Create `backend/.env` from `backend/.env.example`.

Required values:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
CORS_ORIGIN=http://localhost:5173
```

Use Supabase pooled URL for `DATABASE_URL` and direct URL for `DIRECT_URL`.

## Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
npm run start:dev
```

```bash
npm run build
npm test -- --runInBand
```

E2E requires a disposable PostgreSQL database configured in `backend/.env.test` or `.env.test.local`. Use guarded scripts only:

```bash
npm run prisma:migrate:deploy:test
npm run seed:test
npm run test:e2e -- --runInBand
```

The E2E guard refuses URLs that do not clearly target `test`, `testing`, `e2e`, or `ci`.

## API Docs

When running locally:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`
