import { useMutation, useQueryClient } from "@tanstack/react-query"

import { updateProfile } from "@/features/profile/api/updateProfile"

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    // Name and @username show up in the header, the feed and here: refresh everything.
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
