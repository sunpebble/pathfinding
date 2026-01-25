/**
 * Platform-specific session validators
 * Each validator checks page content to determine login status
 */

export type Platform =
  | 'xiaohongshu'
  | 'mafengwo'
  | 'ctrip'
  | 'qunar'
  | 'tongcheng';

export interface ValidationResult {
  isValid: boolean;
  requiresLogin: boolean;
  reason?: string;
}

/**
 * Validate Xiaohongshu session from page content
 * Xiaohongshu shows captcha/login wall when not logged in
 */
export function validateXiaohongshuSession(content: string): ValidationResult {
  const lowerContent = content.toLowerCase();

  // Check for login wall indicators
  if (
    lowerContent.includes('captcha') ||
    lowerContent.includes('security verification') ||
    lowerContent.includes('扫码登录') ||
    lowerContent.includes('请登录')
  ) {
    return {
      isValid: false,
      requiresLogin: true,
      reason: 'Login wall or captcha detected',
    };
  }

  return { isValid: true, requiresLogin: true };
}

/**
 * Validate Mafengwo session from page content
 * Mafengwo works without login but has better results logged in
 */
export function validateMafengwoSession(content: string): ValidationResult {
  const lowerContent = content.toLowerCase();

  // Check for logged-in indicators
  const isLoggedIn =
    lowerContent.includes('退出') ||
    lowerContent.includes('我的主页') ||
    lowerContent.includes('我的游记');

  // Check for login prompts without being blocked
  const hasLoginPrompt =
    lowerContent.includes('验证') && !lowerContent.includes('退出');

  if (hasLoginPrompt) {
    return {
      isValid: true, // Can still crawl
      requiresLogin: false, // Recommends but doesn't require
      reason: 'Login recommended for better results',
    };
  }

  return {
    isValid: true,
    requiresLogin: false,
    reason: isLoggedIn ? 'Logged in' : 'Not logged in, but can crawl',
  };
}

/**
 * Ctrip, Qunar, Tongcheng don't require login
 */
export function validatePublicSession(_content: string): ValidationResult {
  return { isValid: true, requiresLogin: false };
}

/**
 * Get validator for platform
 */
export function getValidator(
  platform: Platform
): (content: string) => ValidationResult {
  switch (platform) {
    case 'xiaohongshu':
      return validateXiaohongshuSession;
    case 'mafengwo':
      return validateMafengwoSession;
    case 'ctrip':
    case 'qunar':
    case 'tongcheng':
      return validatePublicSession;
    default:
      return validatePublicSession;
  }
}
