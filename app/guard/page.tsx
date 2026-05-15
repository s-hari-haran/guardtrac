import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { CalendarDays, MapPin, QrCode, CheckCircle2, AlertTriangle } from "lucide-react"

export default async function GuardDashboard() {
  const { user, profile } = await requireRole("guard")
  const supabase = await createClient()

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const todayLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const [{ data: guard }, { data: todayAttendance }] = await Promise.all([
    supabase
      .from("guards")
      .select("id, full_name, base_salary, site_id, sites:site_id (id, site_name, address)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("attendance")
      .select("id, marked_at, status")
      .eq("guard_id", user.id)
      .eq("date", todayIso)
      .maybeSingle(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const site = (guard as any)?.sites as { id: string; site_name: string; address: string | null } | null
  const isMarked = !!todayAttendance

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Hello, {profile?.full_name?.split(" ")[0] ?? "Guard"}
        </h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      <Card
        className={
          isMarked
            ? "border-2 border-green-500 bg-gradient-to-br from-green-600 to-green-500 text-white"
            : "border-2 border-red-500 bg-gradient-to-br from-red-600 to-red-500 text-white"
        }
      >
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Today's status</p>
              <p className="mt-1 text-2xl font-semibold">{isMarked ? "Present" : "Not marked"}</p>
            </div>
            <Badge
              variant="secondary"
              className="gap-1.5 bg-white/20 text-white hover:bg-white/20"
            >
              {isMarked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {isMarked ? "Done" : "Pending"}
            </Badge>
          </div>
          {isMarked && todayAttendance?.marked_at && (
            <p className="text-sm opacity-90">
              Marked at {new Date(todayAttendance.marked_at).toLocaleTimeString("en-IN")}
            </p>
          )}
          <Button
            asChild
            size="lg"
            variant="secondary"
            className={
              isMarked
                ? "h-12 w-full bg-white text-green-700 hover:bg-white/90"
                : "h-12 w-full bg-white text-red-700 hover:bg-white/90"
            }
          >
            <Link href="/guard/scan" className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5" />
              {isMarked ? "Scan again" : "Scan QR to mark attendance"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Assigned site
            </CardTitle>
          </CardHeader>
          <CardContent>
            {site ? (
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold">{site.site_name}</p>
                {site.address && <p className="text-sm text-muted-foreground">{site.address}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You haven't been assigned a site yet. Please contact your admin.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Quick links
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start bg-transparent">
              <Link href="/guard/attendance">View attendance history</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start bg-transparent">
              <Link href="/guard/salary">View salary breakdown</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
