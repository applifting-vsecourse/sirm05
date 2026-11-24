import { expect, test, type Browser, type Page } from "@playwright/test"

import { signIn as signInPage } from "./signIn"

const API = "http://localhost:4050/api"

// Seeded users, see apps/backend/src/scripts/seed/seed/seed-database.ts
const AUTHOR = { email: "caffeinatedduck@example.com", password: "password1" }
const REPLIER = { email: "deepduckthoughts@example.com", password: "password2" }

const signIn = async (browser: Browser, user: { email: string; password: string }) => {
  const page = await browser.newPage()
  await signInPage(page, user.email, user.password)
  return page
}

const quackItem = (page: Page, text: string) => page.locator("article").filter({ hasText: text })

type ApiQuack = { id: string; text: string; replyTo: { username: string | null } | null }

// ADR 0004: deleting a quack with replies keeps the replies, and its text is gone everywhere.
test("replies survive their quack's deletion, the quack's text doesn't", async ({ browser }) => {
  const token = `e2e${Date.now()}`
  const text = `${token} original`
  const replyText = `${token} answer`

  const author = await signIn(browser, AUTHOR)
  await author.getByPlaceholder("Quack something...").fill(text)
  const [posted] = await Promise.all([
    author.waitForResponse((r) => r.url() === `${API}/quacks` && r.request().method() === "POST"),
    author.getByRole("button", { name: "Quack", exact: true }).click(),
  ])
  const { id } = (await posted.json()) as { id: string }

  // Someone replies under it.
  const replier = await signIn(browser, REPLIER)
  await quackItem(replier, text).getByRole("button", { name: "Reply", exact: true }).click()
  await quackItem(replier, text).getByPlaceholder("Quack back...").fill(replyText)
  const [replied] = await Promise.all([
    replier.waitForResponse(
      (r) => r.url() === `${API}/quacks/${id}/replies` && r.request().method() === "POST",
    ),
    quackItem(replier, text).getByRole("button", { name: "Post reply" }).click(),
  ])
  const reply = (await replied.json()) as ApiQuack
  await expect(quackItem(replier, text).getByText(replyText)).toBeVisible()
  await expect(quackItem(replier, text).getByRole("button", { name: "1 reply" })).toBeVisible()

  // One level only: a reply can't be replied to.
  const nested = await replier.request.post(`${API}/quacks/${reply.id}/replies`, {
    data: { text: "deeper" },
  })
  expect(nested.status()).toBe(400)

  // The author deletes the quack.
  await author.reload()
  await quackItem(author, text).getByRole("button", { name: "More actions" }).click()
  await author.getByRole("menuitem", { name: "Delete" }).click()
  await author.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click()
  await expect(author.getByRole("alertdialog")).not.toBeVisible()
  await expect(author.getByText(text)).not.toBeVisible()

  // The reply stays under a placeholder.
  await replier.reload()
  const placeholder = replier
    .locator("article")
    .filter({ hasText: "This quack was deleted." })
    .filter({
      has: replier.getByRole("button", { name: "1 reply" }),
    })
  await placeholder.first().getByRole("button", { name: "1 reply" }).click()
  await expect(replier.getByText(replyText)).toBeVisible()
  await expect(replier.getByText(text)).not.toBeVisible()

  // The text shows up nowhere: feed, thread, search (by text and by author), Mine.
  const read = async (path: string) =>
    (await (await replier.request.get(`${API}/${path}`)).json()) as ApiQuack[]
  for (const path of [
    "quacks",
    `quacks/${id}/replies`,
    `quacks?q=${token}`,
    "quacks?q=CaffeinatedDuck",
  ]) {
    expect((await read(path)).map((q) => q.text)).not.toContain(text)
  }
  expect(
    (await (await author.request.get(`${API}/quacks?mine=true`)).json()) as ApiQuack[],
  ).not.toContainEqual(expect.objectContaining({ id }))
  // Search still finds the reply, labelled as answering a deleted quack.
  expect(await read(`quacks?q=${token}`)).toContainEqual(
    expect.objectContaining({ id: reply.id, replyTo: { username: null } }),
  )

  // A deleted quack can't be replied to or deleted again.
  expect(
    (
      await replier.request.post(`${API}/quacks/${id}/replies`, { data: { text: "late" } })
    ).status(),
  ).toBe(404)
  expect((await author.request.delete(`${API}/quacks/${id}`)).status()).toBe(404)
})
