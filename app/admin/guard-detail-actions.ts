"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { calculateSalary, DEFAULT_PAYROLL, type SalaryBreakdown } from "@/lib/salary"

export type AttendanceRow = {
  id: string
  date: string
  marked_at: string | null
  status: string
  latitude: number | null
  longitude: number | null
  accuracy_m: number | null
  site_name: string | null
}

export type GuardDetail = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  base_salary: number
  site_name: string | null
  site_address: string | null
  shift_start: string | null
  shift_end: string | null
  /** Month being viewed in YYYY-MM format. */
  month: string
  /** Human label like "April 2026". */
  monthLabel: string
  monthAttendance: AttendanceRow[]
  presentDaysThisMonth: number
  salary: SalaryBreakdown
}

const PAYROLL_COLUMNS =
  "basic_percent, da_percent, da_enabled, hra_percent, hra_enabled, lta_percent, lta_enabled, " +
  "special_allowance_percent, special_allowance_enabled, bonus_percent, bonus_enabled, " +
  "epf_percent, epf_enabled, esi_percent, esi_enabled, pt_amount, pt_enabled, " +
  "other_deduction, other_deduction_enabled, " +
  "employer_epf_percent, employer_epf_enabled, " +
  "employer_eps_percent, employer_eps_enabled, " +
  "employer_esi_percent, employer_esi_enabled"

/** Resolve a YYYY-MM string into [startISODate, endISODate, label]. */
function resolveMonth(monthArg?: string): { month: string; label: string; start: string; end: string } {
  const now = new Date()
  let year = now.getFullYear()
  let monthIdx = now.getMonth() // 0-based
  if (monthArg && /^\d{4}-\d{2}$/.test(monthArg)) {
    const [y, m] = monthArg.split("-").map(Number)
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      year = y
      monthIdx = m - 1
    }
  }
  const start = new Date(year, monthIdx, 1)
  const end = new Date(year, monthIdx + 1, 0)
  const month = `${year}-${String(monthIdx + 1).padStart(2, "0")}`
  const label = start.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  return {
    month,
    label,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export async function getGuardDetail(guardId: string, monthArg?: string): Promise<GuardDetail | null> {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: guard } = await supabase
    .from("guards")
    .select(
      "id, full_name, email, phone, base_salary, shift_start, shift_end, " +
        PAYROLL_COLUMNS +
        ", sites:site_id ( site_name, address )",
    )
    .eq("id", guardId)
    .single()

  if (!guard) return null

  const { month, label, start, end } = resolveMonth(monthArg)

  const { data: rows } = await supabase
    .from("attendance")
    .select("id, date, marked_at, status, latitude, longitude, accuracy_m, sites:site_id ( site_name )")
    .eq("guard_id", guardId)
    .gte("date", start)
    .lte("date", end)
    .order("marked_at", { ascending: false })

  const monthAttendance: AttendanceRow[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    date: r.date as string,
    marked_at: (r.marked_at as string | null) ?? null,
    status: r.status as string,
    latitude: (r.latitude as number | null) ?? null,
    longitude: (r.longitude as number | null) ?? null,
    accuracy_m: (r.accuracy_m as number | null) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    site_name: ((r as any).sites?.site_name as string | undefined) ?? null,
  }))

  const presentDaysThisMonth = monthAttendance.filter((r) => r.status === "present").length
  const baseSalary = Number(guard.base_salary) || 0

  const salary = calculateSalary(baseSalary, presentDaysThisMonth, {
    basicPercent: numOr(guard.basic_percent, DEFAULT_PAYROLL.basicPercent),
    daPercent: numOr(guard.da_percent, DEFAULT_PAYROLL.daPercent),
    daEnabled: boolOr(guard.da_enabled, DEFAULT_PAYROLL.daEnabled),
    hraPercent: numOr(guard.hra_percent, DEFAULT_PAYROLL.hraPercent),
    hraEnabled: boolOr(guard.hra_enabled, DEFAULT_PAYROLL.hraEnabled),
    ltaPercent: numOr(guard.lta_percent, DEFAULT_PAYROLL.ltaPercent),
    ltaEnabled: boolOr(guard.lta_enabled, DEFAULT_PAYROLL.ltaEnabled),
    specialAllowancePercent: numOr(guard.special_allowance_percent, DEFAULT_PAYROLL.specialAllowancePercent),
    specialAllowanceEnabled: boolOr(guard.special_allowance_enabled, DEFAULT_PAYROLL.specialAllowanceEnabled),
    bonusPercent: numOr(guard.bonus_percent, DEFAULT_PAYROLL.bonusPercent),
    bonusEnabled: boolOr(guard.bonus_enabled, DEFAULT_PAYROLL.bonusEnabled),
    epfPercent: numOr(guard.epf_percent, DEFAULT_PAYROLL.epfPercent),
    epfEnabled: boolOr(guard.epf_enabled, DEFAULT_PAYROLL.epfEnabled),
    esiPercent: numOr(guard.esi_percent, DEFAULT_PAYROLL.esiPercent),
    esiEnabled: boolOr(guard.esi_enabled, DEFAULT_PAYROLL.esiEnabled),
    ptAmount: numOr(guard.pt_amount, DEFAULT_PAYROLL.ptAmount),
    ptEnabled: boolOr(guard.pt_enabled, DEFAULT_PAYROLL.ptEnabled),
    otherDeduction: numOr(guard.other_deduction, DEFAULT_PAYROLL.otherDeduction),
    otherDeductionEnabled: boolOr(guard.other_deduction_enabled, DEFAULT_PAYROLL.otherDeductionEnabled),
    employerEpfPercent: numOr(guard.employer_epf_percent, DEFAULT_PAYROLL.employerEpfPercent),
    employerEpfEnabled: boolOr(guard.employer_epf_enabled, DEFAULT_PAYROLL.employerEpfEnabled),
    employerEpsPercent: numOr(guard.employer_eps_percent, DEFAULT_PAYROLL.employerEpsPercent),
    employerEpsEnabled: boolOr(guard.employer_eps_enabled, DEFAULT_PAYROLL.employerEpsEnabled),
    employerEsiPercent: numOr(guard.employer_esi_percent, DEFAULT_PAYROLL.employerEsiPercent),
    employerEsiEnabled: boolOr(guard.employer_esi_enabled, DEFAULT_PAYROLL.employerEsiEnabled),
  })

  return {
    id: guard.id as string,
    full_name: guard.full_name as string,
    email: (guard.email as string | null) ?? null,
    phone: (guard.phone as string | null) ?? null,
    base_salary: baseSalary,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    site_name: ((guard as any).sites?.site_name as string | undefined) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    site_address: ((guard as any).sites?.address as string | undefined) ?? null,
    shift_start: normalizeTime(guard.shift_start as string | null),
    shift_end: normalizeTime(guard.shift_end as string | null),
    month,
    monthLabel: label,
    monthAttendance,
    presentDaysThisMonth,
    salary,
  }
}

function numOr(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function boolOr(v: unknown, fallback: boolean): boolean {
  if (v === null || v === undefined) return fallback
  return !!v
}

function normalizeTime(value: string | null): string | null {
  if (!value) return null
  return value.length >= 5 ? value.slice(0, 5) : value
}
