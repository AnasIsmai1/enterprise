# Multi-tenancy

**Shared database, `organization_id` column.** Not schema-per-tenant, not
database-per-tenant. Every org-owned row carries the id of the organization that
owns it, and every query filters on it.

`src/modules/project/` is the reference implementation. Copy it; delete it once
you have a real resource.

---

## The rule

> Permission and ownership are different questions. `@OrgRoles()` answers the
> first. Only the service layer can answer the second.

`@OrgRoles('owner','admin')` says *this caller may create projects somewhere*. It
says nothing about whether project `abc` belongs to their organization. Confusing
the two is how multi-tenant data leaks happen: the endpoint works, the tests
pass, and it quietly serves other tenants' rows.

## The pattern

```ts
// Controller — tenancy comes from the session, never the body.
@Get(':id')
findOne(
  @ActiveOrganization() organizationId: string,
  @Param('id', ParseUUIDPipe) id: string,
) {
  return this.projects.findOne(organizationId, id);
}

// Service — organizationId is the first argument, and it is in every WHERE.
async findOne(organizationId: string, id: string): Promise<Project> {
  const project = await this.projects.findOne({
    where: { id, organization_id: organizationId },
  });

  if (!project) throw new NotFoundException('Project not found');
  return project;
}
```

Four rules, all load-bearing:

1. **`organizationId` is the first parameter of every service method.** Not
   optional, not defaulted. A method that can be called without it will be.
2. **It comes from `@ActiveOrganization()`**, which reads
   `session.activeOrganizationId` and throws 400 when absent. It never comes from
   the request body — a client that can name its own organization can write into
   anyone's.
3. **Every query filters on it**, including the read behind an update or delete.
   Route mutations through `findOne()` so the filter cannot be forgotten in one
   place.
4. **404, never 403,** for another tenant's row. A 403 confirms the id exists,
   which leaks the shape and volume of other tenants' data.

## Active organization

It lives on the session (`session.activeOrganizationId`) and **resets on every
sign-in**. Clients call `POST /api/auth/organization/set-active` after signing
in, or requests fail with:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR",
  "message": "No active organization. Call POST /api/auth/organization/set-active first." } }
```

That is deliberate. The alternative — defaulting to "the user's first
organization" — silently picks a tenant for a user who belongs to several.

## Sorting and pagination

`PaginationQueryDto` accepts a `sort` field, which is interpolated into the
query. Allow-list it:

```ts
const SORTABLE = new Set(['created_at', 'updated_at', 'name']);
const sort = SORTABLE.has(query.sort) ? query.sort : 'created_at';
```

Return `{ items, meta }` — `ResponseInterceptor` unwraps that into
`{ success, data: [...], meta: {...} }`. Any other shape is passed through as a
raw `data` object and the pagination metadata never reaches the client.

## Audit

Mutations record an entry scoped to the tenant:

```ts
await this.audit.log({
  action: 'PROJECT_CREATED',
  actorId: userId,
  resource: 'project',
  resourceId: project.id,
  organizationId,
});
```

Identity events (`USER_CREATED`, `SESSION_CREATED`, `USER_DELETED`) are recorded
by better-auth `databaseHooks` in `auth.config.ts`, because better-auth bypasses
Nest's pipeline and a controller-level decorator would never see them.

## Testing it

`project.service.spec.ts` exists to fail if the tenant filter is ever dropped.
It asserts that a foreign row produces `NotFoundException` on read, update, and
delete, and that update/delete never reach the repository. Copy those cases for
every org-owned resource — they are the ones that catch the silent bug.

Verified end to end against Postgres: two organizations, owner B reading,
updating, and deleting owner A's project all return 404, and B's list is empty.

## What is not covered

- **Row-level security in Postgres.** The filter is application-level. A raw
  query written by hand can still bypass it. If that risk matters, add RLS
  policies keyed on a session variable.
- **Cross-organization admin.** An `AppRole.ADMIN` platform admin still has no
  way to read across tenants; that would need an explicit, audited bypass.
