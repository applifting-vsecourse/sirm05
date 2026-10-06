import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Mirrors the server-side DTO (MaxLength(100)).
const MAX_LENGTH = 100
const DEBOUNCE_MS = 300

type QuackSearchProps = {
  value?: string
  onChange: (search: string | undefined) => void
  className?: string
}

export function QuackSearch({ value = "", onChange, className }: QuackSearchProps) {
  const [text, setText] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)

  // Follow outside changes (clear action, back button) without undoing the user's own typing.
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (text.trim() !== value) setText(value)
  }

  useEffect(() => {
    const search = text.trim()
    if (search === value) return
    const timeout = setTimeout(() => onChange(search || undefined), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [text, value, onChange])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor="quack-search">Search quacks</Label>
      <Input
        id="quack-search"
        type="search"
        placeholder="e.g. pond or @marek"
        maxLength={MAX_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </div>
  )
}
