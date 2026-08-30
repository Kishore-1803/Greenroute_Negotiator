// Client-side form validation. Deliberately permissive: its job is to catch obvious typos
// before a round trip, not to be the authority on what is valid. The backend's pydantic
// EmailStr and length rules are what actually decide, and a client check that is stricter than
// the server rejects input the server would have accepted.

/** Matches the shape of an email without trying to enforce the full RFC. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// Mirrors RegisterRequest's Field(min_length=8, max_length=72). The ceiling is bcrypt's:
// it silently ignores everything past 72 bytes, so a longer password would be partly
// decorative and the user would never know.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

export interface PasswordCheck {
  valid: boolean;
  message: string | null;
}

export function checkPassword(password: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  // Byte length, not character count: accented or non-Latin characters take multiple bytes
  // each, so a 40-character passphrase can exceed the limit.
  const byteLength = new TextEncoder().encode(password).length;
  if (byteLength > MAX_PASSWORD_BYTES) {
    return { valid: false, message: 'That password is too long.' };
  }
  return { valid: true, message: null };
}

/** Rough strength signal for the signup meter. Not security advice — an indicator only. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < MIN_PASSWORD_LENGTH) return 0;
  let score = 1;
  if (password.length >= 12) score += 1;
  if (/[^a-zA-Z]/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}
