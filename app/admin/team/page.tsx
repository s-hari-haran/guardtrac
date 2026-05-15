import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { CreateAdminForm } from "@/components/create-admin-form"
import { RemoveAdminButton } from "@/components/remove-admin-button"

export const dynamic = "force-dynamic"

export default async function AdminTeamPage() {
  const { user } = await requireRole("admin")
  const admin = createAdminClient()

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true })

  const rows: { id: string; full_name: string; email: string; created_at: string }[] = []
  for (const p of profiles ?? []) {
    const { data } = await admin.auth.admin.getUserById(p.id)
    rows.push({
      id: p.id,
      full_name: p.full_name ?? "Admin",
      email: data?.user?.email ?? "",
      created_at: p.created_at,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Only existing admins can create new admin accounts. Public sign-ups are always created as guards.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a new admin</CardTitle>
          <CardDescription>They will be able to manage sites, guards, and attendance.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdminForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current admins ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 md:px-6">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3 text-right md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 md:px-6">
                      <div className="flex items-center gap-2 font-medium">
                        {r.full_name}
                        {r.id === user.id && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                            You
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right md:px-6">
                      {r.id === user.id ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <RemoveAdminButton id={r.id} name={r.full_name} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
