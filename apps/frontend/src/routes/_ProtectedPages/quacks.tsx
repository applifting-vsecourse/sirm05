import { useCallback, useRef } from "react"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"

import { useSession } from "@/features/auth/hooks/useSession"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackFeedTabs } from "@/features/quack/components/QuackFeedTabs"
import { QuackForm, type QuackFormHandle } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { usePollEvents } from "@/features/quack/hooks/usePollEvents"

const quacksSearchParamsSchema = z.object({
  q: z.string().optional(),
  mine: z.boolean().optional(),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  // The new-quack form starts on the default mood, so it must be known before render.
  validateSearch: quacksSearchParamsSchema,
  component: QuacksPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions()),
})

function QuacksPage() {
  const { q, mine: isMine = false } = Route.useSearch()
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions(q, isMine))
  const { data: profile } = useSuspenseQuery(profileQueryOptions())
  const { user } = useSession()
  const formRef = useRef<QuackFormHandle>(null)
  usePollEvents()

  // Replace instead of push so typing doesn't add a history entry per pause.
  const setSearch = useCallback(
    (search: string | undefined) =>
      void navigate({ search: (prev) => ({ ...prev, q: search }), replace: true }),
    [navigate],
  )

  // A tab switch is a step the back button should undo, so it pushes.
  const setMine = (isNextMine: boolean) =>
    void navigate({ search: (prev) => ({ ...prev, mine: isNextMine || undefined }) })

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          ref={formRef}
          defaultMood={profile.defaultMood}
          className="mb-6"
        />

        <QuackFeedTabs
          isMine={isMine}
          onMineChange={setMine}
        >
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
            viewerId={user?.id}
            canModerate={user?.role === "admin"}
            isMine={isMine}
            onWriteFirst={() => formRef.current?.focus()}
          />
        </QuackFeedTabs>
      </section>
    </>
  )
}
