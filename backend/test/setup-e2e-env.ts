import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const backendRoot = process.cwd();
const localEnvPath = path.resolve(backendRoot, '.env.test.local');
const envPath = path.resolve(backendRoot, '.env.test');
const selectedEnvPath = fs.existsSync(localEnvPath) ? localEnvPath : envPath;

if (!fs.existsSync(selectedEnvPath)) {
  throw new Error(
    'E2E tests require backend/.env.test or backend/.env.test.local. Copy backend/.env.test.example and point DATABASE_URL/DIRECT_URL to a dedicated test database.',
  );
}

dotenv.config({ path: selectedEnvPath, override: true });

process.env.NODE_ENV = 'test';
process.env.SKIP_AUTO_SEED = 'true';

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
const guardValue = process.env.E2E_DATABASE_GUARD;

if (!databaseUrl || !directUrl) {
  throw new Error(
    'E2E tests require DATABASE_URL and DIRECT_URL in backend/.env.test.',
  );
}

if (guardValue !== 'test') {
  throw new Error(
    'Set E2E_DATABASE_GUARD=test in backend/.env.test after confirming the URLs point to a disposable test database.',
  );
}

if (!isSafeTestDatabaseUrl(databaseUrl) || !isSafeTestDatabaseUrl(directUrl)) {
  throw new Error(
    'Refusing to run e2e tests: DATABASE_URL and DIRECT_URL must contain a test/e2e database name, schema, or host.',
  );
}

process.env.DATABASE_URL = withRequiredSslMode(databaseUrl);
process.env.DIRECT_URL = withRequiredSslMode(directUrl);

function isSafeTestDatabaseUrl(value: string): boolean {
  if (hasUnsafePlaceholder(value)) {
    return false;
  }

  const target = extractDatabaseTarget(value);
  if (!target) {
    return false;
  }

  if (/(^|[^a-z0-9])(prod|production|demo|staging)([^a-z0-9]|$)/.test(target)) {
    return false;
  }

  return /(^|[^a-z0-9])(test|testing|e2e|ci)([^a-z0-9]|$)/.test(target);
}

function withRequiredSslMode(value: string): string {
  if (/[?&]sslmode=/i.test(value) || isLocalDatabaseUrl(value)) {
    return value;
  }

  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}sslmode=require`;
}

function isLocalDatabaseUrl(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('@localhost') ||
    normalized.includes('@127.0.0.1') ||
    normalized.includes('@::1')
  );
}

function hasUnsafePlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('[password]') ||
    normalized.includes('[project-ref]') ||
    normalized.includes('your-') ||
    normalized.includes('change-me')
  );
}

function extractDatabaseTarget(value: string): string {
  try {
    const parsed = new URL(value);
    return [
      parsed.hostname,
      parsed.pathname,
      parsed.searchParams.get('schema') ?? '',
    ]
      .join(' ')
      .toLowerCase();
  } catch {
    const withoutCredentials = value.replace(/^.+@/, '');
    const hostMatch = withoutCredentials.match(/^([^/?#:]+)/);
    const pathMatch = withoutCredentials.match(/\/([^/?#]+)/);
    const schemaMatch = withoutCredentials.match(/[?&]schema=([^&#]+)/i);

    return [hostMatch?.[1] ?? '', pathMatch?.[1] ?? '', schemaMatch?.[1] ?? '']
      .join(' ')
      .toLowerCase();
  }
}
