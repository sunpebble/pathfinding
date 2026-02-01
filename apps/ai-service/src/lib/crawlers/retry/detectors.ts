/**
 * Platform-specific block detectors
 *
 * Each detector analyzes page content and HTTP status to identify blocking patterns.
 */

import type { BlockDetectionResult, BlockDetector } from './types';

/**
 * Common block detection patterns
 */
const CAPTCHA_PATTERNS = [
  /验证码/,
  /captcha/i,
  /滑动验证/,
  /请完成验证/,
  /安全验证/,
  /人机验证/,
];

const RATE_LIMIT_PATTERNS = [
  /频繁访问/,
  /访问过于频繁/,
  /请求太频繁/,
  /稍后再试/,
  /too many requests/i,
  /rate limit/i,
];

const IP_BAN_PATTERNS = [
  /IP.*封禁/i,
  /IP.*blocked/i,
  /访问受限/,
  /access denied/i,
  /forbidden/i,
];

const SESSION_EXPIRED_PATTERNS = [
  /登录.*过期/,
  /请重新登录/,
  /session.*expired/i,
  /需要登录/,
  /请先登录/,
];

/**
 * Check if content matches any patterns
 */
function matchesPatterns(content: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(content));
}

/**
 * Xiaohongshu block detector
 */
export const detectXiaohongshuBlock: BlockDetector = (
  content: string,
  statusCode?: number,
): BlockDetectionResult => {
  // Check HTTP status first
  if (statusCode === 403) {
    return { type: 'ip-ban', confidence: 0.9, message: 'HTTP 403 Forbidden' };
  }
  if (statusCode === 429) {
    return { type: 'rate-limit', confidence: 0.95, message: 'HTTP 429 Too Many Requests' };
  }

  // Check for login wall / placeholder content
  if (content.length < 300) {
    const genericPhrases = ['旅游笔记', '旅游攻略', '旅游指南', '小红书'];
    if (genericPhrases.some(phrase => content.includes(phrase))) {
      return { type: 'session-expired', confidence: 0.8, message: 'Login wall detected' };
    }
  }

  // Check for captcha
  if (matchesPatterns(content, CAPTCHA_PATTERNS)) {
    return { type: 'captcha', confidence: 0.9, message: 'Captcha detected' };
  }

  // Check for rate limiting
  if (matchesPatterns(content, RATE_LIMIT_PATTERNS)) {
    return { type: 'rate-limit', confidence: 0.85, message: 'Rate limit message detected' };
  }

  // Check for IP ban
  if (matchesPatterns(content, IP_BAN_PATTERNS)) {
    return { type: 'ip-ban', confidence: 0.85, message: 'IP ban message detected' };
  }

  return { type: 'none', confidence: 1.0 };
};

/**
 * Mafengwo block detector
 */
export const detectMafengwoBlock: BlockDetector = (
  content: string,
  statusCode?: number,
): BlockDetectionResult => {
  if (statusCode === 403) {
    return { type: 'ip-ban', confidence: 0.9, message: 'HTTP 403 Forbidden' };
  }
  if (statusCode === 429) {
    return { type: 'rate-limit', confidence: 0.95, message: 'HTTP 429 Too Many Requests' };
  }

  // Mafengwo-specific captcha detection
  const mafengwoIndicators = [
    /验证码/,
    /captcha/i,
    /滑动验证/,
    /请完成验证/,
    /频繁访问/,
  ];

  if (mafengwoIndicators.some(p => p.test(content))) {
    return { type: 'captcha', confidence: 0.9, message: 'Mafengwo captcha detected' };
  }

  // Very short content usually means blocked
  if (content.length < 500 && !content.includes('游记') && !content.includes('攻略')) {
    return { type: 'rate-limit', confidence: 0.7, message: 'Suspiciously short content' };
  }

  if (matchesPatterns(content, RATE_LIMIT_PATTERNS)) {
    return { type: 'rate-limit', confidence: 0.85, message: 'Rate limit detected' };
  }

  if (matchesPatterns(content, IP_BAN_PATTERNS)) {
    return { type: 'ip-ban', confidence: 0.85, message: 'IP ban detected' };
  }

  return { type: 'none', confidence: 1.0 };
};

/**
 * Tongcheng block detector
 */
