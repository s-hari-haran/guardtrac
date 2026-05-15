import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { calculateSalary, DEFAULT_PAYROLL, formatINR, WORKING_DAYS } from "@/lib/salary"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SalaryPage() {
  const { user } = await requireRole("guard")
  const supabase = await createClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1).toISOString().slice(0, 10)
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10)

  const [{ data: guard }, { count }] = await Promise.all([
    supabase
      .from("guards")
      .select(
        "base_salary, full_name, " +
          "basic_percent, da_percent, da_enabled, hra_percent, hra_enabled, lta_percent, lta_enabled, " +
          "special_allowance_percent, special_allowance_enabled, bonus_percent, bonus_enabled, " +
          "epf_percent, epf_enabled, esi_percent, esi_enabled, pt_amount, pt_enabled, " +
          "other_deduction, other_deduction_enabled, " +
          "employer_epf_percent, employer_epf_enabled, " +
          "employer_eps_percent, employer_eps_enabled, " +
          "employer_esi_percent, employer_esi_enabled",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("guard_id", user.id)
      .eq("status", "present")
      .gte("date", start)
      .lte("date", end),
  ])

  const baseSalary = Number(guard?.base_salary ?? 0)
  const presentDays = count ?? 0
  const s = calculateSalary(baseSalary, presentDays, {
    basicPercent: numOr(guard?.basic_percent, DEFAULT_PAYROLL.basicPercent),
    daPercent: numOr(guard?.da_percent, DEFAULT_PAYROLL.daPercent),
    daEnabled: boolOr(guard?.da_enabled, DEFAULT_PAYROLL.daEnabled),
    hraPercent: numOr(guard?.hra_percent, DEFAULT_PAYROLL.hraPercent),
    hraEnabled: boolOr(guard?.hra_enabled, DEFAULT_PAYROLL.hraEnabled),
    ltaPercent: numOr(guard?.lta_percent, DEFAULT_PAYROLL.ltaPercent),
    ltaEnabled: boolOr(guard?.lta_enabled, DEFAULT_PAYROLL.ltaEnabled),
    specialAllowancePercent: numOr(guard?.special_allowance_percent, DEFAULT_PAYROLL.specialAllowancePercent),
    specialAllowanceEnabled: boolOr(guard?.special_allowance_enabled, DEFAULT_PAYROLL.specialAllowanceEnabled),
    bonusPercent: numOr(guard?.bonus_percent, DEFAULT_PAYROLL.bonusPercent),
    bonusEnabled: boolOr(guard?.bonus_enabled, DEFAULT_PAYROLL.bonusEnabled),
    epfPercent: numOr(guard?.epf_percent, DEFAULT_PAYROLL.epfPercent),
    epfEnabled: boolOr(guard?.epf_enabled, DEFAULT_PAYROLL.epfEnabled),
    esiPercent: numOr(guard?.esi_percent, DEFAULT_PAYROLL.esiPercent),
    esiEnabled: boolOr(guard?.esi_enabled, DEFAULT_PAYROLL.esiEnabled),
    ptAmount: numOr(guard?.pt_amount, DEFAULT_PAYROLL.ptAmount),
    ptEnabled: boolOr(guard?.pt_enabled, DEFAULT_PAYROLL.ptEnabled),
    otherDeduction: numOr(guard?.other_deduction, DEFAULT_PAYROLL.otherDeduction),
    otherDeductionEnabled: boolOr(guard?.other_deduction_enabled, DEFAULT_PAYROLL.otherDeductionEnabled),
    employerEpfPercent: numOr(guard?.employer_epf_percent, DEFAULT_PAYROLL.employerEpfPercent),
    employerEpfEnabled: boolOr(guard?.employer_epf_enabled, DEFAULT_PAYROLL.employerEpfEnabled),
    employerEpsPercent: numOr(guard?.employer_eps_percent, DEFAULT_PAYROLL.employerEpsPercent),
    employerEpsEnabled: boolOr(guard?.employer_eps_enabled, DEFAULT_PAYROLL.employerEpsEnabled),
    employerEsiPercent: numOr(guard?.employer_esi_percent, DEFAULT_PAYROLL.employerEsiPercent),
    employerEsiEnabled: boolOr(guard?.employer_esi_enabled, DEFAULT_PAYROLL.employerEsiEnabled),
  })

  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salary breakdown</h1>
        <p className="text-sm text-muted-foreground">{monthLabel}</p>
      </div>

      {baseSalary === 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm">
            Your base salary has not been set yet. Please contact your admin.
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-primary to-primary/85 text-primary-foreground">
        <CardContent className="flex flex-col gap-2 p-6">
          <p className="text-xs uppercase tracking-wider opacity-80">Take-home this month</p>
          <p className="text-4xl font-semibold tracking-tight">{formatINR(s.finalSalary)}</p>
          <p className="text-sm opacity-90">
            Based on {s.presentDays} present / {WORKING_DAYS} working days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earnings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Row label="Base salary" value={formatINR(s.baseSalary)} />
          <Row label="Per day" value={formatINR(s.perDaySalary)} hint={`Base ÷ ${WORKING_DAYS}`} />
          <Row label="Present days" value={String(s.presentDays)} />
          <Row label="Absent days" value={String(s.absentDays)} />
          <Row
            label="Absent deduction"
            value={`- ${formatINR(s.absentDeduction)}`}
            negative
            hint={`${s.absentDays} × per-day`}
          />
          <Divider />
          <Row label="Basic" value={formatINR(s.basic)} hint={`${s.basicPercent}% of gross`} />
          {s.daEnabled && <Row label="DA" value={formatINR(s.da)} hint={`${s.daPercent}% of Basic`} />}
          {s.hraEnabled && <Row label="HRA" value={formatINR(s.hra)} hint={`${s.hraPercent}% of Basic`} />}
          {s.ltaEnabled && <Row label="LTA" value={formatINR(s.lta)} hint={`${s.ltaPercent}% of Basic`} />}
          {s.specialAllowanceEnabled && (
            <Row
              label="Special Allowance"
              value={formatINR(s.specialAllowance)}
              hint={`${s.specialAllowancePercent}% of Basic`}
            />
          )}
          {s.bonusEnabled && <Row label="Bonus" value={formatINR(s.bonus)} hint={`${s.bonusPercent}% of Basic`} />}
          {s.otherAllowance > 0 && (
            <Row label="Other Allowance" value={formatINR(s.otherAllowance)} hint="auto-balanced" />
          )}
          <Divider />
          <Row label="Total earnings" value={formatINR(s.totalEarnings)} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deductions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {s.epfEnabled && (
            <Row label={`EPF (${s.epfPercent}%)`} value={`- ${formatINR(s.epf)}`} hint="of Basic + DA" negative />
          )}
          {s.esiEnabled && (
            <Row label={`ESI (${s.esiPercent}%)`} value={`- ${formatINR(s.esi)}`} hint="of Gross" negative />
          )}
          {s.ptEnabled && <Row label="Professional Tax" value={`- ${formatINR(s.pt)}`} hint="flat" negative />}
          {s.otherDeductionEnabled && s.otherDeduction > 0 && (
            <Row label="Other deduction" value={`- ${formatINR(s.otherDeduction)}`} hint="flat" negative />
          )}
          <Divider />
          <Row label="Total deductions" value={`- ${formatINR(s.totalDeductions)}`} negative bold />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">Net payable</span>
            <span className="text-xl font-semibold text-primary">{formatINR(s.finalSalary)}</span>
          </div>
        </CardContent>
      </Card>

      {(s.employerEpfEnabled || s.employerEpsEnabled || s.employerEsiEnabled) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employer contribution</CardTitle>
            <p className="text-xs text-muted-foreground">
              For your reference. These are paid by your employer on top of your salary.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {s.employerEpfEnabled && (
              <Row label={`EPF @ ${s.employerEpfPercent}%`} value={formatINR(s.employerEpf)} hint="of Basic + DA" />
            )}
            {s.employerEpsEnabled && (
              <Row label={`EPS @ ${s.employerEpsPercent}%`} value={formatINR(s.employerEps)} hint="of Basic + DA" />
            )}
            {s.employerEsiEnabled && (
              <Row label={`ESI @ ${s.employerEsiPercent}%`} value={formatINR(s.employerEsi)} hint="of Gross" />
            )}
            <Divider />
            <Row label="Total employer contribution" value={formatINR(s.totalEmployerContribution)} bold />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  hint,
  negative,
  bold,
}: {
  label: string
  value: string
  hint?: string
  negative?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
      <div className="flex flex-col">
        <span className={`text-sm ${bold ? "font-semibold" : ""}`}>{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <span className={`text-sm ${bold ? "font-semibold" : "font-medium"} ${negative ? "text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border" />
}

function numOr(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function boolOr(v: unknown, fallback: boolean): boolean {
  if (v === null || v === undefined) return fallback
  return !!v
}
