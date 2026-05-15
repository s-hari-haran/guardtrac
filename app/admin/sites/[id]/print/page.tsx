import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { PrintablePoster } from "@/components/printable-poster"

export default async function PrintSitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole("admin")
  const { id } = await params
  const supabase = await createClient()
  const { data: site } = await supabase
    .from("sites")
    .select("id, site_name, address, qr_code_value")
    .eq("id", id)
    .single()

  if (!site) notFound()

  return (
    <PrintablePoster
      siteName={site.site_name}
      address={site.address}
      qrValue={site.qr_code_value}
    />
  )
}