export const detectTongchengBlock: BlockDetector = (
  content: string,
  statusCode?: number,
): BlockDetectionResult => {
  if (statusCode === 403) {
    return { type: 'ip-ban', confidence: 0.9, message: 'HTTP 403 Forbidden' };
  }
  if (statusCode === 429) {
    return { type: 'rate-limit', confidence: 0.95, message: 'HTTP 429 Too Many Requests' };
  }

  if (matchesPatterns(content, CAPTCHA_PATTERNS)) {
    return { type: 'captcha', confidence: 0.9, message: 'Captcha detected' };
  }

  if (matchesPatterns(content, RATE_LIMIT_PATTERNS)) {
    return { type: 'rate-limit', confidence: 0.85, message: 'Rate limit detected' };
  }

  if (matchesPatterns(content, IP_BAN_PATTERNS)) {
    return { type: 'ip-ban', confidence: 0.85, message: 'IP ban detected' };
  }

  if (matchesPatterns(content, SESSION_EXPIRED_PATTERNS)) {
    return { type: 'session-expired', confidence: 0.85, message: 'Session expired' };
  }

  return { type: 'none', confidence: 1.0 };
};

/**
 * Qyer (穷游) block detector
 */
export const detectQyerBlock: BlockDetector = (
  content: string,
  statusCode?: number,
): BlockDetectionResult => {
  if (statusCode === 403) {
    return { type: 'ip-ban', confidence: 0.9, message: 'HTTP 403 Forbidden' };
  }
  if (statusCode === 429) {
    return { type: 'rate-limit', confidence: 0.95, message: 'HTTP 429 Too Many Requests' };
  }

  if (matchesPatterns(content, CAPTCHA_PATTERNS)) {
    return { type: 'captcha', confidence: 0.9, message: 'Captcha detected' };
  }

  if (matchesPatterns(content, RATE_LIMIT_PATTERNS)) {
    return { type: 'rate-limit', confidence: 0.85, message: 'Rate limit detected' };
  }

  if (matchesPatterns(content, IP_BAN_PATTERNS)) {
    return { type: 'ip-ban', confidence: 0.85, message: 'IP ban detected' };
  }

  // Qyer-specific: empty or error pages
  if (content.length < 200 && content.includes('穷游')) {
    return { type: 'rate-limit', confidence: 0.7, message: 'Minimal content detected' };
  }

  return { type: 'none', confidence: 1.0 };
};

/**
 * Qunar block detector
 */
export const detectQunarBlock: BlockDetector = (
  content: string,
  statusCode?: number,
): BlockDetectionResult => {
  if (statusCode === 403) {
    return { type: 'ip-ban', confidence: 0.9, message: 'HTTP 403 Forbidden' };
  }
  if (statusCode === 429) {
    return { type: 'rate-limit', confidence: 0.95, message: 'HTTP 429 Too Many Requests' };
  }

  if (matchesPatterns(content, CAPTCHA_PATTERNS)) {
    return { type: 'captcha', confidence: 0.9, message: 'Captcha detected' };
  }

  if (matchesPatterns(content, RATE_LIMIT_PATTERNS)) {
    return { type: 'rate-limit', confidence: 0.85, message: 'Rate limit detected' };
  }

  if (matchesPatterns(content, IP_BAN_PATTERNS)) {
    return { type: 'ip-ban', confidence: 0.85, message: 'IP ban detected' };
  }

  return { type: 'none', confidence: 1.0 };
};

/**
 * Get block detector for a platform
 */
export function getBlockDetector(platform: string): BlockDetector {
  switch (platform) {
    case 'xiaohongshu':
      return detectXiaohongshuBlock;
    case 'mafengwo':
      return detectMafengwoBlock;
    case 'tongcheng':
      return detectTongchengBlock;
    case 'qyer':
      return detectQyerBlock;
    case 'qunar':
      return detectQunarBlock;
    default:
      // Generic detector for unknown platforms
      return (content: string, statusCode?: number): BlockDetectionResult => {
        if (statusCode === 403 || statusCode === 429) {
          return { type: 'rate-limit', confidence: 0.8, message: `HTTP ${statusCode}` };
        }
        if (matchesPatterns(content, CAPTCHA_PATTERNS)) {
          return { type: 'captcha', confidence: 0.8, message: 'Captcha detected' };
        }
        return { type: 'none', confidence: 1.0 };
      };
  }
}
