const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const numberFormat = new Intl.NumberFormat("en");
const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** "FR" → "🇫🇷 France". Flags are regional-indicator emoji, so no image assets. */
export function formatCountry(code: string | null): string {
  if (!code) return "Unknown";
  const flag = String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
  let name = code;
  try {
    name = regionNames.of(code) ?? code;
  } catch {
    // Unknown region code; show it as-is.
  }
  return `${flag} ${name}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/**
 * "3 hours ago". `now` comes from the loader (server time), so server and
 * client render the same text and hydration doesn't mismatch.
 */
export function formatRelative(date: Date, now: Date): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormat.format(Math.trunc(seconds / size), unit);
    }
  }
  return "just now";
}

/** "Oct 9" from "2026-10-09". Parsed as UTC to match how days are stored. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Strip the scheme for display: "https://example.com/a" → "example.com/a". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** "https://www.github.com/a/b" → "github.com" */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
