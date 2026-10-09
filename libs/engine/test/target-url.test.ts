import { describe, expect, it } from "vitest";
import { InvalidUrlError, MAX_URL_LENGTH, normalizeTargetUrl } from "../src";

describe("normalizeTargetUrl", () => {
  it.each([
    ["https://example.com", "https://example.com/"],
    ["  http://example.com/a?b=c#d  ", "http://example.com/a?b=c#d"],
    ["example.com/path", "https://example.com/path"],
    ["sub.Example.COM:8080", "https://sub.example.com:8080/"],
  ])("accepts %j as %j", (input, expected) => {
    expect(normalizeTargetUrl(input)).toBe(expected);
  });

  it.each([
    ["", "Please enter a URL."],
    ["   ", "Please enter a URL."],
    ["javascript:alert(1)", "That doesn't look like a valid URL."],
    [
      "data:text/html,<script>alert(1)</script>",
      "That doesn't look like a valid URL.",
    ],
    [
      "ftp://example.com/file",
      "Only http:// and https:// links can be shortened.",
    ],
    [
      "https://paypal.com@evil.example",
      "Links containing credentials are not allowed.",
    ],
    ["hello", "That doesn't look like a valid URL."],
    ["http://localhost:3000", "That doesn't look like a valid URL."],
    ["https://exa mple.com", "That doesn't look like a valid URL."],
  ])("rejects %j", (input, message) => {
    expect(() => normalizeTargetUrl(input)).toThrow(
      new InvalidUrlError(message),
    );
  });

  it("rejects URLs over the length limit", () => {
    const url = `https://example.com/${"a".repeat(MAX_URL_LENGTH)}`;
    expect(() => normalizeTargetUrl(url)).toThrow(/too long/);
  });

  it("rejects the shortener's own host to avoid redirect loops", () => {
    expect(() =>
      normalizeTargetUrl("https://SHORT.example/s/abc", {
        blockedHosts: ["short.example"],
      }),
    ).toThrow(/can't be shortened again/);
  });
});
