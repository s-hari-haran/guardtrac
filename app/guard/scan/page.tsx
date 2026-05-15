import { QrScanner } from "@/components/qr-scanner"
import { AutoScan } from "@/components/auto-scan"

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ qr?: string }>
}) {
  const { qr } = await searchParams
  const qrValue = typeof qr === "string" ? qr.trim() : ""

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {qrValue ? "Marking attendance" : "Scan QR code"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {qrValue
            ? "Validating the site QR you scanned with your camera."
            : "Point your camera at the QR code installed at your assigned site to mark attendance for today."}
        </p>
      </div>

      {qrValue ? <AutoScan qr={qrValue} /> : <QrScanner />}
    </div>
  )
}
