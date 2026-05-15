"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

async function ensureAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not signed in")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") throw new Error("Admin access required")
  return { supabase, user }
}

export async function createSite(formData: FormData) {
  const siteName = String(formData.get("site_name") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()
  if (!siteName) return { ok: false, error: "Site name is required" } as const

  const { supabase } = await ensureAdmin()
  const { error } = await supabase.from("sites").insert({
    site_name: siteName,
    address: address || null,
  })
  if (error) return { ok: false, error: error.message } as const
  revalidatePath("/admin/sites")
  revalidatePath("/admin")
  revalidatePath("/auth/sign-up")
  return { ok: true } as const
}

export async function deleteSite(id: string) {
  const { supabase } = await ensureAdmin()
  const { error } = await supabase.from("sites").delete().eq("id", id)
  if (error) return { ok: false, error: error.message } as const
  revalidatePath("/admin/sites")
  revalidatePath("/auth/sign-up")
  return { ok: true } as const
}

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function clampAmount(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function pctField(formData: FormData, key: string, fallback: number) {
  const raw = formData.get(key)
  if (raw == null || raw === "") return fallback
  return clampPercent(Number(raw))
}

function amountField(formData: FormData, key: string, fallback: number) {
  const raw = formData.get(key)
  if (raw == null || raw === "") return fallback
  return clampAmount(Number(raw))
}

export async function updateGuard(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  if (!id) return { ok: false, error: "Missing guard id" } as const

  const fullName = String(formData.get("full_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const siteId = String(formData.get("site_id") ?? "")
  const baseSalary = clampAmount(Number(formData.get("base_salary") ?? 0))
  const shiftStartRaw = String(formData.get("shift_start") ?? "").trim()
  const shiftEndRaw = String(formData.get("shift_end") ?? "").trim()

  // Earnings structure
  const basicPercent = pctField(formData, "basic_percent", 30)
  const daPercent = pctField(formData, "da_percent", 10)
  const daEnabled = formData.get("da_enabled") === "on"
  const hraPercent = pctField(formData, "hra_percent", 20)
  const hraEnabled = formData.get("hra_enabled") === "on"
  const ltaPercent = pctField(formData, "lta_percent", 10)
  const ltaEnabled = formData.get("lta_enabled") === "on"
  const specialAllowancePercent = pctField(formData, "special_allowance_percent", 20)
  const specialAllowanceEnabled = formData.get("special_allowance_enabled") === "on"
  const bonusPercent = pctField(formData, "bonus_percent", 10)
  const bonusEnabled = formData.get("bonus_enabled") === "on"

  // Employee deductions
  const epfPercent = pctField(formData, "epf_percent", 12)
  const epfEnabled = formData.get("epf_enabled") === "on"
  const esiPercent = pctField(formData, "esi_percent", 0.75)
  const esiEnabled = formData.get("esi_enabled") === "on"
  const ptAmount = amountField(formData, "pt_amount", 200)
  const ptEnabled = formData.get("pt_enabled") === "on"
  const otherDeduction = amountField(formData, "other_deduction", 0)
  const otherDeductionEnabled = formData.get("other_deduction_enabled") === "on"

  // Employer contributions (display)
  const employerEpfPercent = pctField(formData, "employer_epf_percent", 3.67)
  const employerEpfEnabled = formData.get("employer_epf_enabled") === "on"
  const employerEpsPercent = pctField(formData, "employer_eps_percent", 8.33)
  const employerEpsEnabled = formData.get("employer_eps_enabled") === "on"
  const employerEsiPercent = pctField(formData, "employer_esi_percent", 3.25)
  const employerEsiEnabled = formData.get("employer_esi_enabled") === "on"

  const { supabase } = await ensureAdmin()
  const { error } = await supabase
    .from("guards")
    .update({
      full_name: fullName || undefined,
      phone: phone || null,
      site_id: siteId || null,
      base_salary: baseSalary,
      shift_start: shiftStartRaw || null,
      shift_end: shiftEndRaw || null,

      basic_percent: basicPercent,
      da_percent: daPercent,
      da_enabled: daEnabled,
      hra_percent: hraPercent,
      hra_enabled: hraEnabled,
      lta_percent: ltaPercent,
      lta_enabled: ltaEnabled,
      special_allowance_percent: specialAllowancePercent,
      special_allowance_enabled: specialAllowanceEnabled,
      bonus_percent: bonusPercent,
      bonus_enabled: bonusEnabled,

      epf_percent: epfPercent,
      epf_enabled: epfEnabled,
      esi_percent: esiPercent,
      esi_enabled: esiEnabled,
      pt_amount: ptAmount,
      pt_enabled: ptEnabled,
      other_deduction: otherDeduction,
      other_deduction_enabled: otherDeductionEnabled,

      employer_epf_percent: employerEpfPercent,
      employer_epf_enabled: employerEpfEnabled,
      employer_eps_percent: employerEpsPercent,
      employer_eps_enabled: employerEpsEnabled,
      employer_esi_percent: employerEsiPercent,
      employer_esi_enabled: employerEsiEnabled,
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message } as const

  revalidatePath("/admin/guards")
  revalidatePath("/admin")
  revalidatePath("/guard/salary")
  return { ok: true } as const
}

export async function deleteGuard(guardId: string) {
  if (!guardId) return { ok: false, error: "Missing guard id" } as const

  const { user } = await ensureAdmin()
  if (user.id === guardId) {
    return { ok: false, error: "You cannot delete your own account." } as const
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, error: "Server is missing Supabase service role key." } as const
  }

  // Safety: only allow deleting users whose profile.role is 'guard'.
  const { data: target, error: lookupErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", guardId)
    .single()

  if (lookupErr) return { ok: false, error: lookupErr.message } as const
  if (!target) return { ok: false, error: "Guard not found." } as const
  if (target.role !== "guard") {
    return { ok: false, error: "Only guard accounts can be removed from this page." } as const
  }

  // Delete the auth user. Cascade FKs clean up profiles, guards, and attendance.
  const { error } = await admin.auth.admin.deleteUser(guardId)
  if (error) return { ok: false, error: error.message } as const

  revalidatePath("/admin/guards")
  revalidatePath("/admin")
  return { ok: true } as const
}
