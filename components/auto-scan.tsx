"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2, MapPin, MapPinOff, XCircle } from "lucide-react"
import { markAttendanceFromQr, type ScanResult } from "@/app/guard/actions"
import { getCurrentLocation } from "@/lib/geo"

type State =
  | { kind: "loading"; phase: "locating" | "submitting" }
  | { kind: "success"; siteName: string; alreadyMarked?: boolean; locationCaptured: boolean }
  | { kind: "error"; message: string }

export function AutoScan({ qr }: { qr: string }) {
  const [state, setState] = useState<State>({ kind: "loading", phase: "locating" })
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    ;(async () => {
      const loc = await getCurrentLocation()
      setState({ kind: "loading", phase: "submitting" })
      const result: ScanResult = await markAttendanceFromQr(qr, loc)
      if (result.ok) {
        setState({
          kind: "success",
          siteName: result.siteName,
          alreadyMarked: result.alreadyMarked,
          locationCaptured: result.locationCaptured,
        })
      } else {
        setState({ kind: "error", message: result.error })
      }
    })()
  }, [qr])

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4 md:p-6">
        {state.kind === "loading" && (
          <>
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {state.phase === "locating"
                ? "Capturing your location..."
                : "Verifying QR code and marking attendance..."}
            </p>
          </>
        )}
        {state.kind === "success" && (
          <>
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {state.alreadyMarked ? "Attendance already marked today" : "Attendance marked successfully"}
              </p>
              <p className="text-muted-foreground">{state.siteName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {state.locationCaptured ? (
                  <>
                    <MapPin className="h-3.5 w-3.5" />
                    Location shared with admin
                  </>
                ) : (
                  <>
                    <MapPinOff className="h-3.5 w-3.5" />
                    Location not shared
                  </>
                )}
              </p>
            </div>
          </>
        )}
        {state.kind === "error" && (
          <>
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-foreground">{state.message}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
