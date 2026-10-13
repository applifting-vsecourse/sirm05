import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { MoodPicker } from "@/components/MoodPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HTTPError } from "@/lib/api-client"
import { moodSchema } from "@/lib/mood"
import { cn } from "@/lib/utils"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile"

// Mirrors the server-side DTO; the server still validates independently.
const BIO_MAX_LENGTH = 160

const schema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._]{3,30}$/, "Use 3–30 letters, digits, dots or underscores"),
  name: z.string().trim().min(1, "Display name is required"),
  bio: z.string().max(BIO_MAX_LENGTH, `Keep it under ${BIO_MAX_LENGTH} characters`),
  defaultMood: moodSchema.nullable(),
})

type FormValues = z.infer<typeof schema>

const toFormValues = (profile: Profile): FormValues => ({ ...profile, bio: profile.bio ?? "" })

const isUsernameTaken = (error: unknown) =>
  error instanceof HTTPError && error.response.status === 409

type ProfileFormProps = { profile: Profile }

export function ProfileForm({ profile }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(profile),
  })

  const bioLength = useWatch({ control: form.control, name: "bio" }).length

  const handleSubmit = (values: FormValues) => {
    updateProfile.mutate(values, {
      onSuccess: (saved) => {
        form.reset(toFormValues(saved))
        toast.success("Settings saved")
      },
      // Shown at the field; the typed value stays so the user can adjust it.
      onError: (error) => {
        if (isUsernameTaken(error)) form.setError("username", { message: error.message })
      },
    })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {updateProfile.error && !isUsernameTaken(updateProfile.error) ? (
          <Alert variant="destructive">
            <AlertDescription>{updateProfile.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  {...field}
                />
              </FormControl>
              <FormDescription>3–30 letters, digits, dots or underscores.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Professional bread critic. Pond-based."
                  {...field}
                />
              </FormControl>
              <FormDescription className={cn(bioLength > BIO_MAX_LENGTH && "text-destructive")}>
                Optional. {bioLength}/{BIO_MAX_LENGTH}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default mood for new quacks</FormLabel>
              <FormControl>
                <MoodPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!form.formState.isDirty || updateProfile.isPending}
            onClick={() => form.reset()}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
