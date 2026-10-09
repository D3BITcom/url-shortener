/**
 * "Is this a person?" check for link creation (Cloudflare Turnstile in
 * production). A port so the app runs without it locally and in tests.
 */
export interface HumanVerifier {
  readonly enabled: boolean;
  verify(token: string | null, ip: string | null): Promise<boolean>;
}

/** Used when no Turnstile keys are configured. */
export class DisabledHumanVerifier implements HumanVerifier {
  readonly enabled = false;

  async verify(): Promise<boolean> {
    return true;
  }
}
