import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"

import { updatePoll } from "@/features/quack/api/pollCache"
import { quackKeys } from "@/features/quack/api/quackKeys"
import { pollCountsSchema } from "@/features/quack/api/quackSchemas"

// Live vote counts over Server-Sent Events (ADR 0002). EventSource reconnects
// by itself; after a drop the feed is refetched to catch up on missed votes.
export function usePollEvents() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const source = new EventSource(`${env.VITE_API_URL}/quacks/poll-events`, {
      withCredentials: true,
    })
    let hasDropped = false

    source.onerror = () => {
      hasDropped = true
    }
    source.onopen = () => {
      if (hasDropped) void queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
      hasDropped = false
    }
    source.onmessage = (event: MessageEvent<string>) => {
      const counts = pollCountsSchema.safeParse(JSON.parse(event.data))
      if (!counts.success) return
      const { quackId, options } = counts.data
      // My own click in flight is newer than whatever the stream says.
      if (queryClient.isMutating({ mutationKey: quackKeys.vote(quackId) })) return
      const votes = new Map(options.map((option) => [option.id, option.votes]))
      updatePoll(queryClient, quackId, (poll) => ({
        ...poll,
        options: poll.options.map((option) => ({
          ...option,
          votes: votes.get(option.id) ?? option.votes,
        })),
      }))
    }

    return () => source.close()
  }, [queryClient])
}
