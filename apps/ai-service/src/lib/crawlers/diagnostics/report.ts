/**
 * Diagnostic Report Utilities
 * Categorizes failures and generates human-readable reports
 */

import type { DiagnosticCapture } from './capture.js';
import type { CrawlResult } from '../index.js';

/**
 * Failure category union type
 * Distinguishes between acquisition (page not loaded) and parsing (data not extracted) issues
 */
export type FailureCategory =
  // Acquisition issues - page didn't load correctly
  | 'acquisition:blocked' // Anti-bot detected, access denied
  | 'acquisition:login_required' // Login wall shown
  | 'acquisition:timeout' // Page didn't load in time
  | 'acquisition:captcha' // Captcha challenge presented
  | 'acquisition:empty' // Page loaded but content is empty
  // Parsing issues - page loaded but data extraction failed
  | 'parsing:no_content' // Snapshot exists but no text extracted
  | 'parsing:no_images' // Text extracted but no images
  | 'parsing:partial' // Some fields missing
  | 'parsing:selector_miss' // Pattern didn't match expected structure
  // Success
  | 'success';

/**
 * Anti-bot indicator detection result
 */
export interface AntiBotIndicators {
  captcha: boolean;
  loginWall: boolean;
  blocked: boolean;
  empty: boolean;
}

/**
 * Detect anti-bot indicators in page content
 * Checks for captcha, login wall, blocked access, and empty content
 *
 * @param content Page snapshot content
 * @returns Record of detected anti-bot indicators
 */
export function detectAntiBotIndicators(content: string): AntiBotIndicators {
  return {
    captcha: /验证|captcha|verify|滑动验证/i.test(content),
    loginWall:
      /登录|sign.?in|login|扫码|请先登录/i.test(content) &&
      !/退出|logout|已登录/i.test(content),
    blocked: /blocked|forbidden|access.?denied|访问被拒绝|请求过于频繁/i.test(
      content
    ),
    empty: content.length < 500,
  };
}

/**
 * Categorize failure based on diagnostic capture
 * First checks acquisition issues, then parsing issues
 *
 * @param capture Diagnostic capture data
 * @returns Failure category
 */
export function categorizeFailure(capture: DiagnosticCapture): FailureCategory {
  const { snapshot, parseResult } = capture;

  // Check acquisition issues first (priority order)
  if (snapshot.length < 500) {
    return 'acquisition:empty';
  }

  const antiBot = detectAntiBotIndicators(snapshot);

  if (antiBot.captcha) {
    return 'acquisition:captcha';
  }

  if (antiBot.loginWall) {
    return 'acquisition:login_required';
  }

  if (antiBot.blocked) {
    return 'acquisition:blocked';
  }

  // Check parsing issues
  if (!parseResult) {
    return 'parsing:no_content';
  }

  if (!parseResult.content || parseResult.content.length < 100) {
    return 'parsing:no_content';
  }

  if (!parseResult.imageUrls || parseResult.imageUrls.length === 0) {
    return 'parsing:no_images';
  }

  // Check for partial extraction (missing important fields)
  const missingFields: string[] = [];
  if (!parseResult.title) missingFields.push('title');
  if (!parseResult.authorName) missingFields.push('authorName');

  if (missingFields.length > 0) {
    return 'parsing:partial';
  }

  return 'success';
}

/**
 * Get recommended action based on failure category
 */
function getRecommendedAction(category: FailureCategory): string {
  switch (category) {
    case 'acquisition:empty':
      return 'Check if URL is valid and page loads correctly in browser';
    case 'acquisition:captcha':
      return 'Captcha detected - consider manual login with cookie persistence';
    case 'acquisition:login_required':
      return 'Login required - use login-helper to save session cookies';
    case 'acquisition:blocked':
      return 'Access blocked - may need residential proxy or longer delays';
    case 'acquisition:timeout':
      return 'Page load timeout - check network and increase timeout';
    case 'parsing:no_content':
      return 'Content exists but not extracted - check selectors/parsing logic';
    case 'parsing:no_images':
      return 'Images not extracted - check image URL extraction patterns';
    case 'parsing:partial':
      return 'Partial extraction - review missing field selectors';
    case 'parsing:selector_miss':
      return 'Selector mismatch - page structure may have changed';
    case 'success':
      return 'No action needed - extraction successful';
    default:
      return 'Unknown failure - manual investigation required';
  }
}

