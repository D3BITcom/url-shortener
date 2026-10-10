import { expect, type Page } from "@playwright/test";

/** A browser-like User-Agent, so redirects count as human clicks (not bots). */
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

export const ADMIN_TOKEN = "e2e-admin-token-0123456789";

/** Unique per call, so tests never collide on the shared database. */
export function uniqueSlug(prefix = "e2e"): string {
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${Date.now().toString(36)}${random}`;
}

/** Creates a link through the UI and returns what the result page shows. */
export async function createLink(
  page: Page,
  options: { url: string; slug?: string; isPublic?: boolean },
): Promise<{ shortLink: string; keyLink: string }> {
  await page.goto("");
  await page.fill("#url", options.url);
  if (options.slug) await page.fill("#slug", options.slug);
  if (options.isPublic) await page.check("#isPublic");
  await page.getByRole("button", { name: /shorten it/i }).click();
  await expect(
    page.getByRole("heading", { name: "IT'S ALIVE!" }),
  ).toBeVisible();

  const shortLink = await page
    .locator('section[aria-labelledby="short-title"] a')
    .first()
    .getAttribute("href");
  const keyText = await page
    .locator("code", { hasText: "/r/key/k_" })
    .innerText();

  return { shortLink: shortLink!, keyLink: `http://${keyText.trim()}` };
}
