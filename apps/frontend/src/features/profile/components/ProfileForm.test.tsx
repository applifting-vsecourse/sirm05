import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { ProfileForm } from "@/features/profile/components/ProfileForm"

type MutateOptions = { onSuccess: (saved: Profile) => void; onError: (error: Error) => void }

const mutate = vi.fn<(values: Profile, options: MutateOptions) => void>()
vi.mock("@/features/profile/hooks/useUpdateProfile", () => ({
  useUpdateProfile: () => ({ mutate, isPending: false, error: null }),
}))

const profile: Profile = { username: "marek", name: "Marek", bio: null, defaultMood: null }

const username = () => screen.getByLabelText("Username")
const save = () => userEvent.click(screen.getByRole("button", { name: "Save" }))

describe("ProfileForm", () => {
  // Braces matter: a function returned from beforeEach is run as a cleanup hook.
  beforeEach(() => {
    mutate.mockReset()
  })

  it("starts with the saved profile and saves the changes", async () => {
    mutate.mockImplementation((values, options) => options.onSuccess(values))
    render(<ProfileForm profile={profile} />)

    expect(username()).toHaveValue("marek")
    await userEvent.clear(username())
    await userEvent.type(username(), "marek.s")
    await userEvent.type(screen.getByLabelText("Bio"), "Pond-based")
    await userEvent.click(screen.getByRole("radio", { name: "silly" }))
    await save()

    expect(mutate).toHaveBeenCalledWith(
      { username: "marek.s", name: "Marek", bio: "Pond-based", defaultMood: "silly" },
      expect.anything(),
    )
  })

  it("rejects an invalid username before sending it", async () => {
    render(<ProfileForm profile={profile} />)

    await userEvent.clear(username())
    await userEvent.type(username(), "ma rek")
    await save()

    expect(screen.getByText(/use 3–30 letters/i)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("says a taken username at the field and keeps what was typed", async () => {
    const response = new Response(null, { status: 409 })
    const error = new HTTPError(response, new Request("http://api/profile"), {} as never)
    error.message = "That username is already taken"
    mutate.mockImplementation((_values, options) => options.onError(error))
    render(<ProfileForm profile={profile} />)

    await userEvent.clear(username())
    await userEvent.type(username(), "breadcritic")
    await save()

    expect(screen.getByText("That username is already taken")).toBeInTheDocument()
    expect(username()).toHaveValue("breadcritic")
  })

  it("discards changes back to what is saved", async () => {
    render(<ProfileForm profile={profile} />)

    await userEvent.type(username(), "_new")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(username()).toHaveValue("marek")
  })
})