/**
 * Diagnostic report structure
 */
export interface DiagnosticReport {
  platform: string;
  url: string;
  timestamp: string;
  category: FailureCategory;
  isSuccess: boolean;

  // Timing
  navigationTime: number;
  contentLoadTime: number;
  contentStable: boolean;

  // Content analysis
  snapshotLength: number;
  snapshotPreview: string;
  antiBot: AntiBotIndicators;
  networkRequestCount: number;

  // Parsing results
  parseResult: CrawlResult | null;
  parseErrors: string[];

  // Recommendation
  recommendedAction: string;
}

/**
 * Generate human-readable diagnostic report
 *
 * @param capture Diagnostic capture data
 * @returns Formatted diagnostic report
 */
export function generateDiagnosticReport(
  capture: DiagnosticCapture
): DiagnosticReport {
  const category = categorizeFailure(capture);
  const antiBot = detectAntiBotIndicators(capture.snapshot);

  return {
    platform: capture.platform,
    url: capture.url,
    timestamp: new Date(capture.timestamp).toISOString(),
    category,
    isSuccess: category === 'success',

    navigationTime: capture.navigationTime,
    contentLoadTime: capture.contentLoadTime,
    contentStable: capture.contentStable,

    snapshotLength: capture.snapshot.length,
    snapshotPreview: capture.snapshot.substring(0, 500),
    antiBot,
    networkRequestCount: capture.networkRequests.length,

    parseResult: capture.parseResult,
    parseErrors: capture.parseErrors,

    recommendedAction: getRecommendedAction(category),
  };
}

/**
 * Format diagnostic report as readable text
 *
 * @param report Diagnostic report
 * @returns Formatted text report
 */
export function formatReportAsText(report: DiagnosticReport): string {
  const lines = [
    `=== Diagnostic Report ===`,
    `Platform: ${report.platform}`,
    `URL: ${report.url}`,
    `Time: ${report.timestamp}`,
    ``,
    `--- Status ---`,
    `Category: ${report.category}`,
    `Success: ${report.isSuccess ? 'YES' : 'NO'}`,
    ``,
    `--- Timing ---`,
    `Navigation: ${report.navigationTime}ms`,
    `Content Load: ${report.contentLoadTime}ms`,
    `Content Stable: ${report.contentStable}`,
    ``,
    `--- Content Analysis ---`,
    `Snapshot Length: ${report.snapshotLength} chars`,
    `Network Requests: ${report.networkRequestCount}`,
    ``,
    `--- Anti-Bot Detection ---`,
    `Captcha: ${report.antiBot.captcha}`,
    `Login Wall: ${report.antiBot.loginWall}`,
    `Blocked: ${report.antiBot.blocked}`,
    `Empty: ${report.antiBot.empty}`,
    ``,
    `--- Snapshot Preview ---`,
    report.snapshotPreview,
    `...`,
    ``,
  ];

  if (report.parseResult) {
    lines.push(`--- Parse Results ---`);
    lines.push(`Title: ${report.parseResult.title || '(missing)'}`);
    lines.push(
      `Content: ${report.parseResult.content?.substring(0, 100) || '(missing)'}...`
    );
    lines.push(`Images: ${report.parseResult.imageUrls?.length || 0}`);
    lines.push(`Videos: ${report.parseResult.videoUrls?.length || 0}`);
    lines.push(`Author: ${report.parseResult.authorName || '(missing)'}`);
    lines.push(``);
  }

  if (report.parseErrors.length > 0) {
    lines.push(`--- Parse Errors ---`);
    report.parseErrors.forEach((err) => lines.push(`  - ${err}`));
    lines.push(``);
  }

  lines.push(`--- Recommendation ---`);
  lines.push(report.recommendedAction);
  lines.push(``);
  lines.push(`========================`);

  return lines.join('\n');
}
