import { execSync } from 'child_process';
import { TEST_DATABASE_URL } from './int.env';

// Creates quacker_test if missing and applies our Prisma migrations.
export default function globalSetup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
