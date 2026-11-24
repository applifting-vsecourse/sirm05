import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MessageCircle, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { type Mood } from "@/lib/mood"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { repliesQueryOptions } from "@/features/quack/api/repliesQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackItem } from "@/features/quack/components/QuackItem"

type QuackThreadProps = {
  quack: Quack
  viewerId?: string
  canModerate?: boolean
  defaultMood?: Mood | null
}

// The reply toggle under a quack; expanded, its replies (oldest first) and a reply form.
// A deleted quack's thread can be read but not replied to (ADR 0004).
export function QuackThread({ quack, viewerId, canModerate, defaultMood }: QuackThreadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const threadId = `thread-${quack.id}`

  if (quack.deleted && quack.replyCount === 0) return null

  return (
    // `contents`: the toggle joins the item's action row; the panel takes a full line.
    <div className="contents">
      <Button
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground"
        aria-expanded={isOpen}
        aria-controls={threadId}
        onClick={() => setIsOpen((isPrevOpen) => !isPrevOpen)}
      >
        <MessageCircle className="size-4" />
        {quack.replyCount === 0
          ? "Reply"
          : `${quack.replyCount} ${quack.replyCount === 1 ? "reply" : "replies"}`}
      </Button>
      {isOpen ? (
        <div
          id={threadId}
          className="order-last flex basis-full flex-col gap-3 border-l border-border pl-4"
        >
          <Replies
            quackId={quack.id}
            viewerId={viewerId}
            canModerate={canModerate}
          />
          {quack.deleted ? null : (
            <QuackForm
              parentId={quack.id}
              defaultMood={defaultMood}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

function Replies({
  quackId,
  viewerId,
  canModerate,
}: {
  quackId: string
  viewerId?: string
  canModerate?: boolean
}) {
  const repliesQuery = useQuery(repliesQueryOptions(quackId))

  if (repliesQuery.isLoading) {
    return (
      <div className="flex justify-center py-4 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (repliesQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load replies</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{repliesQuery.error.message}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void repliesQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Reload
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  const replies = repliesQuery.data ?? []
  if (replies.length === 0) {
    return <p className="text-sm text-muted-foreground">No replies yet. Be the first.</p>
  }
  return (
    <div className="flex flex-col">
      {replies.map((reply) => (
        <QuackItem
          key={reply.id}
          quack={reply}
          isMine={reply.userId === viewerId}
          canModerate={canModerate}
          isInThread
        />
      ))}
    </div>
  )
}
