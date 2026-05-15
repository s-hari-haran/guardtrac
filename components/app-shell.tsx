import type { ReactNode } from "react"
import Link from "next/link"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: ReactNode
}

export function AppShell({
  user,
  nav,
  children,
}: {
  user: { name: string; role: string }
  nav: NavItem[]
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center">
            <Brand />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Button key={item.href} asChild variant="ghost" size="sm" className="gap-2">
                <Link href={item.href}>
                  <span className="text-muted-foreground">{item.icon}</span>
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium leading-tight">{user.name}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{user.role}</div>
            </div>
            <form action="/auth/sign-out" method="post">
              <Button type="submit" variant="outline" size="sm" className="gap-2 bg-transparent">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-10">{children}</main>

      <nav
        aria-label="Primary"
        className="sticky bottom-0 z-30 border-t border-border bg-card md:hidden"
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(nav.length, 5)}, minmax(0, 1fr))` }}>
          {nav.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
