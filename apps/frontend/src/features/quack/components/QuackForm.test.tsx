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

describe("QuackForm poll", () => {
  const answer = (n: number) => screen.getByLabelText(`Answer ${n}`)

  it("posts a poll with its answers, trimmed, and resets to no poll", async () => {
    mutate.mockImplementation((_input: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    )
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    await userEvent.type(answer(1), " Pizza ")
    await userEvent.type(answer(2), "Sushi")
    await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
    await userEvent.type(answer(3), "Salad")
    await post("Lunch?")

    expect(mutate).toHaveBeenLastCalledWith(
      { text: "Lunch?", mood: undefined, pollOptions: ["Pizza", "Sushi", "Salad"] },
      expect.anything(),
    )
    expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()
  })

  it("sends no poll after removing it", async () => {
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    await userEvent.click(screen.getByRole("button", { name: "Remove poll" }))
    await post("hello")

    expect(mutate).toHaveBeenLastCalledWith(
      { text: "hello", mood: undefined, pollOptions: undefined },
      expect.anything(),
    )
  })

  it("keeps between 2 and 10 answers", async () => {
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    expect(screen.getByRole("button", { name: "Remove answer 1" })).toBeDisabled()

    for (let i = 0; i < 8; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
    }
    expect(answer(10)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add answer" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remove answer 10" }))
    expect(screen.queryByLabelText("Answer 10")).not.toBeInTheDocument()
  })

  it("says what is wrong with the answers and does not post", async () => {
    mutate.mockClear()
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    await userEvent.type(answer(1), "Pizza")
    await userEvent.type(answer(2), " PIZZA")
    await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
    await userEvent.type(answer(3), "a".repeat(51))
    await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
    await post("Lunch?")

    expect(screen.getByText("Already an answer")).toBeInTheDocument()
    expect(screen.getByText("Keep it under 50 characters")).toBeInTheDocument()
    expect(screen.getByText("Write an answer")).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })
})
