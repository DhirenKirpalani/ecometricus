/**
 * SHA-256 hash using the browser's native Web Crypto API.
 * Returns a lowercase hex string.
 * Used to hash pincodes before storing or comparing — never stored in plaintext.
 */
export async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toUpperCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
