"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, MinusCircle } from "lucide-react"
import { useState } from "react"
import { GuardDetailDialog } from "@/components/guard-detail-dialog"

export type GuardCardData = {
  id: string
  full_name: string
  site_name: string | null
  marked_at: string | null
  status: "present" | "absent"
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
}

export function GuardCard({ guard }: { guard: GuardCardData }) {
  const [open, setOpen] = useState(false)
  const isPresent = guard.status === "present"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        aria-label={`View details for ${guard.full_name}`}
      >
        <Card
          className={`h-full border-2 transition-colors hover:bg-muted/30 ${
            isPresent
              ? "border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-500/10"
              : "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-500/10"
          }`}
        >
          <CardContent className="flex items-start gap-3 p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                isPresent ? "bg-green-600" : "bg-red-600"
              }`}
              aria-hidden="true"
            >
              {initials(guard.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{guard.full_name}</p>
                <Badge
                  variant="outline"
                  className={`shrink-0 gap-1 px-1.5 py-0 text-[10px] ${
                    isPresent
                      ? "border-green-500 bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200"
                      : "border-red-500 bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200"
                  }`}
                >
                  {isPresent ? <CheckCircle2 className="h-3 w-3" /> : <MinusCircle className="h-3 w-3" />}
                  {isPresent ? "Present" : "Absent"}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {guard.site_name ?? "No site assigned"}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {guard.marked_at
                  ? new Date(guard.marked_at).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Not scanned today"}
              </p>
            </div>
          </CardContent>
        </Card>
      </button>
      <GuardDetailDialog open={open} onOpenChange={setOpen} guardId={guard.id} />
    </>
  )
}
