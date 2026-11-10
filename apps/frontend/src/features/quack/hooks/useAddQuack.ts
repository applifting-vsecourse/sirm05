import { useMutation, useQueryClient } from "@tanstack/react-query"

import { addQuack } from "@/features/quack/api/addQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"

// The hook owns the mutation only — form state belongs to react-hook-form
// in the component, the same way the auth forms do it.
export function useAddQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addQuack,
    onSuccess: async () => {
      // Refresh lists and threads so the new quack or reply (and its count) shows up.
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
