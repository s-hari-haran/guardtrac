"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { notifyAttendanceMarked } from "@/lib/notifications"
import type { ScanLocation } from "@/lib/geo"

export type ScanResult =
  | { ok: true; siteName: string; alreadyMarked?: boolean; locationCaptured: boolean }
  | { ok: false; error: string }

/**
 * Extract the actual QR token from whatever the scanner returned.
 * Printed QRs encode a deep-link URL like `https://app.com/guard/scan?qr=TOKEN`,
 * so the in-app scanner sees the whole URL. Older QRs may be the raw token only.
 */
function extractQrToken(raw: string): string {
  const value = raw.trim()
  // Try parsing as URL and reading the `qr` search param.
  try {
    const url = new URL(value)
    const fromParam = url.searchParams.get("qr")
    if (fromParam) return fromParam.trim()
  } catch {
    // Not a URL, fall through.
  }
  return value
}

export async function markAttendanceFromQr(qrValue: string, location?: ScanLocation | null): Promise<ScanResult> {
  const trimmed = extractQrToken(qrValue ?? "")
  console.log("[v0] markAttendanceFromQr raw:", JSON.stringify(qrValue), "extracted:", JSON.stringify(trimmed))
  if (!trimmed) return { ok: false, error: "Empty QR code." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const { data: guard, error: guardErr } = await supabase
    .from("guards")
    .select("id, site_id, full_name")
    .eq("id", user.id)
    .single()

  if (guardErr || !guard) {
    return { ok: false, error: "Guard profile not found. Contact your admin." }
  }
  if (!guard.site_id) {
    return { ok: false, error: "You have not been assigned to a site yet." }
  }

  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("id, site_name")
    .eq("qr_code_value", trimmed)
    .maybeSingle()

  if (siteErr) return { ok: false, error: "Could not validate QR code." }
  if (!site) return { ok: false, error: "Unknown QR code." }

  if (site.id !== guard.site_id) {
    return { ok: false, error: "This QR code is not for your assigned site." }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("guard_id", user.id)
    .eq("date", today)
    .maybeSingle()

  if (existing) {
    return { ok: true, siteName: site.site_name, alreadyMarked: true, locationCaptured: !!location }
  }

  const lat = location?.latitude ?? null
  const lng = location?.longitude ?? null
  const acc = location?.accuracy ?? null

  const { error: insErr } = await supabase.from("attendance").insert({
    guard_id: user.id,
    site_id: site.id,
    date: today,
    status: "present",
    latitude: lat,
    longitude: lng,
    accuracy_m: acc,
  })

  if (insErr) {
    if (insErr.code === "23505") {
      return { ok: true, siteName: site.site_name, alreadyMarked: true, locationCaptured: !!location }
    }
    return { ok: false, error: insErr.message }
  }

  try {
    await notifyAttendanceMarked({
      guardName: guard.full_name,
      siteName: site.site_name,
      markedAt: new Date(),
      latitude: lat,
      longitude: lng,
      accuracy: acc,
    })
  } catch (err) {
    console.log("[v0] notifyAttendanceMarked error:", err)
  }

  revalidatePath("/guard")
  revalidatePath("/guard/attendance")
  return { ok: true, siteName: site.site_name, locationCaptured: !!location }
}
