"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2, MapPin, MapPinOff, QrCode, XCircle } from "lucide-react"
import { markAttendanceFromQr, type ScanResult } from "@/app/guard/actions"
import { getCurrentLocation } from "@/lib/geo"

const REGION_ID = "guardtrack-qr-region"

type Status =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "locating" }
  | { kind: "success"; siteName: string; alreadyMarked?: boolean; locationCaptured: boolean }
  | { kind: "error"; message: string }

export function QrScanner() {
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const [isPending, startTransition] = useTransition()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)
  const handlingRef = useRef(false)

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {
      // ignore
    }
  }

  const handleResult = (qrValue: string) => {
    if (handlingRef.current) return
    handlingRef.current = true
    startTransition(async () => {
      setStatus({ kind: "locating" })
      const loc = await getCurrentLocation()
      const result: ScanResult = await markAttendanceFromQr(qrValue, loc)
      await stopScanner()
      if (result.ok) {
        setStatus({
          kind: "success",
          siteName: result.siteName,
          alreadyMarked: result.alreadyMarked,
          locationCaptured: result.locationCaptured,
        })
      } else {
        setStatus({ kind: "error", message: result.error })
      }
      setTimeout(() => {
        handlingRef.current = false
      }, 500)
    })
  }

  const startScanner = async () => {
    setStatus({ kind: "scanning" })
    try {
      const mod = await import("html5-qrcode")
      const { Html5Qrcode } = mod
      const html5 = new Html5Qrcode(REGION_ID, { verbose: false })
      scannerRef.current = html5
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleResult(decoded),
        () => {
          // ignore per-frame decode errors
        },
      )
    } catch (err: unknown) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? `Camera error: ${err.message}. Please allow camera access and try again.`
            : "Camera unavailable. Please allow camera access and try again.",
      })
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner()
    }
  }, [])

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 md:p-6">
        <div
          id={REGION_ID}
          className="aspect-square w-full overflow-hidden rounded-md border border-dashed border-border bg-muted"
        />
        {status.kind === "idle" && (
          <Button size="lg" className="h-12 gap-2" onClick={startScanner}>
            <QrCode className="h-5 w-5" />
            Start camera
          </Button>
        )}
        {status.kind === "scanning" && (
          <Button size="lg" variant="outline" className="h-12 gap-2 bg-transparent" onClick={() => void stopScanner()}>
            Stop scanner
          </Button>
        )}
        {(status.kind === "success" || status.kind === "error") && (
          <Button
            size="lg"
            className="h-12 gap-2"
            onClick={() => {
              setStatus({ kind: "idle" })
              void startScanner()
            }}
          >
            Scan again
          </Button>
        )}

        {(status.kind === "locating" || isPending) && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status.kind === "locating" ? "Capturing location..." : "Verifying QR code..."}
          </p>
        )}

        {status.kind === "success" && (
          <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-accent p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {status.alreadyMarked ? "Already marked today" : "Attendance marked"}
              </p>
              <p className="text-muted-foreground">{status.siteName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {status.locationCaptured ? (
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
          </div>
        )}

        {status.kind === "error" && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <p className="text-foreground">{status.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
