"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signUpUser, type PublicSite } from "@/app/auth/sign-up/actions"

const NO_SITE = "__none__"

export function SignUpForm({ sites }: { sites: PublicSite[] }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [siteId, setSiteId] = useState<string>(NO_SITE)
  const [shiftStart, setShiftStart] = useState("09:00")
  const [shiftEnd, setShiftEnd] = useState("17:00")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const result = await signUpUser({
        email,
        password,
        fullName,
        phone,
        siteId: siteId === NO_SITE ? undefined : siteId,
        shiftStart,
        shiftEnd,
      })
      if (!result.ok) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        router.push("/auth/login")
        return
      }

      router.push(result.role === "admin" ? "/admin" : "/guard")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignUp}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="site">
            Assigned site <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger id="site">
              <SelectValue placeholder="Select your site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SITE}>No site yet (admin will assign)</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.site_name}
                  {s.address ? ` — ${s.address}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Admin can change this later from the dashboard.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="shift_start">Duty start</Label>
            <Input
              id="shift_start"
              name="shift_start"
              type="time"
              required
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shift_end">Duty end</Label>
            <Input
              id="shift_end"
              name="shift_end"
              type="time"
              required
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
            />
          </div>
          <p className="col-span-2 -mt-1 text-xs text-muted-foreground">
            Required. Admin can adjust your shift later.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="repeat-password">Repeat password</Label>
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-11 w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {"Already have an account? "}
        <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  )
}
