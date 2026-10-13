import { api } from "@/lib/api-client"

import { profileSchema, type Profile } from "@/features/profile/api/profileSchemas"

export async function updateProfile(input: Profile): Promise<Profile> {
  return profileSchema.parse(await api.put("profile", { json: input }).json())
}
