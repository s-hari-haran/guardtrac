"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Mail,
  Phone,
  MapPin,
  Wallet,
  Clock,
  CheckCircle2,
  ExternalLink,
  CalendarDays,
  Download,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
} from "lucide-react"
import { getGuardDetail, type GuardDetail } from "@/app/admin/guard-detail-actions"
import { upsertAttendance, deleteAttendance } from "@/app/admin/attendance-actions"
import { formatINR } from "@/lib/salary"
import { generatePayslipPdf } from "@/lib/payslip-pdf"
import { Input } from "@/components/ui/input"

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function GuardDetailDialog({
  open,
  onOpenChange,
  guardId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  guardId: string
}) {
  const [data, setData] = useState<GuardDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState<string>(currentMonth())
  const [downloading, setDownloading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [addDate, setAddDate] = useState<string>("")
  const [addStatus, setAddStatus] = useState<"present" | "absent">("present")
  const [adding, setAdding] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function refresh() {
    try {
      const res = await getGuardDetail(guardId, month)
      if (res) setData(res)
    } catch {
      // ignore — toast on next user action
    }
  }

  async function handleStatusChange(rowId: string, date: string, status: "present" | "absent") {
    setEditError(null)
    setPendingId(rowId)
    try {
      const fd = new FormData()
      fd.set("guard_id", guardId)
      fd.set("date", date)
      fd.set("status", status)
      const res = await upsertAttendance(fd)
      if (!res.ok) setEditError(res.error)
      else await refresh()
    } finally {
      setPendingId(null)
    }
  }

  async function handleDelete(rowId: string) {
    setEditError(null)
    setPendingId(rowId)
    try {
      const res = await deleteAttendance(rowId)
      if (!res.ok) setEditError(res.error)
      else await refresh()
    } finally {
      setPendingId(null)
    }
  }

  async function handleAdd() {
    if (!addDate) {
      setEditError("Pick a date first.")
      return
    }
    setEditError(null)
    setAdding(true)
    try {
      const fd = new FormData()
      fd.set("guard_id", guardId)
      fd.set("date", addDate)
      fd.set("status", addStatus)
      const res = await upsertAttendance(fd)
      if (!res.ok) setEditError(res.error)
      else {
        setAddDate("")
        await refresh()
      }
    } finally {
      setAdding(false)
    }
  }

  // Reset month + edit UI when dialog opens
  useEffect(() => {
    if (open) {
      setMonth(currentMonth())
      setEditMode(false)
      setEditError(null)
      setAddDate("")
      setAddStatus("present")
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getGuardDetail(guardId, month)
      .then((res) => {
        if (cancelled) return
        if (!res) setError("Could not load guard details.")
        else setData(res)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load guard details.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, guardId, month])

  async function handleDownload() {
    if (!data) return
    setDownloading(true)
    try {
      await generatePayslipPdf(data)
    } catch (err) {
      console.error("[v0] PDF download failed:", err)
      setError("Could not generate PDF.")
    } finally {
      setDownloading(false)
    }
  }

  const isCurrentMonth = month === currentMonth()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {loading && !data && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !data && (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        )}
        {data && (
          <>
            <DialogHeader>
              <DialogTitle className="text-balance">{data.full_name}</DialogTitle>
              <DialogDescription>Profile, attendance, and payslip.</DialogDescription>
            </DialogHeader>

            {/* Month picker + download */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMonth(shiftMonth(month, -1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-2 text-sm font-medium">{data.monthLabel}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  disabled={isCurrentMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm" onClick={handleDownload} disabled={downloading} className="gap-2">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download payslip
              </Button>
            </div>

            {/* Net payable hero */}
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Net payable</p>
                <p className="text-3xl font-bold text-primary tabular-nums">
                  {formatINR(data.salary.finalSalary)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.presentDaysThisMonth} present / 26 days · earned {formatINR(data.salary.earned)}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Base salary</p>
                <p className="text-base font-semibold text-foreground">{formatINR(data.base_salary)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <section className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={data.email ?? "—"} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={data.phone ?? "—"} />
                <DetailRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Assigned site"
                  value={
                    data.site_name
                      ? data.site_address
                        ? `${data.site_name} — ${data.site_address}`
                        : data.site_name
                      : "Not assigned"
                  }
                />
                <DetailRow
                  icon={<Clock className="h-4 w-4" />}
                  label="Shift"
                  value={
                    data.shift_start && data.shift_end
                      ? `${formatHM(data.shift_start)} – ${formatHM(data.shift_end)}`
                      : "Not set"
                  }
                />
              </section>

              <section className="rounded-lg border border-border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{data.monthLabel} attendance</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {data.presentDaysThisMonth} present
                    </Badge>
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => {
                        setEditMode((v) => !v)
                        setEditError(null)
                      }}
                    >
                      {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      {editMode ? "Done" : "Manage"}
                    </Button>
                  </div>
                </div>

                {editError && (
                  <p className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                    {editError}
                  </p>
                )}

                {data.monthAttendance.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No scans recorded this month.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.monthAttendance.map((row) => {
                      const date = new Date(row.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                      const time = row.marked_at
                        ? new Date(row.marked_at).toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : null
                      const mapsHref =
                        row.latitude != null && row.longitude != null
                          ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}`
                          : null
                      const isPending = pendingId === row.id
                      const isPresent = row.status === "present"
                      return (
                        <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{date}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.site_name ?? "—"}
                              {!editMode && (
                                <span
                                  className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                                    isPresent
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {row.status}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {editMode ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={row.status}
                                  disabled={isPending}
                                  onChange={(e) =>
                                    handleStatusChange(row.id, row.date, e.target.value as "present" | "absent")
                                  }
                                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                >
                                  <option value="present">Present</option>
                                  <option value="absent">Absent</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={isPending}
                                  onClick={() => handleDelete(row.id)}
                                  aria-label={`Delete attendance for ${date}`}
                                >
                                  {isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <>
                                {time && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {time}
                                  </span>
                                )}
                                {mapsHref ? (
                                  <a
                                    href={mapsHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    View location
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No location</span>
                                )}
                              </>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {editMode && (
                  <div className="mt-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Add or override an entry
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[140px] flex-1">
                        <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                        <Input
                          type="date"
                          value={addDate}
                          min={`${data.month}-01`}
                          max={`${data.month}-${String(new Date(Number(data.month.split("-")[0]), Number(data.month.split("-")[1]), 0).getDate()).padStart(2, "0")}`}
                          onChange={(e) => setAddDate(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="min-w-[110px]">
                        <label className="mb-1 block text-xs text-muted-foreground">Status</label>
                        <select
                          value={addStatus}
                          onChange={(e) => setAddStatus(e.target.value as "present" | "absent")}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </div>
                      <Button size="sm" onClick={handleAdd} disabled={adding} className="h-9 gap-1.5">
                        {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                      {addDate && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          onClick={() => setAddDate("")}
                          aria-label="Clear date"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      If the date already has an entry, it will be updated.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Salary breakdown</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SalaryGroup title="Earnings">
                    <SalaryLine label="Basic" value={formatINR(data.salary.basic)} hint={`${data.salary.basicPercent}% of gross`} />
                    {data.salary.daEnabled && (
                      <SalaryLine label="DA" value={formatINR(data.salary.da)} hint={`${data.salary.daPercent}% of Basic`} />
                    )}
                    {data.salary.hraEnabled && (
                      <SalaryLine label="HRA" value={formatINR(data.salary.hra)} hint={`${data.salary.hraPercent}% of Basic`} />
                    )}
                    {data.salary.ltaEnabled && (
                      <SalaryLine label="LTA" value={formatINR(data.salary.lta)} hint={`${data.salary.ltaPercent}% of Basic`} />
                    )}
                    {data.salary.specialAllowanceEnabled && (
                      <SalaryLine
                        label="Special Allowance"
                        value={formatINR(data.salary.specialAllowance)}
                        hint={`${data.salary.specialAllowancePercent}% of Basic`}
                      />
                    )}
                    {data.salary.bonusEnabled && (
                      <SalaryLine label="Bonus" value={formatINR(data.salary.bonus)} hint={`${data.salary.bonusPercent}% of Basic`} />
                    )}
                    {data.salary.otherAllowance > 0 && (
                      <SalaryLine label="Other Allowance" value={formatINR(data.salary.otherAllowance)} hint="balancer" />
                    )}
                    <SalaryLine label="Earned" value={formatINR(data.salary.earned)} emphasize />
                  </SalaryGroup>

                  <SalaryGroup title="Deductions">
                    {data.salary.epfEnabled && (
                      <SalaryLine label={`EPF (${data.salary.epfPercent}%)`} value={`- ${formatINR(data.salary.epf)}`} hint="of Basic + DA" />
                    )}
                    {data.salary.esiEnabled && (
                      <SalaryLine label={`ESI (${data.salary.esiPercent}%)`} value={`- ${formatINR(data.salary.esi)}`} hint="of Gross" />
                    )}
                    {data.salary.ptEnabled && (
                      <SalaryLine label="Professional Tax" value={`- ${formatINR(data.salary.pt)}`} hint="flat" />
                    )}
                    {data.salary.otherDeductionEnabled && data.salary.otherDeduction > 0 && (
                      <SalaryLine label="Other" value={`- ${formatINR(data.salary.otherDeduction)}`} hint="flat" />
                    )}
                    <SalaryLine label="Total deductions" value={`- ${formatINR(data.salary.totalDeductions)}`} />
                    <SalaryLine label="Net payable" value={formatINR(data.salary.finalSalary)} emphasize />
                  </SalaryGroup>
                </div>

                {(data.salary.employerEpfEnabled ||
                  data.salary.employerEpsEnabled ||
                  data.salary.employerEsiEnabled) && (
                  <div className="mt-4 rounded-md border border-dashed border-border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Employer contribution
                    </p>
                    <dl className="grid gap-1.5 text-sm sm:grid-cols-3">
                      {data.salary.employerEpfEnabled && (
                        <SalaryLine
                          label={`EPF @ ${data.salary.employerEpfPercent}%`}
                          value={formatINR(data.salary.employerEpf)}
                        />
                      )}
                      {data.salary.employerEpsEnabled && (
                        <SalaryLine
                          label={`EPS @ ${data.salary.employerEpsPercent}%`}
                          value={formatINR(data.salary.employerEps)}
                        />
                      )}
                      {data.salary.employerEsiEnabled && (
                        <SalaryLine
                          label={`ESI @ ${data.salary.employerEsiPercent}%`}
                          value={formatINR(data.salary.employerEsi)}
                        />
                      )}
                    </dl>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
                      <span>Total employer cost</span>
                      <span>{formatINR(data.salary.totalEmployerContribution)}</span>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

function formatHM(t: string) {
  const [hh, mm] = t.split(":")
  const d = new Date()
  d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0)
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
}

function SalaryGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <dl className="grid gap-1 text-sm">{children}</dl>
    </div>
  )
}

function SalaryLine({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string
  value: string
  hint?: string
  emphasize?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 py-1.5 last:border-b-0 ${
        emphasize ? "border-t-2 border-t-border/80 border-b-0 pt-2 mt-1" : ""
      }`}
    >
      <div className="min-w-0">
        <dt className={emphasize ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</dt>
        {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
      </div>
      <dd className={`font-medium ${emphasize ? "text-base text-primary" : "text-foreground"}`}>{value}</dd>
    </div>
  )
}
