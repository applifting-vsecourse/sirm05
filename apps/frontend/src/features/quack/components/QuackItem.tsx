import type { ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { LikeButton } from "@/features/quack/components/LikeButton"
import { QuackActions } from "@/features/quack/components/QuackActions"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

// isMine: the viewer wrote it; canModerate: the viewer is an admin. Either gets its
// actions (the API checks again). isInThread: shown under its quack, so "Reply to" is
// implied. children: the thread, composed by the list.
type QuackItemProps = {
  quack: Quack
  isMine?: boolean
  canModerate?: boolean
  isInThread?: boolean
  children?: ReactNode
}

export function QuackItem({
  quack,
  isMine = false,
  canModerate = false,
  isInThread = false,
  children,
}: QuackItemProps) {
  // A deleted quack keeps only its place for the replies under it (ADR 0004).
  if (quack.deleted) {
    return (
      <article className="flex w-full flex-col gap-1 border-b border-border pt-2 pb-4 last:border-b-0">
        <p className="text-sm text-muted-foreground italic">This quack was deleted.</p>
        {children}
      </article>
    )
  }

  const { name, username } = quack.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className={isInThread ? "size-8" : "size-12"}>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-wrap items-baseline gap-2">
            <span>
              <UsersName name={name} /> <UsersUserName username={username} />
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
            {quack.mood ? (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">feeling {quack.mood}</span>
              </>
            ) : null}
          </div>
          {isMine || canModerate ? (
            <QuackActions
              quack={quack}
              isMine={isMine}
            />
          ) : null}
        </div>
        {quack.replyTo && !isInThread ? (
          <p className="text-xs text-muted-foreground">
            {quack.replyTo.username === null
              ? "Reply to a deleted quack"
              : `Reply to @${quack.replyTo.username}`}
          </p>
        ) : null}
        <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
        {quack.poll ? (
          <QuackPoll
            quackId={quack.id}
            poll={quack.poll}
          />
        ) : null}
        {/* One row of actions; the thread's own panel wraps below it. */}
        <div className="flex flex-wrap items-center gap-2">
          <LikeButton
            quackId={quack.id}
            likes={quack}
          />
          {children}
        </div>
      </div>
    </article>
  )
}
