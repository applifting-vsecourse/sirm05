import { useState } from "react"
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

const PREVIEW_LENGTH = 80

// The author's own actions on a quack: a menu with Delete, confirmed in a dialog.
export function QuackActions({ quack }: { quack: Quack }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const deleteQuack = useDeleteQuack()

  const preview =
    quack.text.length > PREVIEW_LENGTH ? `${quack.text.slice(0, PREVIEW_LENGTH)}…` : quack.text

  return (
    <>
      {/* Non-modal, so closing the menu doesn't fight the dialog over focus and pointer events. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="More actions"
            className="size-8"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setIsConfirming(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isConfirming}
        onOpenChange={(isOpen) => !deleteQuack.isPending && setIsConfirming(isOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quack?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{preview}&rdquo; will be gone for good, with its poll and votes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteQuack.isPending}>Cancel</AlertDialogCancel>
            {/* A plain button, not AlertDialogAction, so the dialog stays open while deleting. */}
            <Button
              variant="destructive"
              disabled={deleteQuack.isPending}
              onClick={() =>
                deleteQuack.mutate(quack.id, { onSuccess: () => setIsConfirming(false) })
              }
            >
              {deleteQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
