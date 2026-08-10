# Brevo templates

Source of truth for the five transactional emails. Edit the HTML here, then run:

```bash
BREVO_API_KEY=xkeysib-... pnpm brevo:sync
```

The script creates each template if it does not exist and updates it if it does
(matched by template name), then prints the `BREVO_TEMPLATE_*` lines to paste
into `.env`.

## Placeholders

Brevo substitutes `{{ params.x }}` from the `params` object that
`EmailService.send()` enqueues. A placeholder with no matching param renders
empty — it does not error — so keep these in sync with `auth.config.ts` and
`all-exceptions.filter.ts`.

| Template | Params |
|---|---|
| `verification.html` | `appName`, `name`, `url` |
| `password-reset.html` | `appName`, `name`, `url` |
| `invitation.html` | `appName`, `organizationName`, `inviterName`, `inviterEmail`, `role`, `url` |
| `account-deletion.html` | `appName`, `name` |
| `admin-alert.html` | `appName`, `environment`, `message`, `path`, `timestamp`, `stack` |

`account-deletion.html` has no sender in the codebase yet — the `EmailType`
exists and nothing calls it. It is included so the set is complete.

## Design notes

Table-based layout with inline styles, because that is what survives Outlook and
Gmail. No external CSS, no web fonts, no images — nothing that requires a network
fetch or gets blocked by default. Single accent colour, easy to find and change.
