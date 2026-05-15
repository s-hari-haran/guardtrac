"use client"

import { Button } from "@/components/ui/button"
import { useTransition } from "react"
import { removeAdmin } from "@/app/admin/team/actions"

export function RemoveAdminButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${name} as an admin? Their account will be deleted.`)) return
        start(async () => {
          await removeAdmin(id)
        })
      }}
    >
      {pending ? "Removing..." : "Remove"}
    </Button>
  )
}
