const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Кодирование байтов в base64 без зависимостей от btoa/Buffer (их наличие в Hermes не гарантировано). */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const CHUNK = 3 * 4096;
  for (let start = 0; start < bytes.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, bytes.length);
    let out = '';
    for (let i = start; i < end; i += 3) {
      const a = bytes[i];
      const b = i + 1 < end ? bytes[i + 1] : 0;
      const c = i + 2 < end ? bytes[i + 2] : 0;
      const n = (a << 16) | (b << 8) | c;
      out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
      out += i + 1 < end ? ALPHABET[(n >> 6) & 63] : '=';
      out += i + 2 < end ? ALPHABET[n & 63] : '=';
    }
    chunks.push(out);
  }
  return chunks.join('');
}
