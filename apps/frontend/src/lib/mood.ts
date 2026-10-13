import { z } from "zod"

// Shared by quacks (a quack's mood) and profile (the default mood for new quacks).
export const moods = ["happy", "sad", "angry", "silly"] as const
export const moodSchema = z.enum(moods)
export type Mood = z.infer<typeof moodSchema>
