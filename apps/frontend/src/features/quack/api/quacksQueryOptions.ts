import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

// isMine narrows the feed on the server, so it stays right once the feed is paginated.
export const quacksQueryOptions = (search?: string, isMine?: boolean) =>
  queryOptions({
    queryKey: quackKeys.list(search, isMine),
    queryFn: async () =>
      quacksSchema.parse(
        await api
          .get("quacks", {
            searchParams: { ...(search && { q: search }), ...(isMine && { mine: "true" }) },
          })
          .json(),
      ),
    // Keep showing the previous results while the next search loads.
    placeholderData: keepPreviousData,
  })
