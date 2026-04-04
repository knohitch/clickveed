import { lookup } from 'dns/promises';
import { isIP } from 'net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254',
  '0.0.0.0',
]);

function isPrivateOrInternalIp(rawIp: string): boolean {
  const ip = rawIp.toLowerCase().replace(/^\[|\]$/g, '');
  const mappedIpv4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  if (isIP(mappedIpv4) === 4) {
    const octets = mappedIpv4.split('.').map(Number);
    const [a, b] = octets;

    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }

  const normalizedIpv6 = mappedIpv4;
  return (
    normalizedIpv6 === '::1' ||
    normalizedIpv6.startsWith('fc') ||
    normalizedIpv6.startsWith('fd') ||
    normalizedIpv6.startsWith('fe80:')
  );
}

export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP(S) URLs are allowed.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    throw new Error('This hostname is not allowed.');
  }

  if (isPrivateOrInternalIp(hostname)) {
    throw new Error('Private or internal IP addresses are not allowed.');
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) {
    throw new Error('Unable to resolve the target hostname.');
  }

  for (const address of addresses) {
    if (isPrivateOrInternalIp(address.address)) {
      throw new Error('This hostname resolves to a private or internal address.');
    }
  }

  return parsed;
}
