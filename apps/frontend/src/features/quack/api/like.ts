import { api } from "@/lib/api-client"

import { likesSchema, type Likes } from "@/features/quack/api/quackSchemas"

// isLiked false takes the like back.
export async function like(input: { quackId: string; isLiked: boolean }): Promise<Likes> {
  const path = `quacks/${input.quackId}/like`
  return likesSchema.parse(await (input.isLiked ? api.put(path) : api.delete(path)).json())
}
