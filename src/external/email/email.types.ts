export enum EmailType {
  VERIFICATION = 'VERIFICATION', // EMAIL-02: Email address verification on signup
  PASSWORD_RESET = 'PASSWORD_RESET', // EMAIL-03: Password reset link
  INVITATION = 'INVITATION', // Organization invitation
  ACCOUNT_DELETION = 'ACCOUNT_DELETION', // EMAIL-05: Account deletion confirmation
  ADMIN_ALERT = 'ADMIN_ALERT', // EMAIL-06: Admin notification for critical events
}

/**
 * Brevo template IDs, per environment.
 *
 * These were previously hardcoded to 1-5 with TODO comments, which meant every
 * deployment silently rendered whatever template happened to occupy those slots.
 * They are env-driven now, and `resolveTemplateId` fails loudly rather than
 * sending against a guessed ID.
 */
const TEMPLATE_ENV_VARS: Record<EmailType, string> = {
  [EmailType.VERIFICATION]: 'BREVO_TEMPLATE_VERIFICATION',
  [EmailType.PASSWORD_RESET]: 'BREVO_TEMPLATE_PASSWORD_RESET',
  [EmailType.INVITATION]: 'BREVO_TEMPLATE_INVITATION',
  [EmailType.ACCOUNT_DELETION]: 'BREVO_TEMPLATE_ACCOUNT_DELETION',
  [EmailType.ADMIN_ALERT]: 'BREVO_TEMPLATE_ADMIN_ALERT',
};

export function resolveTemplateId(type: EmailType): number {
  const envVar = TEMPLATE_ENV_VARS[type];
  const raw = process.env[envVar];
  const id = Number(raw);

  if (!raw || !Number.isInteger(id) || id <= 0) {
    throw new Error(
      `${envVar} is not set to a valid Brevo template ID (got: ${raw ?? 'undefined'})`
    );
  }

  return id;
}

export const EMAIL_QUEUE = 'email';

export interface EmailJobData {
  type: EmailType;
  to: string;
  params: Record<string, unknown>;
}
