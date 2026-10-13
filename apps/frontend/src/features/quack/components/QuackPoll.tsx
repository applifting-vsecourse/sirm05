import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { useVote } from "@/features/quack/hooks/useVote"

const COLLAPSED_COUNT = 4

const votesLabel = (votes: number) => `${votes} ${votes === 1 ? "vote" : "votes"}`

type QuackPollProps = { quackId: string; poll: Poll }

export function QuackPoll({ quackId, poll }: QuackPollProps) {
  const vote = useVote(quackId)
  const [isExpanded, setIsExpanded] = useState(false)

  const hiddenCount = isExpanded ? 0 : Math.max(0, poll.options.length - COLLAPSED_COUNT)
  // My vote stays visible even when it is past the fold.
  const visible = poll.options.filter(
    (option, index) =>
      hiddenCount === 0 || index < COLLAPSED_COUNT || option.id === poll.myOptionId,
  )
  const total = poll.options.reduce((sum, option) => sum + option.votes, 0)

  return (
    <div className="mt-2 flex flex-col gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        aria-label="Poll answers"
        className="w-full flex-col items-stretch"
        value={poll.myOptionId ?? ""}
        // Picking my current answer again clears the value: that withdraws the vote.
        onValueChange={(optionId) => vote.mutate(optionId || null)}
      >
        {visible.map((option) => (
          <ToggleGroupItem
            key={option.id}
            value={option.id}
            className="justify-between gap-3"
          >
            <span className="truncate">{option.text}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {option.id === poll.myOptionId ? "Your vote · " : null}
              {votesLabel(option.votes)}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{votesLabel(total)} in total</span>
        {poll.options.length > COLLAPSED_COUNT ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show less" : `Show ${poll.options.length - visible.length} more`}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
