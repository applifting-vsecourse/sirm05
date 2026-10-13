import type { QueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"

// A poll appears in every cached list it matches (the feed and each search),
// so updates go to all of them.
export function updatePoll(
  queryClient: QueryClient,
  quackId: string,
  update: (poll: Poll) => Poll,
) {
  queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
    quacks?.map((quack) =>
      quack.id === quackId && quack.poll ? { ...quack, poll: update(quack.poll) } : quack,
    ),
  )
}

export function findPoll(queryClient: QueryClient, quackId: string): Poll | undefined {
  for (const [, quacks] of queryClient.getQueriesData<Quack[]>({ queryKey: quackKeys.lists() })) {
    const poll = quacks?.find((quack) => quack.id === quackId)?.poll
    if (poll) return poll
  }
}

// Moves my vote to optionId (null withdraws it), adjusting the counts.
export const applyVote = (poll: Poll, optionId: string | null): Poll => ({
  myOptionId: optionId,
  options: poll.options.map((option) => ({
    ...option,
    votes: option.votes - Number(option.id === poll.myOptionId) + Number(option.id === optionId),
  })),
})
