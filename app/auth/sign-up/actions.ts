"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { notifyNewGuard } from "@/lib/notifications"

export type SignUpResult = { ok: true; role: "guard" | "admin" } | { ok: false; error: string }

export type PublicSite = { id: string; site_name: string; address: string | null }

/** Public list of sites for the sign-up dropdown (uses service role to bypass RLS). */
export async function listPublicSites(): Promise<PublicSite[]> {
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return []
  }
  const { data } = await admin
    .from("sites")
    .select("id, site_name, address")
    .order("site_name", { ascending: true })
  return (data ?? []) as PublicSite[]
}

/**
 * Public sign-up. Always creates a "guard" account.
 * Exception: if there are zero admins in the system yet, the very first signup
 * is promoted to admin so the agency can bootstrap itself.
 * Admins for an established agency are created from /admin/team by an existing admin.
 */
export async function signUpUser(input: {
  email: string
  password: string
  fullName: string
  phone?: string
  siteId?: string
  shiftStart?: string
  shiftEnd?: string
}): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  const fullName = input.fullName.trim()
  const phone = input.phone?.trim() || null
  const siteId = input.siteId?.trim() || null
  const shiftStart = input.shiftStart?.trim() || null
  const shiftEnd = input.shiftEnd?.trim() || null

  if (!email || !password || !fullName) {
    return { ok: false, error: "Please fill in name, email, and password." }
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return {
      ok: false,
      error: "Server is missing Supabase service role key. Contact support.",
    }
  }

  // Bootstrap rule: first user becomes admin, everyone else becomes a guard.
  const { count: adminCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")

  const role: "guard" | "admin" = (adminCount ?? 0) === 0 ? "admin" : "guard"

  // Guards must provide shift timings.
  if (role === "guard" && (!shiftStart || !shiftEnd)) {
    return { ok: false, error: "Please enter your duty start and end times." }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, role },
  })

  if (error || !data?.user) {
    const msg = error?.message || "Could not create account."
    if (/already.*registered|exists/i.test(msg)) {
      return { ok: false, error: "An account with this email already exists. Try signing in." }
    }
    return { ok: false, error: msg }
  }

  if (role === "guard") {
    const update: Record<string, unknown> = {}
    if (siteId) update.site_id = siteId
    if (shiftStart) update.shift_start = shiftStart
    if (shiftEnd) update.shift_end = shiftEnd
    if (Object.keys(update).length > 0) {
      await admin.from("guards").update(update).eq("id", data.user.id)
    }
    await notifyNewGuard({ fullName, email, phone })
  }

  return { ok: true, role }
}
