import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type UserRole = "guard" | "admin"

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return { supabase, user }
}

export async function getProfile() {
  const { supabase, user } = await requireUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .single()
  return { supabase, user, profile }
}

export async function requireRole(role: UserRole) {
  const ctx = await getProfile()
  if (ctx.profile?.role !== role) {
    redirect(ctx.profile?.role === "admin" ? "/admin" : "/guard")
  }
  return ctx
}
