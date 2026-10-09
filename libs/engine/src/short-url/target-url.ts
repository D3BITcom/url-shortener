import { InvalidUrlError } from "../shared/errors";

export const MAX_URL_LENGTH = 2048;

export interface TargetUrlPolicy {
  /** Hosts that must never be shortened, e.g. our own (avoids redirect loops). */
  blockedHosts?: string[];
}

/**
 * Turns user input into a safe, canonical redirect target, or throws an
 * InvalidUrlError with a message the user can act on.
 *
 * Every value that reaches a 302 Location header passes through here, so this
 * is what prevents `javascript:` / `data:` redirects.
 */
export function normalizeTargetUrl(
  input: string,
  policy: TargetUrlPolicy = {},
): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new InvalidUrlError("Please enter a URL.");
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(
      `That URL is too long (max ${MAX_URL_LENGTH} characters).`,
    );
  }

  // People type "example.com"; default to https. Inputs like
  // "javascript:alert(1)" become "https://javascript:alert(1)", which fails to
  // parse, so there's no scheme guessing to get wrong.
  const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new InvalidUrlError("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidUrlError(
      "Only http:// and https:// links can be shortened.",
    );
  }
  if (url.username || url.password) {
    // "https://paypal.com@evil.example" is a classic phishing disguise.
    throw new InvalidUrlError("Links containing credentials are not allowed.");
  }
  if (!url.hostname.includes(".")) {
    // Rejects "localhost", bare words and IPv6 literals: none of these are
    // useful public links.
    throw new InvalidUrlError("That doesn't look like a valid URL.");
  }

  const hostname = url.hostname.toLowerCase();
  const blocked = (policy.blockedHosts ?? []).map((h) => h.toLowerCase());
  if (blocked.includes(hostname)) {
    throw new InvalidUrlError(
      "Links to this shortener can't be shortened again.",
    );
  }

  return url.href;
}
