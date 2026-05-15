import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { GuardsList, type GuardsListItem } from "@/components/guards-list"
import { DEFAULT_PAYROLL } from "@/lib/salary"

const PAYROLL_COLUMNS =
  "basic_percent, da_percent, da_enabled, hra_percent, hra_enabled, lta_percent, lta_enabled, " +
  "special_allowance_percent, special_allowance_enabled, bonus_percent, bonus_enabled, " +
  "pt_amount, pt_enabled, other_deduction, other_deduction_enabled, " +
  "employer_epf_percent, employer_epf_enabled, " +
  "employer_eps_percent, employer_eps_enabled, " +
  "employer_esi_percent, employer_esi_enabled"

export default async function GuardsPage() {
  await requireRole("admin")
  const supabase = await createClient()

  const [{ data: guards }, { data: sites }] = await Promise.all([
    supabase
      .from("guards")
      .select(
        "id, full_name, phone, email, site_id, base_salary, epf_percent, esi_percent, epf_enabled, esi_enabled, shift_start, shift_end, " +
          PAYROLL_COLUMNS +
          ", sites:site_id ( site_name, address )",
      )
      .order("full_name", { ascending: true }),
    supabase.from("sites").select("id, site_name, address").order("site_name"),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: GuardsListItem[] = ((guards ?? []) as any[]).map((g) => ({
    id: g.id,
    full_name: g.full_name,
    phone: g.phone,
    email: g.email,
    site_id: g.site_id,
    base_salary: Number(g.base_salary ?? 0),
    shift_start: normalizeTime(g.shift_start),
    shift_end: normalizeTime(g.shift_end),
    site_name: g.sites?.site_name ?? null,
    site_address: g.sites?.address ?? null,

    basic_percent: numOr(g.basic_percent, DEFAULT_PAYROLL.basicPercent),
    da_percent: numOr(g.da_percent, DEFAULT_PAYROLL.daPercent),
    da_enabled: boolOr(g.da_enabled, DEFAULT_PAYROLL.daEnabled),
    hra_percent: numOr(g.hra_percent, DEFAULT_PAYROLL.hraPercent),
    hra_enabled: boolOr(g.hra_enabled, DEFAULT_PAYROLL.hraEnabled),
    lta_percent: numOr(g.lta_percent, DEFAULT_PAYROLL.ltaPercent),
    lta_enabled: boolOr(g.lta_enabled, DEFAULT_PAYROLL.ltaEnabled),
    special_allowance_percent: numOr(g.special_allowance_percent, DEFAULT_PAYROLL.specialAllowancePercent),
    special_allowance_enabled: boolOr(g.special_allowance_enabled, DEFAULT_PAYROLL.specialAllowanceEnabled),
    bonus_percent: numOr(g.bonus_percent, DEFAULT_PAYROLL.bonusPercent),
    bonus_enabled: boolOr(g.bonus_enabled, DEFAULT_PAYROLL.bonusEnabled),

    epf_percent: numOr(g.epf_percent, DEFAULT_PAYROLL.epfPercent),
    epf_enabled: boolOr(g.epf_enabled, DEFAULT_PAYROLL.epfEnabled),
    esi_percent: numOr(g.esi_percent, DEFAULT_PAYROLL.esiPercent),
    esi_enabled: boolOr(g.esi_enabled, DEFAULT_PAYROLL.esiEnabled),
    pt_amount: numOr(g.pt_amount, DEFAULT_PAYROLL.ptAmount),
    pt_enabled: boolOr(g.pt_enabled, DEFAULT_PAYROLL.ptEnabled),
    other_deduction: numOr(g.other_deduction, DEFAULT_PAYROLL.otherDeduction),
    other_deduction_enabled: boolOr(g.other_deduction_enabled, DEFAULT_PAYROLL.otherDeductionEnabled),

    employer_epf_percent: numOr(g.employer_epf_percent, DEFAULT_PAYROLL.employerEpfPercent),
    employer_epf_enabled: boolOr(g.employer_epf_enabled, DEFAULT_PAYROLL.employerEpfEnabled),
    employer_eps_percent: numOr(g.employer_eps_percent, DEFAULT_PAYROLL.employerEpsPercent),
    employer_eps_enabled: boolOr(g.employer_eps_enabled, DEFAULT_PAYROLL.employerEpsEnabled),
    employer_esi_percent: numOr(g.employer_esi_percent, DEFAULT_PAYROLL.employerEsiPercent),
    employer_esi_enabled: boolOr(g.employer_esi_enabled, DEFAULT_PAYROLL.employerEsiEnabled),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Guards</h1>
        <p className="text-sm text-muted-foreground">
          Assign guards to sites, configure their full payslip structure (Basic, DA, HRA, LTA, Special Allowance,
          Bonus, statutory deductions), and set shift hours. Search by name, email, phone, or site.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All guards</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <GuardsList guards={items} sites={sites ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}

function normalizeTime(value: string | null): string | null {
  if (!value) return null
  return value.length >= 5 ? value.slice(0, 5) : value
}

function numOr(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function boolOr(v: unknown, fallback: boolean): boolean {
  if (v === null || v === undefined) return fallback
  return !!v
}
