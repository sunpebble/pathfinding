/**
 * Validation logic for user profiles
 */
export function validateUserProfile(data: { displayName?: string; bio?: string }) {
  const MAX_DISPLAY_NAME_LENGTH = 50;
  const MAX_BIO_LENGTH = 500;

  if (data.displayName !== undefined && data.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Display name must be less than ${MAX_DISPLAY_NAME_LENGTH} characters`);
  }

  if (data.bio !== undefined && data.bio.length > MAX_BIO_LENGTH) {
    throw new Error(`Bio must be less than ${MAX_BIO_LENGTH} characters`);
  }
};
