import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

// optionId null withdraws the vote.
export async function vote(input: { quackId: string; optionId: string | null }): Promise<Poll> {
  const path = `quacks/${input.quackId}/vote`
  const json = await (
    input.optionId ? api.put(path, { json: { optionId: input.optionId } }) : api.delete(path)
  ).json()
  return pollSchema.parse(json)
}
