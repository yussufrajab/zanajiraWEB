import { validatePasswordStrength, WeakPasswordError } from './password.util';

describe('validatePasswordStrength', () => {
  it('accepts a strong password', () => {
    expect(() => validatePasswordStrength('Str0ng!Pass')).not.toThrow();
  });
  it.each([
    ['short1!', 'At least 10 characters'],
    ['nouppercase1!', 'Must contain an uppercase letter'],
    ['NOLOWER1!', 'Must contain a lowercase letter'],
    ['NoDigits!!', 'Must contain a digit'],
    ['NoSymbol12', 'Must contain a symbol'],
  ])('rejects weak password %s', (pw) => {
    expect(() => validatePasswordStrength(pw)).toThrow(WeakPasswordError);
  });
});