import { expect, test } from "@playwright/test";
import { BROWSER_UA, createLink, uniqueSlug } from "./helpers";

test("private stats are visible to the owner only, until made public", async ({
  page,
  browser,
}) => {
  const slug = uniqueSlug("Priv");
  await createLink(page, { url: "example.com/private", slug });

  const stranger = await (await browser.newContext()).newPage();
  const hidden = await stranger.goto(`stats/${slug}`);
  expect(hidden?.status()).toBe(404);

  await page.goto(`stats/${slug}`);
  await expect(page.getByText("MANAGE.EXE")).toBeVisible();
  await page.getByRole("button", { name: "Make public" }).click();
  await expect(
    page.getByRole("button", { name: "Make private" }),
  ).toBeVisible();

  const visible = await stranger.goto(`stats/${slug}`);
  expect(visible?.status()).toBe(200);
  await expect(stranger.getByText("TOTAL CLICKS")).toBeVisible();
  await expect(stranger.getByText("MANAGE.EXE")).toHaveCount(0);
  await stranger.context().close();
});

test("the secret key link restores ownership in a fresh browser", async ({
  page,
  browser,
}) => {
  const slug = uniqueSlug("Key");
  const { keyLink } = await createLink(page, { url: "example.com/key", slug });

  const device = await (await browser.newContext()).newPage();
  await device.goto("me");
  await expect(device.getByText("doesn't know you yet")).toBeVisible();

  await device.goto(keyLink);
  await expect(device).toHaveURL(/\/r\/me$/);
  await expect(
    device.getByRole("link", { name: new RegExp(slug) }).first(),
  ).toBeVisible();

  const bad = await device.goto("key/k_AAAAAAAAAAAAAAAAAAAAAAAA");
  expect(bad?.status()).toBe(404);
  await device.context().close();
});

test("the owner can rename a slug only until the first click", async ({
  page,
  request,
}) => {
  const slug = uniqueSlug("Old");
  const renamed = uniqueSlug("New");
  await createLink(page, { url: "example.com/rename", slug });

  await page.goto(`stats/${slug}`);
  await page.locator("#slug").fill(renamed);
  await page.getByRole("button", { name: "Rename" }).click();
  await expect(page).toHaveURL(new RegExp(`/r/stats/${renamed}$`));

  const click = await request.get(`http://localhost:3100/r/${renamed}`, {
    maxRedirects: 0,
    headers: { "User-Agent": BROWSER_UA },
  });
  expect(click.status()).toBe(302);

  // Click recording is fire-and-forget; poll until the lock shows up.
  await expect(async () => {
    await page.reload();
    await expect(page.getByText(/^Locked:/)).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Rename" })).toHaveCount(0);
});
