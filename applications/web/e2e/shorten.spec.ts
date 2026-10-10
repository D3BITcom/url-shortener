import { expect, test } from "@playwright/test";
import { BROWSER_UA, createLink, uniqueSlug } from "./helpers";

test("creates a public link with a custom slug and redirects", async ({
  page,
  request,
}) => {
  const slug = uniqueSlug("Pub");
  const target = `https://example.com/e2e/${slug}`;

  const { shortLink, keyLink } = await createLink(page, {
    url: target,
    slug,
    isPublic: true,
  });

  expect(shortLink).toBe(`http://localhost:3100/r/${slug}`);
  await expect(page.getByText(`localhost:3100/r/${slug}`)).toBeVisible();
  await expect(page.getByText("Public", { exact: true })).toBeVisible();
  expect(keyLink).toMatch(/\/r\/key\/k_[A-Za-z0-9]{24}$/);

  const response = await request.get(shortLink, {
    maxRedirects: 0,
    headers: { "User-Agent": BROWSER_UA },
  });
  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toBe(target);

  // Lookups ignore case.
  const lower = await request.get(shortLink.toLowerCase(), { maxRedirects: 0 });
  expect(lower.headers()["location"]).toBe(target);
});

test("shows validation errors and keeps the input", async ({ page }) => {
  await page.goto("");

  await page.fill("#url", "javascript:alert(1)");
  await page.getByRole("button", { name: /shorten it/i }).click();
  await expect(page.getByRole("alert")).toContainText(
    "That doesn't look like a valid URL.",
  );
  await expect(page.locator("#url")).toHaveValue("javascript:alert(1)");

  await page.fill("#url", "example.com");
  await page.fill("#slug", "admin");
  await page.getByRole("button", { name: /shorten it/i }).click();
  await expect(page.getByRole("alert")).toContainText("reserved");
  await expect(page.locator("#slug")).toHaveValue("admin");
});

test("rejects a slug that is taken in another letter case", async ({
  page,
}) => {
  const slug = uniqueSlug("Dup");
  await createLink(page, { url: "example.com/one", slug });

  await page.goto("");
  await page.fill("#url", "example.com/two");
  await page.fill("#slug", slug.toUpperCase());
  await page.getByRole("button", { name: /shorten it/i }).click();

  await expect(page.getByRole("alert")).toContainText("already taken");
});

test("unknown short links show the 404 page", async ({ page }) => {
  const response = await page.goto("does-not-exist-9");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
});
