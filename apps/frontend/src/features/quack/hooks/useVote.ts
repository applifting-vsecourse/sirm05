import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { applyVote, findPoll, updatePoll } from "@/features/quack/api/pollCache"
import { quackKeys } from "@/features/quack/api/quackKeys"
import { vote } from "@/features/quack/api/vote"

// Optimistic: the poll changes on click; on failure it goes back and says so.
export function useVote(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: quackKeys.vote(quackId),
    // Clicks on one poll reach the server in order, so the last click wins.
    scope: { id: `vote-${quackId}` },
    mutationFn: (optionId: string | null) => vote({ quackId, optionId }),
    onMutate: async (optionId) => {
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      const previous = findPoll(queryClient, quackId)
      updatePoll(queryClient, quackId, (poll) => applyVote(poll, optionId))
      return { previous }
    },
    onError: async (_error, _optionId, context) => {
      if (context?.previous) updatePoll(queryClient, quackId, () => context.previous!)
      toast.error("Your vote wasn't saved. Please try again.")
      // Another click may have queued on top of the failed one; re-read the truth.
      await queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
    },
    onSuccess: (poll) => updatePoll(queryClient, quackId, () => poll),
  })
}
