import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { vote } from "@/features/quack/api/vote"
import { useVote } from "@/features/quack/hooks/useVote"

vi.mock("@/features/quack/api/vote", () => ({ vote: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const poll = (votes: [number, number], myOptionId: string | null): Poll => ({
  options: [
    { id: "o1", text: "Pizza", votes: votes[0] },
    { id: "o2", text: "Sushi", votes: votes[1] },
  ],
  myOptionId,
})

const quack = (p: Poll): Quack => ({
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: p,
})

let queryClient: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)
const cachedPoll = (search?: string) =>
  queryClient.getQueryData<Quack[]>(quackKeys.list(search))?.[0]?.poll

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  // The same poll is in the feed and in a search result.
  queryClient.setQueryData(quackKeys.list(), [quack(poll([1, 0], "o1"))])
  queryClient.setQueryData(quackKeys.list("lunch"), [quack(poll([1, 0], "o1"))])
})

describe("useVote", () => {
  it("moves my vote instantly everywhere the poll is shown, then takes the server's counts", async () => {
    let respond!: (p: Poll) => void
    vi.mocked(vote).mockReturnValue(new Promise((r) => (respond = r)))
    const { result } = renderHook(() => useVote("q1"), { wrapper })

    act(() => result.current.mutate("o2"))

    await waitFor(() => expect(cachedPoll()).toEqual(poll([0, 1], "o2")))
    expect(cachedPoll("lunch")).toEqual(poll([0, 1], "o2"))
    expect(vote).toHaveBeenCalledWith({ quackId: "q1", optionId: "o2" })

    // someone else voted meanwhile; the server's answer is the truth
    act(() => respond(poll([0, 2], "o2")))
    await waitFor(() => expect(cachedPoll()).toEqual(poll([0, 2], "o2")))
  })

  it("withdraws my vote instantly", async () => {
    // never answers, so only the optimistic update is visible
    vi.mocked(vote).mockReturnValue(new Promise(vi.fn()))
    const { result } = renderHook(() => useVote("q1"), { wrapper })

    act(() => result.current.mutate(null))

    await waitFor(() => expect(cachedPoll()).toEqual(poll([0, 0], null)))
  })

  it("puts the poll back and tells me when the vote fails", async () => {
    vi.mocked(vote).mockRejectedValue(new Error("offline"))
    const { result } = renderHook(() => useVote("q1"), { wrapper })

    act(() => result.current.mutate("o2"))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedPoll()).toEqual(poll([1, 0], "o1"))
    expect(cachedPoll("lunch")).toEqual(poll([1, 0], "o1"))
    expect(toast.error).toHaveBeenCalledWith("Your vote wasn't saved. Please try again.")
  })
})
