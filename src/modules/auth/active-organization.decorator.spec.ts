import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { requireActiveOrganization } from './active-organization.decorator';

const withSession = (session: unknown) =>
  ({ session }) as unknown as Pick<Request, 'session'>;

describe('requireActiveOrganization', () => {
  it('returns the active organization id from the session', () => {
    expect(
      requireActiveOrganization(withSession({ activeOrganizationId: 'org_1' }))
    ).toBe('org_1');
  });

  it('throws when the session has no active organization', () => {
    // Returning undefined here would widen every downstream query to every
    // tenant, so this must fail loudly rather than quietly.
    expect(() => requireActiveOrganization(withSession({}))).toThrow(
      BadRequestException
    );
  });

  it('throws when there is no session at all', () => {
    expect(() => requireActiveOrganization(withSession(undefined))).toThrow(
      BadRequestException
    );
  });
});
