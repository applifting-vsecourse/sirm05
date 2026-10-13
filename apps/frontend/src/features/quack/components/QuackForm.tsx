import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, X } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { MoodPicker } from "@/components/MoodPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { moodSchema, type Mood } from "@/lib/mood"
import { cn } from "@/lib/utils"

import {
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
} from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

const schema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
  mood: moodSchema.nullable(),
  // Empty means no poll. The rows can't drop below the minimum, see the remove buttons.
  pollOptions: z
    .array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, "Write an answer")
          .max(POLL_OPTION_MAX_LENGTH, `Keep it under ${POLL_OPTION_MAX_LENGTH} characters`),
      }),
    )
    .superRefine((options, ctx) => {
      const seen = new Set<string>()
      options.forEach(({ text }, index) => {
        const key = text.trim().toLowerCase()
        if (key && seen.has(key)) {
          ctx.addIssue({ code: "custom", message: "Already an answer", path: [index, "text"] })
        }
        seen.add(key)
      })
    }),
})

type FormValues = z.infer<typeof schema>

// The picker starts on, and returns to, the user's default mood from Settings.
type QuackFormProps = { defaultMood?: Mood | null; className?: string }

export function QuackForm({ defaultMood = null, className }: QuackFormProps) {
  const addQuack = useAddQuack()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: defaultMood, pollOptions: [] },
  })
  const pollOptions = useFieldArray({ control: form.control, name: "pollOptions" })
  const hasPoll = pollOptions.fields.length > 0

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood ?? undefined,
        pollOptions: hasPoll ? values.pollOptions.map((option) => option.text) : undefined,
      },
      { onSuccess: () => form.reset() },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New quack</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Quack something..."
                  disabled={addQuack.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasPoll ? (
          <fieldset className="space-y-3">
            <legend className="sr-only">Poll answers</legend>
            {pollOptions.fields.map((option, index) => (
              <FormField
                key={option.id}
                control={form.control}
                name={`pollOptions.${index}.text`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer {index + 1}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder={index === 0 ? "Pizza" : undefined}
                          disabled={addQuack.isPending}
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove answer ${index + 1}`}
                        disabled={
                          addQuack.isPending || pollOptions.fields.length <= POLL_MIN_OPTIONS
                        }
                        onClick={() => pollOptions.remove(index)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </fieldset>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormLabel>Mood</FormLabel>
                <FormControl>
                  <MoodPicker
                    isDisabled={addQuack.isPending}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {hasPoll ? (
            <>
              {pollOptions.fields.length < POLL_MAX_OPTIONS ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={addQuack.isPending}
                  onClick={() => pollOptions.append({ text: "" })}
                >
                  <Plus className="size-4" />
                  Add answer
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={addQuack.isPending}
                onClick={() => pollOptions.replace([])}
              >
                Remove poll
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={addQuack.isPending}
              onClick={() => pollOptions.replace([{ text: "" }, { text: "" }])}
            >
              Add poll
            </Button>
          )}
          <span className="flex-1" />
          <span
            className={cn(
              "text-sm",
              length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={addQuack.isPending}
          >
            {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quack
          </Button>
        </div>
      </form>
    </Form>
  )
}
