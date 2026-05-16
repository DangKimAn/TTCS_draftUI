import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

async function testConnection(url: string | undefined, name: string) {
  if (!url) {
    console.error(`❌ ${name} is not defined in .env`);
    return;
  }

  console.log(`\nTesting ${name}...`);
  console.log(`URL: ${url.replace(/:[^:]+@/, ':****@')}`); // Mask password

  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ ${name} connected successfully!`);
    console.log(`Server time: ${res.rows[0].now}`);
  } catch (err: any) {
    console.error(`❌ ${name} connection failed:`, err.message);
    if (err.message.includes('P1001') || err.message.includes('ECONNREFUSED')) {
      console.error('Hint: Check if the port and host are correct and the DB is accessible.');
    }
  } finally {
    await client.end();
  }
}

async function runTests() {
  console.log('--- Database Connection Test ---');
  
  // Test DATABASE_URL (Pooled - Port 6543)
  await testConnection(dbUrl, 'DATABASE_URL (Transaction Pooler - Port 6543)');
  
  // Test DIRECT_URL (Direct - Port 5432)
  await testConnection(directUrl, 'DIRECT_URL (Direct Connection - Port 5432)');
  
  console.log('\n--- Test Completed ---');
}

runTests();
