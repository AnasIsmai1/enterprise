import { readFileSync } from 'node:fs';
import type { ConfigService } from '@nestjs/config';

/**
 * Connection settings shared by every path that opens a Postgres connection:
 * the TypeORM runtime pool, the TypeORM CLI datasource, better-auth's own `pg`
 * Pool, and the seed script.
 *
 * They are centralised because four hand-rolled copies of the same five fields
 * is exactly how "SSL enabled in three of four places" happens — and three of
 * four is indistinguishable from zero when a managed provider rejects the
 * fourth.
 */
export interface SslOptions {
  /** Verify the server certificate. Defaults to true whenever SSL is on. */
  rejectUnauthorized: boolean;
  /** Custom root CA, for providers that do not chain to a public root. */
  ca?: string;
}

export interface DatabaseConnection {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: false | SslOptions;
}

/**
 * Builds the TLS options.
 *
 * Verification is ON by default. Neon, Supabase and RDS all serve certificates
 * that chain to a public root or publish a downloadable CA, so disabling
 * verification is not required to talk to any of them — it only removes the
 * protection that makes TLS worth having, since an unverified connection is
 * encrypted to whoever answered, not necessarily to your database.
 *
 * - `DB_SSL=false`  — plaintext. Correct for a local container on a private network.
 * - `DB_SSL=true`   — TLS, verified against the system CA store.
 * - `DB_SSL_CA`     — PEM contents, or a path to a .pem, for a private root.
 * - `DB_SSL_REJECT_UNAUTHORIZED=false` — escape hatch. Encrypted but
 *   unauthenticated: it accepts any certificate, including an attacker's.
 *   Use only to reproduce a problem, never as a fix.
 */
function buildSsl(
  enabled: boolean,
  caRaw: string | undefined,
  rejectUnauthorized: boolean
): false | SslOptions {
  if (!enabled) return false;

  const ssl: SslOptions = { rejectUnauthorized };

  if (caRaw) {
    // Accept either inline PEM or a path to one, so the same variable works
    // for a Swarm secret file and a pasted env value.
    ssl.ca = caRaw.includes('-----BEGIN') ? caRaw : readFileSync(caRaw, 'utf8');
  }

  return ssl;
}

/** Reads straight from `process.env` — for CLI entry points with no Nest container. */
export function databaseConnectionFromEnv(): DatabaseConnection {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'enterprise',
    ssl: buildSsl(
      process.env.DB_SSL === 'true',
      process.env.DB_SSL_CA,
      process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    ),
  };
}

/** Reads via ConfigService — for anything inside the Nest container. */
export function databaseConnection(config: ConfigService): DatabaseConnection {
  return {
    host: config.get<string>('database.host', 'localhost'),
    port: config.get<number>('database.port', 5432),
    user: config.get<string>('database.user', 'postgres'),
    password: config.get<string>('database.password', ''),
    database: config.get<string>('database.name', 'enterprise'),
    ssl: buildSsl(
      config.get<boolean>('database.ssl', false),
      config.get<string>('database.sslCa'),
      config.get<boolean>('database.sslRejectUnauthorized', true)
    ),
  };
}
