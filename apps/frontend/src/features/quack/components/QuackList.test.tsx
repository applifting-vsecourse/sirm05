// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

vi.mock("@/features/quack/hooks/useDeleteQuack", () => ({
  useDeleteQuack: () => ({ mutate: vi.fn(), isPending: false }),
}))

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows a quack's mood as text, and nothing for a quack without one", () => {
    render(<QuackList quacks={[quack({ mood: "silly" }), quack({ id: "q2" })]} />)

    expect(screen.getAllByText(/feeling/)).toHaveLength(1)
    expect(screen.getByText("feeling silly")).toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it("tells the user nothing matches and lets them clear the search", async () => {
    const onClearSearch = vi.fn()
    render(
      <QuackList
        quacks={[]}
        search="pond"
        onClearSearch={onClearSearch}
      />,
    )

    expect(screen.getByText(/No quacks match .pond../)).toBeInTheDocument()
    expect(screen.queryByText(/no quacks yet/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /clear search/i }))
    expect(onClearSearch).toHaveBeenCalledOnce()
  })

  it("offers actions on my quacks only", () => {
    render(
      <QuackList
        quacks={[quack(), quack({ id: "q2", userId: "u2" })]}
        viewerId="u1"
      />,
    )

    expect(screen.getAllByRole("button", { name: "More actions" })).toHaveLength(1)
  })

  it("offers actions on every quack to a moderator", () => {
    render(
      <QuackList
        quacks={[quack(), quack({ id: "q2", userId: "u2" })]}
        viewerId="u1"
        canModerate
      />,
    )

    expect(screen.getAllByRole("button", { name: "More actions" })).toHaveLength(2)
  })

  it("on Mine with no quacks, says so and offers to write the first one", async () => {
    const onWriteFirst = vi.fn()
    render(
      <QuackList
        quacks={[]}
        isMine
        onWriteFirst={onWriteFirst}
      />,
    )

    expect(screen.getByText("You haven't posted any quacks yet.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Write your first quack" }))
    expect(onWriteFirst).toHaveBeenCalledOnce()
  })

  it("on Mine with a search that matches nothing, shows the search state", () => {
    render(
      <QuackList
        quacks={[]}
        isMine
        search="pond"
      />,
    )

    expect(screen.getByText(/No quacks match .pond../)).toBeInTheDocument()
    expect(screen.queryByText(/haven't posted/)).not.toBeInTheDocument()
  })
})
