const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function parsePrivateIPv4(input: string): string | null {
  const match = IPV4_PATTERN.exec(input.trim());
  if (!match) return null;

  const octets = match.slice(1).map((part) => {
    if (part.length > 1 && part.startsWith('0')) return NaN;
    return Number(part);
  });
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return null;

  const [a, b] = octets;
  const isPrivate =
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127;

  return isPrivate ? octets.join('.') : null;
}
