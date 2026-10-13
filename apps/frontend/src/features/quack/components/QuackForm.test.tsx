import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { QuackForm } from "@/features/quack/components/QuackForm"

const mutate = vi.fn()
vi.mock("@/features/quack/hooks/useAddQuack", () => ({
  useAddQuack: () => ({ mutate, isPending: false, error: null }),
}))

const post = async (text: string) => {
  await userEvent.type(screen.getByLabelText("New quack"), text)
  await userEvent.click(screen.getByRole("button", { name: "Quack" }))
}

describe("QuackForm", () => {
  it("posts without a mood by default", async () => {
    render(<QuackForm />)

    expect(screen.getByRole("radio", { name: "none" })).toBeChecked()
    await post("hello")

    expect(mutate).toHaveBeenLastCalledWith({ text: "hello", mood: undefined }, expect.anything())
  })

  it("posts the picked mood and resets the picker afterwards", async () => {
    mutate.mockImplementation((_input: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    )
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("radio", { name: "happy" }))
    await post("hello")

    expect(mutate).toHaveBeenLastCalledWith({ text: "hello", mood: "happy" }, expect.anything())
    expect(screen.getByRole("radio", { name: "none" })).toBeChecked()
  })

  it("starts on, and returns to, the user's default mood", async () => {
    render(<QuackForm defaultMood="sad" />)

    expect(screen.getByRole("radio", { name: "sad" })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "angry" }))
    await post("hello")

    expect(mutate).toHaveBeenLastCalledWith({ text: "hello", mood: "angry" }, expect.anything())
    expect(screen.getByRole("radio", { name: "sad" })).toBeChecked()
  })
})
