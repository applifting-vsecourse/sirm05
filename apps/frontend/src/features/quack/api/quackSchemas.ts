import { z } from "zod"

import { moodSchema } from "@/lib/mood"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

// Mirror the server-side limits (CreateQuackDto) so the form can tell the user first.
export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 10
export const POLL_OPTION_MAX_LENGTH = 50

export const pollSchema = z.object({
  options: z.array(z.object({ id: z.string(), text: z.string(), votes: z.number() })),
  // The signed-in user's answer, null if they haven't voted.
  myOptionId: z.string().nullable(),
})

// What the live stream pushes: counts only, never who voted.
export const pollCountsSchema = z.object({
  quackId: z.string(),
  options: z.array(z.object({ id: z.string(), votes: z.number() })),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: moodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type Poll = z.infer<typeof pollSchema>
export type PollCounts = z.infer<typeof pollCountsSchema>
