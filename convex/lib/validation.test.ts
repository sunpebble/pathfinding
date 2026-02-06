import { describe, expect, it } from 'vitest';
import { validateUserProfile } from './validation';

describe('validateUserProfile', () => {
  it('should pass for valid inputs', () => {
    expect(() => validateUserProfile({
      displayName: 'Valid Name',
      bio: 'Valid Bio',
    })).not.toThrow();
  });

  it('should pass for optional inputs', () => {
    expect(() => validateUserProfile({})).not.toThrow();
  });

  it('should throw error if displayName is too long', () => {
    const longName = 'a'.repeat(51);
    expect(() => validateUserProfile({
      displayName: longName,
    })).toThrow(/Display name must be less than 50 characters/);
  });

  it('should pass if displayName is exactly 50 characters', () => {
    const maxName = 'a'.repeat(50);
    expect(() => validateUserProfile({
      displayName: maxName,
    })).not.toThrow();
  });

  it('should throw error if bio is too long', () => {
    const longBio = 'a'.repeat(501);
    expect(() => validateUserProfile({
      bio: longBio,
    })).toThrow(/Bio must be less than 500 characters/);
  });

  it('should pass if bio is exactly 500 characters', () => {
    const maxBio = 'a'.repeat(500);
    expect(() => validateUserProfile({
      bio: maxBio,
    })).not.toThrow();
  });
});
