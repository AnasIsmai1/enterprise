import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import type { AppAuth } from './auth.config';

const contextFor = (headers: Record<string, string>, request = {}) => {
  const req = { headers, ...request } as Record<string, unknown>;
  return {
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext,
    req,
  };
};

describe('AuthGuard', () => {
  const session = {
    user: { id: 'u1', email: 'u@example.com', role: 'user' },
    session: { id: 's1', activeOrganizationId: 'org1' },
  };

  const guardWith = (getSession: jest.Mock, isPublic = false): AuthGuard => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;
    const auth = { api: { getSession } } as unknown as AppAuth;
    return new AuthGuard(auth, reflector);
  };

  it('populates req.user and req.session from a valid session', async () => {
    const getSession = jest.fn().mockResolvedValue(session);
    const { ctx, req } = contextFor({ authorization: 'Bearer tok' });

    await expect(guardWith(getSession).canActivate(ctx)).resolves.toBe(true);

    expect(req.user).toEqual(session.user);
    expect(req.session).toEqual(session.session);
    // The Authorization header must reach better-auth — this is the whole
    // mobile path; if it is dropped, only cookie clients can authenticate.
    const [firstCall] = getSession.mock.calls as [{ headers: Headers }][];
    expect(firstCall[0].headers.get('authorization')).toBe('Bearer tok');
  });

  it('rejects when there is no session', async () => {
    const guard = guardWith(jest.fn().mockResolvedValue(null));
    const { ctx } = contextFor({});

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('skips the session lookup entirely for @Public() routes', async () => {
    const getSession = jest.fn();
    const guard = guardWith(getSession, true);
    const { ctx } = contextFor({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(getSession).not.toHaveBeenCalled();
  });
});
