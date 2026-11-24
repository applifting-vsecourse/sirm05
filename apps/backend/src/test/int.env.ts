import 'dotenv/config';

// Never the dev database: tests wipe every table.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://quacker:quacker@localhost:5434/quacker_test';

if (!new URL(TEST_DATABASE_URL).pathname.endsWith('_test')) {
  throw new Error(`Refusing to test against ${TEST_DATABASE_URL}`);
}
process.env.DATABASE_URL = TEST_DATABASE_URL;
