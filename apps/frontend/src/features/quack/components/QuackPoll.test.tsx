import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { QuackPoll } from "@/features/quack/components/QuackPoll"

const mutate = vi.fn()
vi.mock("@/features/quack/hooks/useVote", () => ({
  useVote: () => ({ mutate }),
}))

const aPoll = (count: number, myOptionId: string | null = null): Poll => ({
  options: Array.from({ length: count }, (_, i) => ({
    id: `o${i + 1}`,
    text: `Answer ${i + 1}`,
    votes: i,
  })),
  myOptionId,
})

describe("QuackPoll", () => {
  it("shows every answer with its count, and my vote as text", () => {
    render(
      <QuackPoll
        quackId="q1"
        poll={aPoll(3, "o2")}
      />,
    )

    expect(screen.getByRole("radio", { name: /Answer 1.*0 votes/ })).not.toBeChecked()
    expect(screen.getByRole("radio", { name: /Answer 2.*Your vote.*1 vote$/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Answer 3.*2 votes/ })).toBeInTheDocument()
    expect(screen.getAllByText(/Your vote/)).toHaveLength(1)
    expect(screen.getByText("3 votes in total")).toBeInTheDocument()
  })

  it("votes, moves the vote, and withdraws it by picking my answer again", async () => {
    const { rerender } = render(
      <QuackPoll
        quackId="q1"
        poll={aPoll(3)}
      />,
    )
    await userEvent.click(screen.getByRole("radio", { name: /Answer 1/ }))
    expect(mutate).toHaveBeenLastCalledWith("o1")

    rerender(
      <QuackPoll
        quackId="q1"
        poll={aPoll(3, "o1")}
      />,
    )
    await userEvent.click(screen.getByRole("radio", { name: /Answer 3/ }))
    expect(mutate).toHaveBeenLastCalledWith("o3")

    await userEvent.click(screen.getByRole("radio", { name: /Answer 1/ }))
    expect(mutate).toHaveBeenLastCalledWith(null)
  })

  it("shows the first 4 answers and expands the rest", async () => {
    render(
      <QuackPoll
        quackId="q1"
        poll={aPoll(7)}
      />,
    )

    expect(screen.getAllByRole("radio")).toHaveLength(4)
    await userEvent.click(screen.getByRole("button", { name: "Show 3 more" }))
    expect(screen.getAllByRole("radio")).toHaveLength(7)
    await userEvent.click(screen.getByRole("button", { name: "Show less" }))
    expect(screen.getAllByRole("radio")).toHaveLength(4)
  })

  it("keeps my vote visible when it is past the fold", () => {
    render(
      <QuackPoll
        quackId="q1"
        poll={aPoll(7, "o6")}
      />,
    )

    expect(screen.getAllByRole("radio")).toHaveLength(5)
    expect(screen.getByRole("radio", { name: /Answer 6/ })).toBeChecked()
    expect(screen.getByRole("button", { name: "Show 2 more" })).toBeInTheDocument()
  })

  it("has no expand control for 4 answers or fewer", () => {
    render(
      <QuackPoll
        quackId="q1"
        poll={aPoll(4)}
      />,
    )

    expect(screen.queryByRole("button", { name: /more/ })).not.toBeInTheDocument()
  })
})
