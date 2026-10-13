import { useCallback } from "react"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"

import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"

const quacksSearchParamsSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  // The new-quack form starts on the default mood, so it must be known before render.
  validateSearch: quacksSearchParamsSchema,
  component: QuacksPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions()),
})

function QuacksPage() {
  const { q } = Route.useSearch()
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions(q))
  const { data: profile } = useSuspenseQuery(profileQueryOptions())

  // Replace instead of push so typing doesn't add a history entry per pause.
  const setSearch = useCallback(
    (search: string | undefined) => void navigate({ search: { q: search }, replace: true }),
    [navigate],
  )

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          defaultMood={profile.defaultMood}
          className="mb-6"
        />

        <QuackSearch
          className="mb-4"
          value={q}
          onChange={setSearch}
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
          search={q}
          onClearSearch={() => setSearch(undefined)}
        />
      </section>
    </>
  )
}
