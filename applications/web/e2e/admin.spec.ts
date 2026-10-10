import { expect, test } from "@playwright/test";
import { ADMIN_TOKEN, BROWSER_UA, createLink, uniqueSlug } from "./helpers";

test("admin can log in and hide a public link", async ({
  page,
  browser,
  request,
}) => {
  const slug = uniqueSlug("Adm");
  const target = "https://example.com/admin-e2e";
  await createLink(page, { url: target, slug, isPublic: true });

  const admin = await (await browser.newContext()).newPage();
  await admin.goto("admin");
  await expect(admin).toHaveURL(/\/r\/admin\/login$/);

  await admin.fill("#token", "definitely-the-wrong-token");
  await admin.locator("form button[type=submit]").click();
  await expect(admin.getByRole("alert")).toContainText("Wrong token.");

  await admin.fill("#token", ADMIN_TOKEN);
  await admin.locator("form button[type=submit]").click();
  await expect(admin).toHaveURL(/\/r\/admin$/);
  await expect(admin.getByText("Admin Console")).toBeVisible();

  await admin.fill("#q", slug);
  await admin.getByRole("button", { name: "Find" }).click();
  const row = admin.getByRole("row", { name: new RegExp(slug) });
  await row.getByRole("button", { name: "Hide" }).click();
  await expect(row.getByRole("button", { name: "Unhide" })).toBeVisible();

  const anonymous = await (await browser.newContext()).newPage();
  const stats = await anonymous.goto(`stats/${slug}`);
  expect(stats?.status()).toBe(404);

  // Hidden links keep redirecting.
  const redirect = await request.get(`http://localhost:3100/r/${slug}`, {
    maxRedirects: 0,
    headers: { "User-Agent": BROWSER_UA },
  });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers()["location"]).toBe(target);

  await admin.context().close();
  await anonymous.context().close();
});
