import { expect, test, type Browser, type Page } from "@playwright/test"

import { signIn as signInPage } from "./signIn"

const API = "http://localhost:4050/api"

// Seeded users, see apps/backend/src/scripts/seed/seed/seed-database.ts
const AUTHOR = { email: "caffeinatedduck@example.com", password: "password1" }
const OTHER = { email: "deepduckthoughts@example.com", password: "password2" }
const ADMIN = { email: "admin@example.com", password: "adminpassword" }

// Each user on their own page (its own browser context), so their sessions don't mix.
const signIn = async (browser: Browser, user: { email: string; password: string }) => {
  const page = await browser.newPage()
  await signInPage(page, user.email, user.password)
  return page
}

const quackItem = (page: Page, text: string) => page.locator("article").filter({ hasText: text })

test("a moderator deletes someone else's quack, a regular user can't", async ({
  browser,
  request,
}) => {
  const text = `e2e moderation ${Date.now()}`

  const author = await signIn(browser, AUTHOR)
  await author.getByPlaceholder("Quack something...").fill(text)
  const [posted] = await Promise.all([
    author.waitForResponse((r) => r.url() === `${API}/quacks` && r.request().method() === "POST"),
    author.getByRole("button", { name: "Quack", exact: true }).click(),
  ])
  const { id } = (await posted.json()) as { id: string }

  // Signed out: 401.
  expect((await request.delete(`${API}/quacks/${id}`)).status()).toBe(401)

  // A regular user sees no Delete, and the API refuses too.
  const other = await signIn(browser, OTHER)
  await expect(quackItem(other, text)).toBeVisible()
  await expect(
    quackItem(other, text).getByRole("button", { name: "More actions" }),
  ).not.toBeVisible()
  expect((await other.request.delete(`${API}/quacks/${id}`)).status()).toBe(403)

  // The admin deletes it through the UI.
  const admin = await signIn(browser, ADMIN)
  await quackItem(admin, text).getByRole("button", { name: "More actions" }).click()
  await admin.getByRole("menuitem", { name: "Delete" }).click()
  const dialog = admin.getByRole("alertdialog", { name: "Delete @CaffeinatedDuck's quack?" })
  await dialog.getByRole("button", { name: "Delete" }).click()
  await expect(quackItem(admin, text)).not.toBeVisible()

  // Gone for the author too.
  await author.reload()
  await expect(author.locator("article").first()).toBeVisible() // feed loaded
  await expect(quackItem(author, text)).not.toBeVisible()
})
