import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuackSearch } from "@/features/quack/components/QuackSearch"

describe("QuackSearch", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  const type = (text: string) =>
    fireEvent.change(screen.getByLabelText("Search quacks"), { target: { value: text } })

  it("searches the trimmed text once the user pauses", async () => {
    const onChange = vi.fn()
    render(<QuackSearch onChange={onChange} />)

    type("  pond  ")
    await wait(299)
    expect(onChange).not.toHaveBeenCalled()

    await wait(1)
    expect(onChange).toHaveBeenCalledExactlyOnceWith("pond")
  })

  it("clears the search when only spaces are left", async () => {
    const onChange = vi.fn()
    render(
      <QuackSearch
        value="pond"
        onChange={onChange}
      />,
    )

    type("   ")
    await wait(300)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined)
  })

  it("shows the search it was opened with and follows outside changes", async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <QuackSearch
        value="pond"
        onChange={onChange}
      />,
    )
    expect(screen.getByLabelText("Search quacks")).toHaveValue("pond")

    rerender(<QuackSearch onChange={onChange} />)
    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
    await wait(300)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("accepts at most 100 characters", () => {
    render(<QuackSearch onChange={vi.fn()} />)
    expect(screen.getByLabelText("Search quacks")).toHaveAttribute("maxLength", "100")
  })
})
