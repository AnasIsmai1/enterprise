import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { AppRole } from '@/modules/auth/auth.config';
import { createStandaloneAuth } from '@/modules/auth/auth.standalone';

const logger = new Logger('Seeder');

/**
 * Seeds the admin account.
 *
 * The user is created through better-auth — so the password is hashed by the
 * same code that later verifies it, and the account row stays consistent — then
 * promoted with a direct UPDATE, because `role` is declared `input: false`
 * precisely so it cannot be set through the public API.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  // No hardcoded default — a committed admin password is a live credential in
  // every clone of this repo.
  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user'
    );
  }

  const { auth, config, close } = await createStandaloneAuth();

  const pool = new Pool({
    host: config.get<string>('database.host'),
    port: config.get<number>('database.port'),
    user: config.get<string>('database.user'),
    password: config.get<string>('database.password'),
    database: config.get<string>('database.name'),
  });

  try {
    const existing = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email]
    );

    if (existing.rowCount) {
      logger.warn(`User ${email} already exists. Skipping.`);
      return;
    }

    await auth.api.signUpEmail({ body: { email, password, name: 'Admin' } });

    await pool.query(
      'UPDATE "user" SET role = $1, "emailVerified" = true WHERE email = $2',
      [AppRole.ADMIN, email]
    );

    logger.log(`Seeded admin user: ${email}`);
  } finally {
    await pool.end();
    await close();
  }
}

main().then(
  () => {
    logger.log('Seeding completed successfully.');
    process.exit(0);
  },
  (error: unknown) => {
    logger.error(
      'Seeding failed',
      error instanceof Error ? error.stack : error
    );
    process.exit(1);
  }
);
