import { toFetchHeaders } from './node-headers.utils';

describe('toFetchHeaders', () => {
  it('carries scalar headers through', () => {
    const headers = toFetchHeaders({ authorization: 'Bearer tok' });
    expect(headers.get('authorization')).toBe('Bearer tok');
  });

  it('preserves every value of a repeated header', () => {
    // Dropping repeats here would lose cookies on a multi-Set-Cookie request.
    const headers = toFetchHeaders({ 'set-cookie': ['a=1', 'b=2'] });
    expect(headers.getSetCookie()).toEqual(['a=1', 'b=2']);
  });

  it('skips undefined values instead of writing "undefined"', () => {
    const headers = toFetchHeaders({ authorization: undefined });
    expect(headers.has('authorization')).toBe(false);
  });
});
