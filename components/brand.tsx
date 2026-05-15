import Image from "next/image"
import { cn } from "@/lib/utils"

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-card ring-1 ring-border">
        <Image
          src="/logo.jpg"
          alt="Chowkidar Security Services"
          fill
          sizes="40px"
          className="object-cover"
          priority
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight">Chowkidar Security Services</span>
        <span className="text-xs text-muted-foreground">Your safety, our duty</span>
      </div>
    </div>
  )
}
