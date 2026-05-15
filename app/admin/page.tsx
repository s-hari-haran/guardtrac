import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { Users, MapPin, CheckCircle2 } from "lucide-react"
import { GuardCard, type GuardCardData } from "@/components/guard-card"

type GuardRow = {
  id: string
  full_name: string
  site_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sites: any
}

type AttendanceRow = {
  guard_id: string
  marked_at: string | null
  status: string
}

export default async function AdminOverview() {
  await requireRole("admin")
  const supabase = await createClient()

  const today = new Date().toISOString().slice(0, 10)

  const [
    { count: guardsCount },
    { count: sitesCount },
    { count: presentToday },
    { data: guards },
    { data: todays },
  ] = await Promise.all([
    supabase.from("guards").select("id", { count: "exact", head: true }),
    supabase.from("sites").select("id", { count: "exact", head: true }),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", today)
      .eq("status", "present"),
    supabase
      .from("guards")
      .select("id, full_name, site_id, sites:site_id ( site_name )")
      .order("full_name", { ascending: true }),
    supabase.from("attendance").select("guard_id, marked_at, status").eq("date", today),
  ])

  const todayMap = new Map<string, AttendanceRow>()
  for (const r of (todays ?? []) as AttendanceRow[]) todayMap.set(r.guard_id, r)

  // Group by site_name (alphabetical), with "Unassigned" at the end.
  const groups = new Map<string, GuardCardData[]>()
  for (const g of (guards ?? []) as GuardRow[]) {
    const siteName: string = g.sites?.site_name ?? "Unassigned"
    const today = todayMap.get(g.id)
    const card: GuardCardData = {
      id: g.id,
      full_name: g.full_name,
      site_name: g.sites?.site_name ?? null,
      marked_at: today?.marked_at ?? null,
      status: today?.status === "present" ? "present" : "absent",
    }
    if (!groups.has(siteName)) groups.set(siteName, [])
    groups.get(siteName)!.push(card)
  }

  const orderedGroups = Array.from(groups.entries())
    .map(([site, list]) => ({
      site,
      list: list.sort((a, b) => a.full_name.localeCompare(b.full_name)),
    }))
    .sort((a, b) => {
      if (a.site === "Unassigned") return 1
      if (b.site === "Unassigned") return -1
      return a.site.localeCompare(b.site)
    })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Real-time snapshot of your agency.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Guards"
          value={guardsCount ?? 0}
          icon={<Users className="h-4 w-4" />}
          href="/admin/guards"
        />
        <Stat label="Sites" value={sitesCount ?? 0} icon={<MapPin className="h-4 w-4" />} href="/admin/sites" />
        <Stat
          label="Present today"
          value={presentToday ?? 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          href="/admin/attendance"
          tone="primary"
        />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Guards by site</h2>
          <p className="text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 align-middle" /> Present
            <span className="ml-3 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" /> Absent
          </p>
        </div>
        {orderedGroups.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
              No guards yet. They&apos;ll appear here as soon as they sign up.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {orderedGroups.map((group) => (
              <div key={group.site} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.site}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.list.map((guard) => (
                    <GuardCard key={guard.id} guard={guard} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
  href,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  href: string
  tone?: "primary"
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-colors group-hover:border-primary/50">
        <CardContent className="flex items-center justify-between p-4 md:p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`mt-1 text-3xl font-semibold ${tone === "primary" ? "text-primary" : ""}`}>{value}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
