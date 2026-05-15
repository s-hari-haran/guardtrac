"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { QrCode, Copy, Check, Printer } from "lucide-react"

export function SiteQrDialog({
  siteId,
  siteName,
  qrValue,
}: {
  siteId: string
  siteName: string
  qrValue: string
}) {
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  // The QR encodes a URL so phone cameras open the app directly.
  const scanUrl = origin ? `${origin}/guard/scan?qr=${encodeURIComponent(qrValue)}` : ""

  const onCopy = async () => {
    if (!scanUrl) return
    try {
      await navigator.clipboard.writeText(scanUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <QrCode className="h-4 w-4" />
          QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{siteName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-md border border-border bg-card p-4">
            {scanUrl ? (
              <QRCodeSVG value={scanUrl} size={220} level="M" includeMargin />
            ) : (
              <div className="h-[220px] w-[220px]" />
            )}
          </div>

          <div className="w-full">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">QR token</p>
            <code className="block truncate rounded-md border border-border bg-muted p-2 font-mono text-xs">
              {qrValue}
            </code>
            <p className="mt-2 text-xs text-muted-foreground">
              Scanning opens the Chowkidar Security app and marks attendance for the assigned guard.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
              <a href={`/admin/sites/${siteId}/print`} target="_blank" rel="noreferrer">
                <Printer className="h-4 w-4" />
                Print poster
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent" onClick={onCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
