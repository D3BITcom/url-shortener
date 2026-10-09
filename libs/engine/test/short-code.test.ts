import { describe, expect, it } from "vitest";
import {
  generateShortCode,
  isWellFormedShortCode,
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH,
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
  it.each(["abc2345", "AbCd"])("accepts %s", (code) => {
    expect(isWellFormedShortCode(code)).toBe(true);
  });

  it.each(["", "abc", "abc-123", "../etc", "a".repeat(17)])(
    "rejects %j",
    (code) => {
      expect(isWellFormedShortCode(code)).toBe(false);
    },
  );
});
