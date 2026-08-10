import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRolesGuard, OrgRole } from './org-roles.guard';
import type { AppAuth } from './auth.config';

const ctx = {
  switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  getHandler: () => undefined,
  getClass: () => undefined,
} as unknown as ExecutionContext;

const guardWith = (
  required: OrgRole[] | undefined,
  getActiveMember: jest.Mock
) =>
  new OrgRolesGuard(
    { api: { getActiveMember } } as unknown as AppAuth,
    {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector
  );

describe('OrgRolesGuard', () => {
  it('passes through when no @OrgRoles() is declared', async () => {
    const getActiveMember = jest.fn();
    await expect(
      guardWith(undefined, getActiveMember).canActivate(ctx)
    ).resolves.toBe(true);
    expect(getActiveMember).not.toHaveBeenCalled();
  });

  it('allows a member holding one of the required roles', async () => {
    const guard = guardWith(
      ['owner', 'admin'],
      jest.fn().mockResolvedValue({ role: 'admin' })
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows a member whose comma-separated roles include a required one', async () => {
    // better-auth stores multiple roles in one column as "a,b".
    const guard = guardWith(
      ['admin'],
      jest.fn().mockResolvedValue({ role: 'member,admin' })
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies a member holding none of the required roles', async () => {
    const guard = guardWith(
      ['owner'],
      jest.fn().mockResolvedValue({ role: 'member' })
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('denies when there is no active organization', async () => {
    const guard = guardWith(
      ['member'],
      jest.fn().mockRejectedValue(new Error())
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
