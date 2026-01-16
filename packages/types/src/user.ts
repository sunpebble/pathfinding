/**
 * User profile entity
 */
export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile update input
 */
export interface UpdateUserProfileInput {
  displayName?: string;
  avatarUrl?: string;
}
