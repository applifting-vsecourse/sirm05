import { api } from "@/lib/api-client"
import { type Mood } from "@/lib/mood"

import { quackSchema, type Quack } from "@/features/quack/api/quackSchemas"

// With parentId it's a reply to that quack (no poll).
export async function addQuack({
  parentId,
  ...input
}: {
  text: string
  mood?: Mood
  pollOptions?: string[]
  parentId?: string
}): Promise<Quack> {
  const json = await api
    .post(parentId ? `quacks/${parentId}/replies` : "quacks", { json: input })
    .json()
  return quackSchema.parse(json)
}
