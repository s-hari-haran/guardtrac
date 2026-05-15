import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { MapPin, MapPinOff } from "lucide-react"

type SearchParams = Promise<{ from?: string; to?: string; site?: string }>

export default async function AdminAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("admin")
  const supabase = await createClient()
  const params = await searchParams

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const todayIso = today.toISOString().slice(0, 10)

  const from = params.from || monthStart
  const to = params.to || todayIso
  const siteFilter = params.site || ""

  const { data: sites } = await supabase.from("sites").select("id, site_name").order("site_name")

  let query = supabase
    .from("attendance")
    .select(
      "id, date, marked_at, status, site_id, latitude, longitude, accuracy_m, guards:guard_id ( full_name, email ), sites:site_id ( site_name )",
    )
    .gte("date", from)
    .lte("date", to)
    .order("marked_at", { ascending: false })
    .limit(200)

  if (siteFilter) query = query.eq("site_id", siteFilter)

  const { data: rows } = await query

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance log</h1>
        <p className="text-sm text-muted-foreground">Filter by date range and site. Click a pin to view on Google Maps.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="from">
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={from}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="to">
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={to}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="site">
                Site
              </label>
              <select
                id="site"
                name="site"
                defaultValue={siteFilter}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All sites</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.site_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Records ({rows?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 md:px-6">Date</th>
                    <th className="px-4 py-3">Guard</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => {
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    const lat = (r as any).latitude as number | null
                    const lng = (r as any).longitude as number | null
                    const acc = (r as any).accuracy_m as number | null
                    /* eslint-enable @typescript-eslint/no-explicit-any */
                    const hasLoc = typeof lat === "number" && typeof lng === "number"
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3 md:px-6">
                          {new Date(r.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <div className="font-medium">{(r as any).guards?.full_name ?? "Unknown"}</div>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <div className="text-xs text-muted-foreground">{(r as any).guards?.email ?? ""}</div>
                        </td>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <td className="px-4 py-3">{(r as any).sites?.site_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.marked_at ? new Date(r.marked_at).toLocaleTimeString("en-IN") : ""}
                        </td>
                        <td className="px-4 py-3">
                          {hasLoc ? (
                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary hover:underline"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span>
                                {lat!.toFixed(4)}, {lng!.toFixed(4)}
                              </span>
                              {typeof acc === "number" && (
                                <span className="text-xs text-muted-foreground">±{Math.round(acc)}m</span>
                              )}
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPinOff className="h-3.5 w-3.5" />
                              Not shared
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={
                              r.status === "present"
                                ? "bg-primary/10 text-primary hover:bg-primary/10"
                                : "bg-destructive/10 text-destructive hover:bg-destructive/10"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">No records in this range.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
