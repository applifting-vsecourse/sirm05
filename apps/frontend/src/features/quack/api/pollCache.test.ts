import { describe, expect, it } from "vitest"

import { applyVote } from "@/features/quack/api/pollCache"
import type { Poll } from "@/features/quack/api/quackSchemas"

const poll = (votes: [number, number], myOptionId: string | null): Poll => ({
  options: [
    { id: "o1", text: "Pizza", votes: votes[0] },
    { id: "o2", text: "Sushi", votes: votes[1] },
  ],
  myOptionId,
})

describe("applyVote", () => {
  it.each([
    ["a first vote", poll([1, 0], null), "o2", poll([1, 1], "o2")],
    ["a moved vote", poll([1, 0], "o1"), "o2", poll([0, 1], "o2")],
    ["a withdrawn vote", poll([1, 3], "o2"), null, poll([1, 2], null)],
    ["the same answer again", poll([1, 0], "o1"), "o1", poll([1, 0], "o1")],
  ])("counts %s", (_, before, optionId, after) => {
    expect(applyVote(before, optionId)).toEqual(after)
  })
})
