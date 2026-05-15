"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const ALLOWED_STATUSES = new Set(["present", "absent"])

function isValidDate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d).getTime())
}

/**
 * Insert a new attendance row, or update the status of an existing one
 * for the given (guard, date) pair. Used by admin to correct attendance.
 */
export async function upsertAttendance(formData: FormData) {
  await requireRole("admin")
  const supabase = createAdminClient()

  const guardId = String(formData.get("guard_id") ?? "")
  const date = String(formData.get("date") ?? "")
  const status = String(formData.get("status") ?? "")

  if (!guardId) return { ok: false, error: "Missing guard id" } as const
  if (!isValidDate(date)) return { ok: false, error: "Invalid date" } as const
  if (!ALLOWED_STATUSES.has(status)) return { ok: false, error: "Invalid status" } as const

  // Look up the guard's assigned site so the row passes any site-based RLS / reporting.
  const { data: guard } = await supabase
    .from("guards")
    .select("site_id")
    .eq("id", guardId)
    .single()

  // See if a row already exists for this (guard, date) — attendance is one-per-day.
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("guard_id", guardId)
    .eq("date", date)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from("attendance")
      .update({
        status,
        // Refresh marked_at so the change is traceable; clear coords for admin edits.
        marked_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    if (error) return { ok: false, error: error.message } as const
  } else {
    const { error } = await supabase.from("attendance").insert({
      guard_id: guardId,
      date,
      status,
      marked_at: new Date().toISOString(),
      site_id: guard?.site_id ?? null,
    })
    if (error) return { ok: false, error: error.message } as const
  }

  revalidatePath("/admin")
  revalidatePath("/admin/guards")
  revalidatePath("/admin/attendance")
  revalidatePath("/guard/salary")
  revalidatePath("/guard/attendance")
  return { ok: true } as const
}

/** Remove a single attendance entry by id. */
export async function deleteAttendance(id: string) {
  await requireRole("admin")
  if (!id) return { ok: false, error: "Missing id" } as const
  const supabase = createAdminClient()
  const { error } = await supabase.from("attendance").delete().eq("id", id)
  if (error) return { ok: false, error: error.message } as const

  revalidatePath("/admin")
  revalidatePath("/admin/guards")
  revalidatePath("/admin/attendance")
  revalidatePath("/guard/salary")
  revalidatePath("/guard/attendance")
  return { ok: true } as const
}
