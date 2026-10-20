import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackActions } from "@/features/quack/components/QuackActions"

const mutate = vi.fn()
vi.mock("@/features/quack/hooks/useDeleteQuack", () => ({
  useDeleteQuack: () => ({ mutate, isPending: false }),
}))

const quack: Quack = {
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
}

const openDialog = async () => {
  await userEvent.click(screen.getByRole("button", { name: "More actions" }))
  await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
}

describe("QuackActions", () => {
  beforeEach(() => {
    mutate.mockReset()
  })

  it("asks before deleting, and Cancel changes nothing", async () => {
    render(<QuackActions quack={quack} />)
    await openDialog()

    expect(screen.getByRole("alertdialog", { name: "Delete this quack?" })).toHaveTextContent(
      "quack quack",
    )

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("deletes the quack on confirm and closes when the server agrees", async () => {
    mutate.mockImplementation((_id: string, options: { onSuccess: () => void }) => {
      options.onSuccess()
    })
    render(<QuackActions quack={quack} />)
    await openDialog()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(mutate).toHaveBeenCalledWith("q1", expect.anything())
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
