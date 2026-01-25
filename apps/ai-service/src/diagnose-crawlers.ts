/**
 * Crawler Diagnostic Entry Point
 * Run diagnostics on any platform to identify extraction issues
 *
 * Usage:
 *   npx tsx apps/ai-service/src/diagnose-crawlers.ts --platform ctrip --url "https://..."
 */

import {
  captureForDiagnosis,
  generateDiagnosticReport,
  formatReportAsText,
  type DiagnosticCapture,
} from './lib/crawlers/diagnostics/index.js';
import { initMCP, disconnect } from './lib/crawlers/mcp-client.js';

/**
 * Run diagnostic capture and generate report for a platform URL
 *
 * @param platform Platform name (ctrip, qunar, mafengwo, tongcheng, xiaohongshu)
 * @param url Detail page URL to diagnose
 * @returns DiagnosticCapture object with all raw data
 */
export async function runDiagnostic(
  platform: string,
  url: string
): Promise<DiagnosticCapture> {
  console.log(`\n========================================`);
  console.log(`Diagnostic: ${platform}`);
  console.log(`URL: ${url}`);
  console.log(`========================================\n`);

  // Initialize MCP in isolated mode for diagnostics
  await initMCP({ persistent: false });

  try {
    // Capture raw data
    const capture = await captureForDiagnosis(platform, url);

    // Generate and print report
    const report = generateDiagnosticReport(capture);
    const textReport = formatReportAsText(report);
    console.log('\n' + textReport);

    return capture;
  } finally {
    await disconnect();
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { platform?: string; url?: string } {
  const args = process.argv.slice(2);
  const result: { platform?: string; url?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform' && args[i + 1]) {
      result.platform = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      result.url = args[i + 1];
      i++;
    }
  }

  return result;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Crawler Diagnostic Tool

Usage:
  npx tsx apps/ai-service/src/diagnose-crawlers.ts --platform <name> --url <url>

Options:
  --platform  Platform name (ctrip, qunar, mafengwo, tongcheng, xiaohongshu)
  --url       Detail page URL to diagnose

Examples:
  npx tsx apps/ai-service/src/diagnose-crawlers.ts --platform ctrip --url "https://you.ctrip.com/travels/Beijing1/12345.html"
  npx tsx apps/ai-service/src/diagnose-crawlers.ts --platform qunar --url "https://travel.qunar.com/youji/12345"
`);
}

// CLI entry point
async function main(): Promise<void> {
  const { platform, url } = parseArgs();

  if (!platform || !url) {
    printUsage();
    process.exit(1);
  }

  try {
    await runDiagnostic(platform, url);
    console.log('\nDiagnostic complete.');
  } catch (error) {
    console.error('\nDiagnostic failed:', error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = process.argv[1]?.includes('diagnose-crawlers');
if (isMainModule) {
  main().catch(console.error);
}
