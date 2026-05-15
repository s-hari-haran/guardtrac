import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { createSite, deleteSite } from "@/app/admin/actions"
import { SiteQrDialog } from "@/components/site-qr"

export default async function SitesPage() {
  await requireRole("admin")
  const supabase = await createClient()
  const { data: sites } = await supabase
    .from("sites")
    .select("id, site_name, address, qr_code_value, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
        <p className="text-sm text-muted-foreground">
          Each site has a unique QR code. Guards scan it at the site to mark attendance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a new site</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSite} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="site_name">Site name</Label>
              <Input id="site_name" name="site_name" placeholder="e.g. Tower A — Main Gate" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" name="address" placeholder="Street, city" />
            </div>
            <Button type="submit" className="h-10">
              Add site
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All sites</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sites && sites.length > 0 ? (
            <ul className="divide-y divide-border">
              {sites.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6"
                >
                  <div>
                    <p className="text-sm font-medium">{s.site_name}</p>
                    {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <SiteQrDialog siteId={s.id} siteName={s.site_name} qrValue={s.qr_code_value} />
                    <form
                      action={async () => {
                        "use server"
                        await deleteSite(s.id)
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">No sites yet. Add your first one above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
