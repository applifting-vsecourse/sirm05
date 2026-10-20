import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type QuackFeedTabsProps = {
  isMine: boolean
  onMineChange: (isMine: boolean) => void
  // The feed under the tabs, shown as the active tab's panel.
  children: ReactNode
}

export function QuackFeedTabs({ isMine, onMineChange, children }: QuackFeedTabsProps) {
  const value = isMine ? "mine" : "all"

  return (
    <Tabs
      value={value}
      onValueChange={(next) => onMineChange(next === "mine")}
      className="gap-4"
    >
      <TabsList aria-label="Whose quacks">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="mine">Mine</TabsTrigger>
      </TabsList>
      <TabsContent value={value}>{children}</TabsContent>
    </Tabs>
  )
}
