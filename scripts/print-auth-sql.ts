/**
 * Prints the SQL better-auth needs for its current plugin set.
 *
 * Dev tool. Run it after changing auth.config.ts, then paste the output into a
 * new TypeORM migration — that keeps a single migration chain instead of running
 * better-auth's CLI as a second, independent schema owner.
 *
 *   pnpm auth:sql
 */
import 'dotenv/config';
import { createStandaloneAuth } from '@/modules/auth/auth.standalone';

async function main() {
  const { auth, close } = await createStandaloneAuth();

  try {
    const { getMigrations } = await import('better-auth/db/migration');
    const { compileMigrations } = await getMigrations(auth.options);

    process.stdout.write(await compileMigrations());
  } finally {
    await close();
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  }
);
