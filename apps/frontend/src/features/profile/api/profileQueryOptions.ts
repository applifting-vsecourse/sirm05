import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { profileSchema } from "@/features/profile/api/profileSchemas"

export const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => profileSchema.parse(await api.get("profile").json()),
  })
