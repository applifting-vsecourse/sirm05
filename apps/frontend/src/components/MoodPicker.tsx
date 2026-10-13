import type { ComponentProps } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { moods, type Mood } from "@/lib/mood"

type MoodPickerProps = {
  value: Mood | null
  onChange: (mood: Mood | null) => void
  isDisabled?: boolean
} & Pick<ComponentProps<"div">, "id" | "aria-describedby" | "aria-invalid">

export function MoodPicker({ value, onChange, isDisabled, ...props }: MoodPickerProps) {
  return (
    <ToggleGroup
      {...props}
      type="single"
      variant="outline"
      size="sm"
      aria-label="Mood"
      disabled={isDisabled}
      value={value ?? "none"}
      // Clicking the selected item would clear it; "none" is the explicit empty choice.
      onValueChange={(next) => next && onChange(next === "none" ? null : (next as Mood))}
    >
      {["none", ...moods].map((mood) => (
        <ToggleGroupItem
          key={mood}
          value={mood}
          className="capitalize"
        >
          {mood}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
