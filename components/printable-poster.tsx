"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

export function PrintablePoster({
  siteName,
  address,
  qrValue,
}: {
  siteName: string
  address: string | null
  qrValue: string
}) {
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const scanUrl = origin ? `${origin}/guard/scan?qr=${encodeURIComponent(qrValue)}` : ""

  return (
    <div className="min-h-svh bg-background p-6 print:p-0">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-lg font-semibold">Print poster</h1>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        <div
          id="poster"
          className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 rounded-2xl border-2 border-foreground bg-card p-10 text-center print:max-w-none print:rounded-none print:border-0 print:p-12"
        >
          <div className="flex flex-col items-center gap-2 text-foreground">
            <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-foreground/10">
              <Image src="/logo.jpg" alt="Chowkidar Security Services" fill sizes="80px" className="object-cover" />
            </div>
            <span className="text-base font-semibold tracking-tight">Chowkidar Security Services</span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Attendance point</p>
            <h2 className="text-balance text-3xl font-bold leading-tight text-foreground">{siteName}</h2>
            {address && <p className="text-sm text-muted-foreground">{address}</p>}
          </div>

          <div className="rounded-xl border border-foreground/10 bg-card p-6">
            {scanUrl ? (
              <QRCodeSVG value={scanUrl} size={320} level="M" includeMargin />
            ) : (
              <div className="h-[320px] w-[320px]" />
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-base font-semibold text-foreground">Scan to mark attendance</p>
            <ol className="text-pretty text-sm leading-relaxed text-muted-foreground">
              <li>1. Open your phone camera.</li>
              <li>2. Point it at this QR code.</li>
              <li>3. Tap the link, sign in, and you&apos;re marked present.</li>
            </ol>
          </div>

          <div className="w-full border-t border-foreground/10 pt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Site code</p>
            <p className="font-mono text-sm text-foreground">{qrValue}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #poster, #poster * { visibility: visible !important; }
          #poster { position: absolute; inset: 0; margin: auto; }
        }
      `}</style>
    </div>
  )
}
