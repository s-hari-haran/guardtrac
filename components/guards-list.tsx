"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { AdminGuardRow, type AdminGuardRowData } from "@/components/admin-guard-row"

type Site = { id: string; site_name: string; address: string | null }

export type GuardsListItem = AdminGuardRowData & {
  site_name: string | null
  site_address: string | null
}

export function GuardsList({
  guards,
  sites,
}: {
  guards: GuardsListItem[]
  sites: Site[]
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return guards
    return guards.filter((g) => {
      const haystack = [
        g.full_name ?? "",
        g.email ?? "",
        g.phone ?? "",
        g.site_name ?? "",
        g.site_address ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [guards, query])

  return (
    <div className="flex flex-col">
      <div className="border-b border-border p-4 md:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, site, or address"
            aria-label="Search guards"
            className="h-10 pl-9"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {filtered.length} of {guards.length} guard{guards.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length > 0 ? (
        <ul className="divide-y divide-border">
          {filtered.map((g) => (
            <AdminGuardRow
              key={g.id}
              guard={g}
              sites={sites.map((s) => ({ id: s.id, site_name: s.site_name }))}
            />
          ))}
        </ul>
      ) : (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          {query
            ? "No guards match your search."
            : "No guards yet. Share the sign-up link with your team."}
        </p>
      )}
    </div>
  )
}
