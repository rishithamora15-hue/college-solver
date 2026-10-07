// Connection settings shared by the app, the worker and the scripts. No env() validation here so scripts can use it.
import { readFileSync } from 'node:fs';

const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Local Postgres: plain connection. Remote (e.g. Supabase): TLS is required. With DATABASE_CA_CERT (a file path, or the
 * PEM text itself) the server certificate is verified against it; sslmode in the URL is dropped because pg would let it
 * override this setting.
 */
export function pgConn(url = process.env.DATABASE_URL ?? '') {
  const u = new URL(url);
  if (LOCAL.has(u.hostname)) return { connectionString: url }; // tests and local dev, even when .env also holds a hosted CA
  const ca = process.env.DATABASE_CA_CERT?.trim();
  if (ca) {
    u.searchParams.delete('sslmode'); u.searchParams.delete('sslrootcert');
    return { connectionString: u.toString(), ssl: { ca: ca.startsWith('-----BEGIN') ? ca : readFileSync(ca, 'utf8'), rejectUnauthorized: true } };
  }
  if (!u.searchParams.get('sslmode'))
    throw new Error('Remote database needs TLS: set DATABASE_CA_CERT to your provider\'s CA certificate (Supabase: Database settings > SSL configuration)');
  return { connectionString: url };
}

export const isLocalDb = (url = process.env.DATABASE_URL ?? '') => LOCAL.has(new URL(url).hostname);
