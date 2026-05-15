import "server-only"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"

const FROM = process.env.NOTIFY_FROM_EMAIL || "Chowkidar Security <onboarding@resend.dev>"

async function getAdminEmails(): Promise<string[]> {
  try {
    const admin = createAdminClient()
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")

    if (error || !profiles?.length) return []

    const emails: string[] = []
    for (const p of profiles) {
      const { data } = await admin.auth.admin.getUserById(p.id)
      const email = data?.user?.email
      if (email) emails.push(email)
    }
    return emails
  } catch (err) {
    console.log("[v0] getAdminEmails error:", err)
    return []
  }
}

function wrap(title: string, body: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="border-bottom:2px solid #1e3a8a;padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:12px;letter-spacing:2px;color:#1e3a8a;text-transform:uppercase">Chowkidar Security Services</div>
      <h1 style="margin:6px 0 0;font-size:20px;color:#0f172a">${title}</h1>
    </div>
    <div style="font-size:14px;line-height:1.6">${body}</div>
    <p style="margin-top:32px;font-size:12px;color:#64748b">You are receiving this because you are an admin on Chowkidar Security Services.</p>
  </div>`
}

async function send(subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[v0] RESEND_API_KEY missing, skipping admin email")
    return
  }
  const to = await getAdminEmails()
  if (!to.length) {
    console.log("[v0] No admin emails to notify")
    return
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.log("[v0] Resend send error:", err)
  }
}

export async function notifyNewGuard(opts: {
  fullName: string
  email: string
  phone?: string | null
}) {
  const body = `
    <p>A new guard has just signed up:</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Name</td><td style="padding:6px 0;font-weight:600">${escape(opts.fullName)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Email</td><td style="padding:6px 0">${escape(opts.email)}</td></tr>
      ${opts.phone ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b">Phone</td><td style="padding:6px 0">${escape(opts.phone)}</td></tr>` : ""}
    </table>
    <p style="margin-top:16px">Assign them to a site and set their base salary in the admin dashboard.</p>
  `
  await send(`New guard signed up: ${opts.fullName}`, wrap("New guard signed up", body))
}

export async function notifyAttendanceMarked(opts: {
  guardName: string
  siteName: string
  markedAt: Date
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
}) {
  const time = opts.markedAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const hasLoc = typeof opts.latitude === "number" && typeof opts.longitude === "number"
  const mapsUrl = hasLoc ? `https://www.google.com/maps?q=${opts.latitude},${opts.longitude}` : null
  const accStr = typeof opts.accuracy === "number" ? `±${Math.round(opts.accuracy)} m` : ""

  const body = `
    <p><strong>${escape(opts.guardName)}</strong> marked attendance.</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Site</td><td style="padding:6px 0;font-weight:600">${escape(opts.siteName)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Time</td><td style="padding:6px 0">${escape(time)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Location</td><td style="padding:6px 0">
        ${
          mapsUrl
            ? `<a href="${mapsUrl}" style="color:#1e3a8a;text-decoration:underline">${opts.latitude!.toFixed(5)}, ${opts.longitude!.toFixed(5)}</a> ${escape(accStr)}`
            : `<span style="color:#64748b">Not shared</span>`
        }
      </td></tr>
    </table>
  `
  await send(`Attendance marked: ${opts.guardName} @ ${opts.siteName}`, wrap("Attendance marked", body))
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
