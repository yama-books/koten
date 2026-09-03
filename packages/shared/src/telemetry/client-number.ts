export const CLIENT_NUMBER_LENGTH = 20;

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
const acceptableByteLimit = Math.floor(256 / alphabet.length) * alphabet.length;

export function isClientNumber(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^[a-z0-9]{${CLIENT_NUMBER_LENGTH}}$`).test(value);
}

export function createClientNumber(randomBytes: (length: number) => Uint8Array): string {
  let result = '';
  while (result.length < CLIENT_NUMBER_LENGTH) {
    const bytes = randomBytes(CLIENT_NUMBER_LENGTH - result.length);
    for (const byte of bytes) {
      if (byte < acceptableByteLimit) result += alphabet[byte % alphabet.length];
      if (result.length === CLIENT_NUMBER_LENGTH) return result;
    }
  }
  return result;
}
