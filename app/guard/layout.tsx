import type { ReactNode } from "react"
import { requireRole } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"
import { Home, QrCode, CalendarDays, Wallet } from "lucide-react"

export default async function GuardLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole("guard")

  const nav = [
    { href: "/guard", label: "Home", icon: <Home className="h-4 w-4" /> },
    { href: "/guard/scan", label: "Scan", icon: <QrCode className="h-4 w-4" /> },
    { href: "/guard/attendance", label: "Attendance", icon: <CalendarDays className="h-4 w-4" /> },
    { href: "/guard/salary", label: "Salary", icon: <Wallet className="h-4 w-4" /> },
  ]

  return (
    <AppShell user={{ name: profile?.full_name ?? "Guard", role: "Guard" }} nav={nav}>
      {children}
    </AppShell>
  )
}
