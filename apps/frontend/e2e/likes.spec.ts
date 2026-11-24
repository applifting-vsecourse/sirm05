import { expect, test, type Browser, type Page } from "@playwright/test"

import { signIn as signInPage } from "./signIn"

// Case E1: docs/user-stories/quack-likes.cases.md
// Seeded users, see apps/backend/src/scripts/seed/seed/seed-database.ts
const AUTHOR = { email: "caffeinatedduck@example.com", password: "password1" }
const OTHER = { email: "deepduckthoughts@example.com", password: "password2" }

const signIn = async (browser: Browser, user: { email: string; password: string }) => {
  const page = await browser.newPage()
  await signInPage(page, user.email, user.password)
  return page
}

const likeButton = (page: Page, text: string) =>
  page
    .locator("article")
    .filter({ hasText: text })
    .getByRole("button", { name: "Like", exact: true })

test("E1: like a quack, see it counted for everyone, take it back", async ({ browser }) => {
  const text = `e2e${Date.now()} likeable`

  const author = await signIn(browser, AUTHOR)
  await author.getByPlaceholder("Quack something...").fill(text)
  await author.getByRole("button", { name: "Quack", exact: true }).click()

  const like = likeButton(author, text)
  await expect(like).toHaveText("0")
  await expect(like).toHaveAttribute("aria-pressed", "false")

  await like.click()
  await expect(like).toHaveText("1")
  await expect(like).toHaveAttribute("aria-pressed", "true")

  // Stored, not just shown.
  await author.reload()
  await expect(likeButton(author, text)).toHaveText("1")
  await expect(likeButton(author, text)).toHaveAttribute("aria-pressed", "true")

  // Someone else sees the count, but not as their like.
  const other = await signIn(browser, OTHER)
  await expect(likeButton(other, text)).toHaveText("1")
  await expect(likeButton(other, text)).toHaveAttribute("aria-pressed", "false")

  // Taking it back.
  await likeButton(author, text).click()
  await expect(likeButton(author, text)).toHaveText("0")
  await expect(likeButton(author, text)).toHaveAttribute("aria-pressed", "false")
})
