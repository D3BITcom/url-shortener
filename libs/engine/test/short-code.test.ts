import { describe, expect, it } from "vitest";
import {
  generateShortCode,
  InvalidSlugError,
  isWellFormedShortCode,
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH,
  validateCustomSlug,
} from "../src";

describe("generateShortCode", () => {
  it("uses the configured length and alphabet only", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateShortCode();
      expect(code).toHaveLength(SHORT_CODE_LENGTH);
      for (const char of code) expect(SHORT_CODE_ALPHABET).toContain(char);
    }
  });

  it("excludes look-alike characters", () => {
    for (const char of "0O1Il") expect(SHORT_CODE_ALPHABET).not.toContain(char);
  });

  it("does not collide in a realistic sample (the original only had 9 codes)", () => {
    const codes = new Set(
      Array.from({ length: 10_000 }, () => generateShortCode()),
    );
    expect(codes.size).toBe(10_000);
  });
});

describe("isWellFormedShortCode", () => {
  it.each(["abc2345", "AbCd", "launch-day", "my_link"])(
    "accepts %s",
    (code) => {
      expect(isWellFormedShortCode(code)).toBe(true);
    },
  );

  it.each(["", "abc", "a b c d", "../etc", "a".repeat(33)])(
    "rejects %j",
    (code) => {
      expect(isWellFormedShortCode(code)).toBe(false);
    },
  );
});

describe("validateCustomSlug", () => {
  it("accepts and trims valid slugs, keeping their case", () => {
    expect(validateCustomSlug("  ShOrTUr1 ")).toBe("ShOrTUr1");
    expect(validateCustomSlug("gm_night-2")).toBe("gm_night-2");
  });

  it.each([
    ["abc", /4 to 32/],
    ["a".repeat(33), /4 to 32/],
    ["has space", /letters, numbers/],
    ["emoji✨yes", /letters, numbers/],
    ["ADMIN", /reserved/],
    ["stats", /reserved/],
  ])("rejects %j", (slug, message) => {
    expect(() => validateCustomSlug(slug)).toThrow(InvalidSlugError);
    expect(() => validateCustomSlug(slug)).toThrow(message);
  });
});
