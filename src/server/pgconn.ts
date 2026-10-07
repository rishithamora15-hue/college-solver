// Connection settings shared by the app, the worker and the scripts. No env() validation here so scripts can use it.
import { existsSync, readFileSync } from 'node:fs';

const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Local Postgres: plain connection. Remote (e.g. Supabase): TLS is required. With DATABASE_CA_CERT (a file path, or the
 * certificate text in any shape, see pem()) the server certificate is verified against it; sslmode in the URL is dropped because pg would let it
 * override this setting.
 */
export function pgConn(url = process.env.DATABASE_URL ?? '') {
  const u = new URL(url);
  if (LOCAL.has(u.hostname)) return { connectionString: url }; // tests and local dev, even when .env also holds a hosted CA
  const ca = process.env.DATABASE_CA_CERT?.trim();
  if (ca) {
    u.searchParams.delete('sslmode'); u.searchParams.delete('sslrootcert');
    return { connectionString: u.toString(), ssl: { ca: existsSync(ca) ? readFileSync(ca, 'utf8') : pem(ca), rejectUnauthorized: true } };
  }
  if (!u.searchParams.get('sslmode'))
    throw new Error('Remote database needs TLS: set DATABASE_CA_CERT to your provider\'s CA certificate (Supabase: Database settings > SSL configuration)');
  return { connectionString: url };
}

/**
 * Rebuilds a PEM certificate from however a hosting dashboard kept it: real newlines, literal "\n", spaces, or just the
 * base64 body. ponytail: single certificate only (Supabase ships one); split on END markers if a chain is ever needed.
 */
export function pem(text: string) {
  const body = text.replace(/\\n/g, '\n').replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
  return `-----BEGIN CERTIFICATE-----\n${body.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`;
}

export const isLocalDb = (url = process.env.DATABASE_URL ?? '') => LOCAL.has(new URL(url).hostname);
