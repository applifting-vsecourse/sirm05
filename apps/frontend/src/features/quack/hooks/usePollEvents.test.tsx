import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { usePollEvents } from "@/features/quack/hooks/usePollEvents"

class FakeEventSource {
  static last: FakeEventSource
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  close = vi.fn()
  constructor(
    public url: string,
    public init?: EventSourceInit,
  ) {
    FakeEventSource.last = this
  }
  emit(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }))
  }
}

const quack: Quack = {
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: {
    options: [
      { id: "o1", text: "Pizza", votes: 1 },
      { id: "o2", text: "Sushi", votes: 0 },
    ],
    myOptionId: "o1",
  },
}

let queryClient: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)
const cachedPoll = () => queryClient.getQueryData<Quack[]>(quackKeys.list())?.[0]?.poll

beforeEach(() => {
  vi.stubGlobal("EventSource", FakeEventSource)
  queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  queryClient.setQueryData(quackKeys.list(), [quack])
})
afterEach(() => vi.unstubAllGlobals())

describe("usePollEvents", () => {
  it("subscribes with the session cookie and closes on unmount", () => {
    const { unmount } = renderHook(() => usePollEvents(), { wrapper })

    expect(FakeEventSource.last.url).toMatch(/\/quacks\/poll-events$/)
    expect(FakeEventSource.last.init).toEqual({ withCredentials: true })
    unmount()
    expect(FakeEventSource.last.close).toHaveBeenCalled()
  })

  it("updates the counts but keeps my vote", () => {
    renderHook(() => usePollEvents(), { wrapper })

    act(() =>
      FakeEventSource.last.emit({
        quackId: "q1",
        options: [
          { id: "o1", votes: 1 },
          { id: "o2", votes: 4 },
        ],
      }),
    )

    expect(cachedPoll()).toEqual({
      options: [
        { id: "o1", text: "Pizza", votes: 1 },
        { id: "o2", text: "Sushi", votes: 4 },
      ],
      myOptionId: "o1",
    })
  })

  it("ignores malformed events", () => {
    renderHook(() => usePollEvents(), { wrapper })

    act(() => FakeEventSource.last.emit({ nope: true }))

    expect(cachedPoll()).toEqual(quack.poll)
  })

  it("refetches after the connection comes back, not on the first connect", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    renderHook(() => usePollEvents(), { wrapper })

    act(() => FakeEventSource.last.onopen?.())
    expect(invalidate).not.toHaveBeenCalled()

    act(() => {
      FakeEventSource.last.onerror?.()
      FakeEventSource.last.onopen?.()
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.lists() })
  })
})
