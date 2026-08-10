/**
 * Creates or updates the transactional templates in Brevo from
 * templates/brevo/*.html, then prints the BREVO_TEMPLATE_* lines for .env.
 *
 *   BREVO_API_KEY=xkeysib-... pnpm brevo:sync
 *
 * Idempotent: templates are matched by name, so re-running updates in place
 * rather than creating duplicates. Pass --dry-run to see what would change.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmailType } from '@/external/email/email.types';

const BREVO_API = 'https://api.brevo.com/v3';
const TEMPLATE_DIR = join(__dirname, '..', 'templates', 'brevo');

interface TemplateSpec {
  type: EmailType;
  envVar: string;
  /** Must be stable — this is the key used to match an existing template. */
  name: string;
  subject: string;
  file: string;
}

const APP_NAME = process.env.APP_NAME ?? 'Enterprise API';

const TEMPLATES: TemplateSpec[] = [
  {
    type: EmailType.VERIFICATION,
    envVar: 'BREVO_TEMPLATE_VERIFICATION',
    name: `${APP_NAME} — Email verification`,
    subject: 'Confirm your email address',
    file: 'verification.html',
  },
  {
    type: EmailType.PASSWORD_RESET,
    envVar: 'BREVO_TEMPLATE_PASSWORD_RESET',
    name: `${APP_NAME} — Password reset`,
    subject: 'Reset your password',
    file: 'password-reset.html',
  },
  {
    type: EmailType.INVITATION,
    envVar: 'BREVO_TEMPLATE_INVITATION',
    name: `${APP_NAME} — Organization invitation`,
    subject:
      '{{ params.inviterName }} invited you to {{ params.organizationName }}',
    file: 'invitation.html',
  },
  {
    type: EmailType.ACCOUNT_DELETION,
    envVar: 'BREVO_TEMPLATE_ACCOUNT_DELETION',
    name: `${APP_NAME} — Account deleted`,
    subject: 'Your account has been deleted',
    file: 'account-deletion.html',
  },
  {
    type: EmailType.ADMIN_ALERT,
    envVar: 'BREVO_TEMPLATE_ADMIN_ALERT',
    name: `${APP_NAME} — Admin alert`,
    subject: '[{{ params.environment }}] Unhandled error: {{ params.message }}',
    file: 'admin-alert.html',
  },
];

const dryRun = process.argv.includes('--dry-run');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function brevo<T>(
  path: string,
  init: RequestInit & { apiKey: string }
): Promise<T> {
  const { apiKey, ...rest } = init;
  const response = await fetch(`${BREVO_API}${path}`, {
    ...rest,
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
      ...rest.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Brevo ${String(rest.method ?? 'GET')} ${path} -> ${response.status} ${await response.text()}`
    );
  }

  // PUT returns 204 with no body.
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

/** Brevo has no "get by name", so page through and index. */
async function fetchExisting(apiKey: string): Promise<Map<string, number>> {
  const byName = new Map<string, number>();
  const limit = 50;

  for (let offset = 0; ; offset += limit) {
    const page = await brevo<{
      templates?: { id: number; name: string }[];
      count: number;
    }>(`/smtp/templates?limit=${limit}&offset=${offset}`, { apiKey });

    const templates = page.templates ?? [];
    for (const t of templates) byName.set(t.name, t.id);

    if (templates.length < limit) return byName;
  }
}

async function main() {
  const apiKey = requireEnv('BREVO_API_KEY');
  const senderEmail = requireEnv('BREVO_SENDER_EMAIL');
  const senderName = process.env.BREVO_SENDER_NAME ?? APP_NAME;

  const existing = dryRun
    ? new Map<string, number>()
    : await fetchExisting(apiKey);
  const resolved: { envVar: string; id: number | null; action: string }[] = [];

  for (const spec of TEMPLATES) {
    const htmlContent = readFileSync(join(TEMPLATE_DIR, spec.file), 'utf8');
    const payload = {
      templateName: spec.name,
      subject: spec.subject,
      htmlContent,
      sender: { name: senderName, email: senderEmail },
      isActive: true,
    };

    const id = existing.get(spec.name);

    if (dryRun) {
      resolved.push({ envVar: spec.envVar, id: id ?? null, action: 'dry-run' });
      continue;
    }

    if (id) {
      await brevo(`/smtp/templates/${id}`, {
        apiKey,
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      resolved.push({ envVar: spec.envVar, id, action: 'updated' });
    } else {
      const created = await brevo<{ id: number }>('/smtp/templates', {
        apiKey,
        method: 'POST',
        body: JSON.stringify(payload),
      });
      resolved.push({ envVar: spec.envVar, id: created.id, action: 'created' });
    }
  }

  for (const r of resolved) {
    console.error(`  ${r.action.padEnd(8)} ${r.envVar} = ${r.id ?? '(none)'}`);
  }

  console.error('\nAdd these to .env:\n');
  for (const r of resolved) {
    console.log(`${r.envVar}=${r.id ?? ''}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
