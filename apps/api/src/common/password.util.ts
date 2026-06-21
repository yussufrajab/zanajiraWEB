import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export class WeakPasswordError extends Error {}

export function validatePasswordStrength(pw: string): void {
  if (pw.length < 10) throw new WeakPasswordError('At least 10 characters');
  if (!/[A-Z]/.test(pw)) throw new WeakPasswordError('Must contain an uppercase letter');
  if (!/[a-z]/.test(pw)) throw new WeakPasswordError('Must contain a lowercase letter');
  if (!/[0-9]/.test(pw)) throw new WeakPasswordError('Must contain a digit');
  if (!/[^A-Za-z0-9]/.test(pw)) throw new WeakPasswordError('Must contain a symbol');
}