import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "../src";

describe("FixedWindowRateLimiter", () => {
  function setup() {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({
      limit: 2,
      windowMs: 60_000,
      now: () => now,
    });
    return { limiter, advance: (ms: number) => (now += ms) };
  }

  it("allows up to the limit, then blocks with a retry hint", () => {
    const { limiter, advance } = setup();

    expect(limiter.consume("ip").allowed).toBe(true);
    expect(limiter.consume("ip").allowed).toBe(true);
    advance(15_000);
    expect(limiter.consume("ip")).toEqual({
      allowed: false,
      retryAfterSeconds: 45,
    });
  });

  it("tracks keys independently", () => {
    const { limiter } = setup();

    limiter.consume("a");
    limiter.consume("a");

    expect(limiter.consume("a").allowed).toBe(false);
    expect(limiter.consume("b").allowed).toBe(true);
  });

  it("starts a fresh window once the old one expires", () => {
    const { limiter, advance } = setup();

    limiter.consume("ip");
    limiter.consume("ip");
    advance(60_000);

    expect(limiter.consume("ip").allowed).toBe(true);
  });
});
