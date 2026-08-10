const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/**
 * Parse a JWT-style duration ('15m', '7d', '30s') into seconds.
 * Falls back to `fallback` for anything unparseable so a bad env value
 * cannot silently produce a zero-length or infinite session.
 */
export function parseTtlSeconds(expiresIn: string, fallback = 3600): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn ?? '');
  if (!match) return fallback;

  return parseInt(match[1], 10) * UNIT_SECONDS[match[2]];
}
