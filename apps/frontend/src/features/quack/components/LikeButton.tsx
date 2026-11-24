import { Heart } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"

import type { Likes } from "@/features/quack/api/quackSchemas"
import { useLike } from "@/features/quack/hooks/useLike"

// The count is the button's text; pressed means I liked it.
export function LikeButton({ quackId, likes }: { quackId: string; likes: Likes }) {
  const like = useLike(quackId)

  return (
    <Toggle
      size="sm"
      aria-label="Like"
      pressed={likes.likedByMe}
      onPressedChange={(isLiked) => like.mutate(isLiked)}
      className="self-start text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-primary [&[data-state=on]_svg]:fill-current"
    >
      <Heart />
      {likes.likeCount}
    </Toggle>
  )
}
