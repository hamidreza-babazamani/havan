export const MAX_REGISTRATION_BODY_BYTES = 16 * 1024;

// Email is limited to the common 254-character address maximum.
const MAX_EMAIL_LENGTH = 254;
// Keep the existing username range; display names are capped for safe storage and rendering.
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MAX_DISPLAY_NAME_LENGTH = 80;
// Keep the existing minimum while bounding password hashing work.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export interface RegistrationInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export function validateRegistrationInput(body: unknown): RegistrationInput | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;

  const { email, username, displayName, password } = body as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    typeof username !== "string" ||
    typeof displayName !== "string" ||
    typeof password !== "string"
  ) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedDisplayName = displayName.trim();
  const passwordLength = [...password].length;

  if (
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedUsername.length < MIN_USERNAME_LENGTH ||
    normalizedUsername.length > MAX_USERNAME_LENGTH ||
    !/^[a-z0-9_]+$/.test(normalizedUsername) ||
    !normalizedDisplayName ||
    [...normalizedDisplayName].length > MAX_DISPLAY_NAME_LENGTH ||
    passwordLength < MIN_PASSWORD_LENGTH ||
    passwordLength > MAX_PASSWORD_LENGTH ||
    !/\p{L}/u.test(password) ||
    !/\p{N}/u.test(password) ||
    /\s/u.test(password)
  ) {
    return null;
  }

  return {
    email: normalizedEmail,
    username: normalizedUsername,
    displayName: normalizedDisplayName,
    password,
  };
}
