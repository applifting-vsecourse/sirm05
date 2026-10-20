import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { QuackFeedTabs } from "@/features/quack/components/QuackFeedTabs"

describe("QuackFeedTabs", () => {
  it("shows the selected tab and reports a switch", async () => {
    const onMineChange = vi.fn()
    render(
      <QuackFeedTabs
        isMine={false}
        onMineChange={onMineChange}
      >
        feed
      </QuackFeedTabs>,
    )

    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("feed")

    await userEvent.click(screen.getByRole("tab", { name: "Mine" }))
    expect(onMineChange).toHaveBeenCalledWith(true)
  })
})
