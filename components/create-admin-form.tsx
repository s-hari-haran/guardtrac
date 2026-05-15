"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAdmin } from "@/app/admin/team/actions"

export function CreateAdminForm() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    start(async () => {
      const res = await createAdmin(fd)
      if (res.ok) {
        setMsg({ kind: "ok", text: "Admin account created." })
        form.reset()
      } else {
        setMsg({ kind: "err", text: res.error })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="admin-name">Full name</Label>
        <Input id="admin-name" name="full_name" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="admin-email">Email</Label>
        <Input id="admin-email" name="email" type="email" required />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="admin-password">Temporary password</Label>
        <Input id="admin-password" name="password" type="password" required minLength={6} />
        <p className="text-xs text-muted-foreground">Share this with the new admin so they can sign in.</p>
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create admin"}
        </Button>
        {msg && (
          <p className={msg.kind === "ok" ? "text-sm text-primary" : "text-sm text-destructive"} role="alert">
            {msg.text}
          </p>
        )}
      </div>
    </form>
  )
}
