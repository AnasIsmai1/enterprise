export enum EmailType {
    VERIFICATION = 'VERIFICATION',           // EMAIL-02: Email address verification on signup
    PASSWORD_RESET = 'PASSWORD_RESET',       // EMAIL-03: Password reset link
    CAPSULE_DELIVERY = 'CAPSULE_DELIVERY',   // EMAIL-04: Time capsule delivered to recipients
    ACCOUNT_DELETION = 'ACCOUNT_DELETION',   // EMAIL-05: Account deletion confirmation
    ADMIN_ALERT = 'ADMIN_ALERT',             // EMAIL-06: Admin notification for critical events
}

// Template IDs are set up in Brevo dashboard.
// Store as config constants (not env vars) — they don't change between environments.
// User must create these templates in Brevo and update the IDs here.
export const EMAIL_TEMPLATE_IDS: Record<EmailType, number> = {
    [EmailType.VERIFICATION]: 1,        // TODO: Replace with actual Brevo template ID
    [EmailType.PASSWORD_RESET]: 2,      // TODO: Replace with actual Brevo template ID
    [EmailType.CAPSULE_DELIVERY]: 3,    // TODO: Replace with actual Brevo template ID
    [EmailType.ACCOUNT_DELETION]: 4,    // TODO: Replace with actual Brevo template ID
    [EmailType.ADMIN_ALERT]: 5,         // TODO: Replace with actual Brevo template ID
};

export const EMAIL_QUEUE = 'email';

export interface EmailJobData {
    type: EmailType;
    to: string;
    params: Record<string, any>;
}
