export const WORKING_DAYS = 26

// Statutory / common payroll defaults. Each component has an enable toggle
// (where applicable) and a percentage or flat-amount input that admin can edit
// per guard. Earnings are split as % of Basic; Basic itself is % of Gross.
export const DEFAULT_PAYROLL = {
  // Earnings (each is % of Basic, except basicPercent which is % of earned gross)
  basicPercent: 50,
  daPercent: 0,
  daEnabled: true,
  hraPercent: 40,
  hraEnabled: true,
  ltaPercent: 0,
  ltaEnabled: false,
  specialAllowancePercent: 0,
  specialAllowanceEnabled: false,
  bonusPercent: 0,
  bonusEnabled: false,

  // Employee deductions
  epfPercent: 12, // of (Basic + DA)
  epfEnabled: true,
  esiPercent: 0.75, // of Gross
  esiEnabled: true,
  ptAmount: 200, // flat ₹
  ptEnabled: true,
  otherDeduction: 0, // flat ₹
  otherDeductionEnabled: false,

  // Employer contributions (display only, do NOT reduce employee net)
  employerEpfPercent: 3.67, // of (Basic + DA)
  employerEpfEnabled: true,
  employerEpsPercent: 8.33, // of (Basic + DA)
  employerEpsEnabled: true,
  employerEsiPercent: 3.25, // of Gross
  employerEsiEnabled: true,
}

export type PayrollConfig = Partial<typeof DEFAULT_PAYROLL>

export type SalaryBreakdown = {
  baseSalary: number
  perDaySalary: number
  presentDays: number
  absentDays: number
  absentDeduction: number
  /** Gross earned for the month after absent-day deduction. */
  earned: number

  // Earnings
  basic: number
  basicPercent: number
  da: number
  daPercent: number
  daEnabled: boolean
  hra: number
  hraPercent: number
  hraEnabled: boolean
  lta: number
  ltaPercent: number
  ltaEnabled: boolean
  specialAllowance: number
  specialAllowancePercent: number
  specialAllowanceEnabled: boolean
  bonus: number
  bonusPercent: number
  bonusEnabled: boolean
  /** Auto-balancer = earned - (basic + da + hra + lta + special + bonus). */
  otherAllowance: number
  totalEarnings: number

  // Employee deductions
  epf: number
  epfPercent: number
  epfEnabled: boolean
  esi: number
  esiPercent: number
  esiEnabled: boolean
  pt: number
  ptAmount: number
  ptEnabled: boolean
  otherDeduction: number
  otherDeductionAmount: number
  otherDeductionEnabled: boolean
  totalDeductions: number

  // Net pay
  finalSalary: number

  // Employer (display only)
  employerEpf: number
  employerEpfPercent: number
  employerEpfEnabled: boolean
  employerEps: number
  employerEpsPercent: number
  employerEpsEnabled: boolean
  employerEsi: number
  employerEsiPercent: number
  employerEsiEnabled: boolean
  totalEmployerContribution: number
}

