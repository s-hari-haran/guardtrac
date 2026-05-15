import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // API routes manage their own auth (e.g. cron uses CRON_SECRET).
    // Skip the session-based redirect logic entirely for them.
    if (pathname.startsWith("/api/")) {
      return supabaseResponse
    }

    const isAuthRoute = pathname.startsWith("/auth")
    // Pages that always render even when signed in (callback handler, sign-out, error display)
    const isAuthPassthrough =
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/auth/sign-out") ||
      pathname.startsWith("/auth/error")

    // Already signed in but visiting login / sign-up -> bounce to home (which routes to /admin or /guard)
    if (user && isAuthRoute && !isAuthPassthrough) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.search = ""
      return NextResponse.redirect(url)
    }

    if (!user && !isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      url.search = ""
      url.searchParams.set("next", pathname + (request.nextUrl.search || ""))
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error(
      "Supabase middleware session update failed (check NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY, Supabase availability, and auth credentials):",
      error,
    )
    return NextResponse.next({ request })
  }
}
