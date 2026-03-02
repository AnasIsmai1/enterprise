# Deferred Items

## Out-of-scope discoveries during plan 01-03 execution

### AuditModule missing (pre-existing)
- **Source:** app.module.ts was modified by linter to include AuditModule import
- **Issue:** `@/modules/audit/audit.module` does not exist, causing TypeScript error
- **Scope:** Out of scope for 01-03 (this module will be created in a later plan)
- **Action:** Deferred to whichever plan creates the AuditModule
