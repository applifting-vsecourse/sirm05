import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { like } from "@/features/quack/api/like"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Likes, Quack } from "@/features/quack/api/quackSchemas"

// A quack sits in the feed, searches and threads; update it everywhere.
const setLikes = (queryClient: QueryClient, quackId: string, update: (likes: Likes) => Likes) =>
  queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.all() }, (quacks) =>
    quacks?.map((quack) => (quack.id === quackId ? { ...quack, ...update(quack) } : quack)),
  )

// Optimistic, like useVote: the button flips on click; on failure the truth is re-read.
export function useLike(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: quackKeys.like(quackId),
    // Clicks on one quack reach the server in order, so the last click wins.
    scope: { id: `like-${quackId}` },
    mutationFn: (isLiked: boolean) => like({ quackId, isLiked }),
    onMutate: async (isLiked) => {
      await queryClient.cancelQueries({ queryKey: quackKeys.all() })
      setLikes(queryClient, quackId, (likes) => ({
        likeCount: likes.likeCount - Number(likes.likedByMe) + Number(isLiked),
        likedByMe: isLiked,
      }))
    },
    onError: async () => {
      toast.error("Your like wasn't saved. Please try again.")
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
    onSuccess: (likes) => setLikes(queryClient, quackId, () => likes),
  })
}
