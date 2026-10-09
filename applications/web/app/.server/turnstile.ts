import type { HumanVerifier } from "@url-shortener/engine";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare Turnstile: a mostly invisible "are you human" check. Works on
 * any site, Cloudflare proxy or not. Fails closed: if Cloudflare can't be
 * reached, link creation is refused rather than left unprotected.
 */
export class TurnstileVerifier implements HumanVerifier {
  readonly enabled = true;

  constructor(private readonly secretKey: string) {}

  async verify(token: string | null, ip: string | null): Promise<boolean> {
    if (!token) return false;

    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });
    if (ip) body.set("remoteip", ip);

    try {
      const response = await fetch(VERIFY_URL, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(5000),
      });
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch {
      return false;
    }
  }
}
