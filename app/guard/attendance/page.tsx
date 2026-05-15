import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { AttendanceCalendar } from "@/components/attendance-calendar"

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1).toISOString().slice(0, 10)
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export default async function AttendanceHistoryPage() {
  const { user } = await requireRole("guard")
  const supabase = await createClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const { start, end } = getMonthRange(year, month)

  const { data: rows } = await supabase
    .from("attendance")
    .select("id, date, marked_at, status, sites:site_id ( site_name )")
    .eq("guard_id", user.id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })

  const presentDates = new Set((rows ?? []).filter((r) => r.status === "present").map((r) => r.date))
  const presentCount = presentDates.size
  const today = new Date()
  const daysSoFar = today.getMonth() === month && today.getFullYear() === year ? today.getDate() : new Date(year, month + 1, 0).getDate()
  const absentCount = Math.max(0, daysSoFar - presentCount)

  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance history</h1>
        <p className="text-sm text-muted-foreground">{monthLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Present days" value={presentCount} tone="primary" />
        <StatCard label="Absent days" value={absentCount} />
        <StatCard label="Days so far" value={daysSoFar} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendar view</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceCalendar year={year} month={month} presentDates={presentDates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent scans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows && rows.length > 0 ? (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(r.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(r as any).sites?.site_name ?? "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize">{r.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.marked_at ? new Date(r.marked_at).toLocaleTimeString("en-IN") : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No attendance recorded this month yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "primary" }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-semibold ${tone === "primary" ? "text-primary" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
