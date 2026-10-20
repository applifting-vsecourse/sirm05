import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteQuack,
    // Stay pending until the refetch lands, so the quack is gone when the dialog closes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quackKeys.lists() }),
    onError: () => {
      toast.error("Your quack wasn't deleted. Please try again.")
    },
  })
}
