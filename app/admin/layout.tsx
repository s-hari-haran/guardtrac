import type { ReactNode } from "react"
import { requireRole } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"
import { LayoutDashboard, MapPin, Users, ClipboardList, ShieldCheck } from "lucide-react"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole("admin")

  const nav = [
    { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/admin/sites", label: "Sites", icon: <MapPin className="h-4 w-4" /> },
    { href: "/admin/guards", label: "Guards", icon: <Users className="h-4 w-4" /> },
    { href: "/admin/attendance", label: "Attendance", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/admin/team", label: "Team", icon: <ShieldCheck className="h-4 w-4" /> },
  ]

  return (
    <AppShell user={{ name: profile?.full_name ?? "Admin", role: "Admin" }} nav={nav}>
      {children}
    </AppShell>
  )
}
