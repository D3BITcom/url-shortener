export interface RateLimitDecision {
  allowed: boolean;
  /** 0 when allowed. */
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter per key (client IP).
 *
 * This is in-memory on purpose: one container needs nothing more. When the app
 * runs on several instances, swap this for a shared store (Redis, or the
 * reverse proxy's `limit_req`) behind the same `consume` method.
 */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly options: {
      limit: number;
      windowMs: number;
      now?: () => number;
    },
  ) {}

  consume(key: string): RateLimitDecision {
    const now = this.options.now?.() ?? Date.now();
    this.evictExpired(now);

    const window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.options.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (window.count >= this.options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000),
      };
    }

    window.count++;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Keeps memory bounded by the number of clients active in the current window. */
  private evictExpired(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}
