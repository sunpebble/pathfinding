/**
 * Chinese-style count parsing (D4).
 *
 * Single TS source of truth for parsing crawler count strings such as
 * `1.2万`, `12万`, `1.5亿`, `3,456`, `2.3k` or plain digits.
 *
 * Contract: parsing failure returns `null` — NEVER 0. A zero is only
 * returned for a literal, well-formed `0`. Callers decide how to surface
 * the failure (e.g. record an ingest warning); silently coercing to 0 is
 * exactly the bug this function exists to fix.
 */

/** Multipliers for supported count suffixes (case-insensitive for latin). */
const UNIT_MULTIPLIERS: Record<string, number> = {
  万: 10_000,
  w: 10_000,
  亿: 100_000_000,
  k: 1_000,
};

/**
 * Numeric part followed by an optional unit suffix. The numeric part is
 * either comma-grouped (`3,456`) or plain (`1234`, `1.2`).
 */
const COUNT_PATTERN = /^(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)([万亿wk])?$/i;

/**
 * Parse a Chinese-style count string into a number.
 *
 * Supported formats (surrounding whitespace tolerated):
 * - `1.2万` → 12000, `12万` → 120000
 * - `1.5亿` → 150000000
 * - `2.3k` / `1.2w` → 2300 / 12000
 * - `3,456` → 3456 (strict thousands grouping)
 * - `12345` → 12345, `0` → 0
 *
 * @param raw - Raw string scraped from the page.
 * @returns Parsed non-negative number, or `null` when the input is not a
 *   recognizable count (empty, trailing text, malformed grouping, ...).
 */
export function parseChineseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '')
    return null;

  const match = COUNT_PATTERN.exec(trimmed);
  if (!match)
    return null;

  const [, numericPart, unit] = match;
  const value = Number.parseFloat(numericPart!.replaceAll(',', ''));
  if (!Number.isFinite(value))
    return null;

  if (!unit)
    return value;

  const multiplier = UNIT_MULTIPLIERS[unit.toLowerCase()];
  if (multiplier === undefined)
    return null;

  return Math.round(value * multiplier);
}
