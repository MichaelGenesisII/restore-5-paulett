/**
 * Temporary passwords for Host / Admin Auth invites and resets.
 * No brand prefix — a fixed `5P-` made every temp password trivially recognisable.
 */
export function generateTemporaryPassword(length = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let body = "";
  for (const byte of bytes) {
    body += alphabet[byte % alphabet.length];
  }
  return body;
}