export function calculateSalary(
  baseSalary: number,
  presentDays: number,
  config: PayrollConfig = {},
): SalaryBreakdown {
  const c = { ...DEFAULT_PAYROLL, ...config }
  const safeBase = Math.max(0, Number(baseSalary) || 0)
  const perDay = safeBase / WORKING_DAYS
  const cappedPresent = Math.min(Math.max(0, presentDays), WORKING_DAYS)
  const absentDays = Math.max(0, WORKING_DAYS - cappedPresent)
  const absentDeduction = perDay * absentDays
  const earned = Math.max(0, safeBase - absentDeduction)

  // ---- Earnings split ----
  const basicPct = clampPercent(c.basicPercent)
  const basic = earned * (basicPct / 100)

  const daPct = clampPercent(c.daPercent)
  const da = c.daEnabled ? basic * (daPct / 100) : 0

  const hraPct = clampPercent(c.hraPercent)
  const hra = c.hraEnabled ? basic * (hraPct / 100) : 0

  const ltaPct = clampPercent(c.ltaPercent)
  const lta = c.ltaEnabled ? basic * (ltaPct / 100) : 0

  const specialPct = clampPercent(c.specialAllowancePercent)
  const specialAllowance = c.specialAllowanceEnabled ? basic * (specialPct / 100) : 0

  const bonusPct = clampPercent(c.bonusPercent)
  const bonus = c.bonusEnabled ? basic * (bonusPct / 100) : 0

  // Anything left over goes into a residual "Other Allowance" so the earnings
  // section always sums to the gross. If admin over-commits via large %s, this
  // clamps to 0 (and the breakdown will show that earnings exceed the gross,
  // which the admin can fix by lowering the percentages).
  const sumNamedEarnings = basic + da + hra + lta + specialAllowance + bonus
  const otherAllowance = Math.max(0, earned - sumNamedEarnings)
  const totalEarnings = basic + da + hra + lta + specialAllowance + bonus + otherAllowance

  // ---- Employee deductions ----
  const epfBase = basic + da
  const epfPct = clampPercent(c.epfPercent)
  const epf = c.epfEnabled ? epfBase * (epfPct / 100) : 0

  const esiPct = clampPercent(c.esiPercent)
  const esi = c.esiEnabled ? earned * (esiPct / 100) : 0

  const ptAmount = Math.max(0, Number(c.ptAmount) || 0)
  const pt = c.ptEnabled ? ptAmount : 0

  const otherDeductionAmount = Math.max(0, Number(c.otherDeduction) || 0)
  const otherDeduction = c.otherDeductionEnabled ? otherDeductionAmount : 0

  const totalDeductions = epf + esi + pt + otherDeduction
  const finalSalary = Math.max(0, earned - totalDeductions)

  // ---- Employer contributions (display only) ----
  const empEpfPct = clampPercent(c.employerEpfPercent)
  const empEpsPct = clampPercent(c.employerEpsPercent)
  const empEsiPct = clampPercent(c.employerEsiPercent)
  const employerEpf = c.employerEpfEnabled ? epfBase * (empEpfPct / 100) : 0
  const employerEps = c.employerEpsEnabled ? epfBase * (empEpsPct / 100) : 0
  const employerEsi = c.employerEsiEnabled ? earned * (empEsiPct / 100) : 0
  const totalEmployerContribution = employerEpf + employerEps + employerEsi

  return {
    baseSalary: safeBase,
    perDaySalary: perDay,
    presentDays: cappedPresent,
    absentDays,
    absentDeduction,
    earned,

    basic,
    basicPercent: basicPct,
    da,
    daPercent: daPct,
    daEnabled: !!c.daEnabled,
    hra,
    hraPercent: hraPct,
    hraEnabled: !!c.hraEnabled,
    lta,
    ltaPercent: ltaPct,
    ltaEnabled: !!c.ltaEnabled,
    specialAllowance,
    specialAllowancePercent: specialPct,
    specialAllowanceEnabled: !!c.specialAllowanceEnabled,
    bonus,
    bonusPercent: bonusPct,
    bonusEnabled: !!c.bonusEnabled,
    otherAllowance,
    totalEarnings,

    epf,
    epfPercent: epfPct,
    epfEnabled: !!c.epfEnabled,
    esi,
    esiPercent: esiPct,
    esiEnabled: !!c.esiEnabled,
    pt,
    ptAmount,
    ptEnabled: !!c.ptEnabled,
    otherDeduction,
    otherDeductionAmount,
    otherDeductionEnabled: !!c.otherDeductionEnabled,
    totalDeductions,

    finalSalary,

    employerEpf,
    employerEpfPercent: empEpfPct,
    employerEpfEnabled: !!c.employerEpfEnabled,
    employerEps,
    employerEpsPercent: empEpsPct,
    employerEpsEnabled: !!c.employerEpsEnabled,
    employerEsi,
    employerEsiPercent: empEsiPct,
    employerEsiEnabled: !!c.employerEsiEnabled,
    totalEmployerContribution,
  }
}

function clampPercent(n: number) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  if (v < 0) return 0
  if (v > 100) return 100
  return v
}

export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}
