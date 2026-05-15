"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteGuard, updateGuard } from "@/app/admin/actions"
import { Check, ChevronDown, Loader2, Trash2 } from "lucide-react"

type Site = { id: string; site_name: string }

export type AdminGuardRowData = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  site_id: string | null
  base_salary: number
  shift_start: string | null
  shift_end: string | null

  // Earnings structure
  basic_percent: number
  da_percent: number
  da_enabled: boolean
  hra_percent: number
  hra_enabled: boolean
  lta_percent: number
  lta_enabled: boolean
  special_allowance_percent: number
  special_allowance_enabled: boolean
  bonus_percent: number
  bonus_enabled: boolean

  // Employee deductions
  epf_percent: number
  epf_enabled: boolean
  esi_percent: number
  esi_enabled: boolean
  pt_amount: number
  pt_enabled: boolean
  other_deduction: number
  other_deduction_enabled: boolean

  // Employer contributions
  employer_epf_percent: number
  employer_epf_enabled: boolean
  employer_eps_percent: number
  employer_eps_enabled: boolean
  employer_esi_percent: number
  employer_esi_enabled: boolean
}

type FormState = {
  full_name: string
  phone: string
  site_id: string
  base_salary: string
  shift_start: string
  shift_end: string

  basic_percent: string
  da_percent: string
  da_enabled: boolean
  hra_percent: string
  hra_enabled: boolean
  lta_percent: string
  lta_enabled: boolean
  special_allowance_percent: string
  special_allowance_enabled: boolean
  bonus_percent: string
  bonus_enabled: boolean

  epf_percent: string
  epf_enabled: boolean
  esi_percent: string
  esi_enabled: boolean
  pt_amount: string
  pt_enabled: boolean
  other_deduction: string
  other_deduction_enabled: boolean

  employer_epf_percent: string
  employer_epf_enabled: boolean
  employer_eps_percent: string
  employer_eps_enabled: boolean
  employer_esi_percent: string
  employer_esi_enabled: boolean
}

function initialState(g: AdminGuardRowData): FormState {
  return {
    full_name: g.full_name ?? "",
    phone: g.phone ?? "",
    site_id: g.site_id ?? "",
    base_salary: String(g.base_salary ?? 0),
    shift_start: g.shift_start ?? "",
    shift_end: g.shift_end ?? "",

    basic_percent: String(g.basic_percent ?? 30),
    da_percent: String(g.da_percent ?? 10),
    da_enabled: !!g.da_enabled,
    hra_percent: String(g.hra_percent ?? 20),
    hra_enabled: !!g.hra_enabled,
    lta_percent: String(g.lta_percent ?? 10),
    lta_enabled: !!g.lta_enabled,
    special_allowance_percent: String(g.special_allowance_percent ?? 20),
    special_allowance_enabled: !!g.special_allowance_enabled,
    bonus_percent: String(g.bonus_percent ?? 10),
    bonus_enabled: !!g.bonus_enabled,

    epf_percent: String(g.epf_percent ?? 12),
    epf_enabled: !!g.epf_enabled,
    esi_percent: String(g.esi_percent ?? 0.75),
    esi_enabled: !!g.esi_enabled,
    pt_amount: String(g.pt_amount ?? 200),
    pt_enabled: !!g.pt_enabled,
    other_deduction: String(g.other_deduction ?? 0),
    other_deduction_enabled: !!g.other_deduction_enabled,

    employer_epf_percent: String(g.employer_epf_percent ?? 3.67),
    employer_epf_enabled: g.employer_epf_enabled ?? true,
    employer_eps_percent: String(g.employer_eps_percent ?? 8.33),
    employer_eps_enabled: g.employer_eps_enabled ?? true,
    employer_esi_percent: String(g.employer_esi_percent ?? 3.25),
    employer_esi_enabled: g.employer_esi_enabled ?? true,
  }
}

const num = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const formatINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`

export function AdminGuardRow({
  guard,
  sites,
}: {
  guard: AdminGuardRowData
  sites: Site[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [saved, setSaved] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => initialState(guard))

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Live computed amounts so admin sees ₹ next to every percentage as they type.
  const computed = useMemo(() => {
    const base = num(form.base_salary)
    const basic = base * (num(form.basic_percent) / 100)
    const da = form.da_enabled ? basic * (num(form.da_percent) / 100) : 0
    const hra = form.hra_enabled ? basic * (num(form.hra_percent) / 100) : 0
    const lta = form.lta_enabled ? basic * (num(form.lta_percent) / 100) : 0
    const special = form.special_allowance_enabled
      ? basic * (num(form.special_allowance_percent) / 100)
      : 0
    const bonus = form.bonus_enabled ? basic * (num(form.bonus_percent) / 100) : 0
    const epf = form.epf_enabled ? (basic + da) * (num(form.epf_percent) / 100) : 0
    const esi = form.esi_enabled ? base * (num(form.esi_percent) / 100) : 0
    const empEpf = form.employer_epf_enabled ? (basic + da) * (num(form.employer_epf_percent) / 100) : 0
    const empEps = form.employer_eps_enabled ? (basic + da) * (num(form.employer_eps_percent) / 100) : 0
    const empEsi = form.employer_esi_enabled ? base * (num(form.employer_esi_percent) / 100) : 0
    return { base, basic, da, hra, lta, special, bonus, epf, esi, empEpf, empEps, empEsi }
  }, [form])

  const currentSite = sites.find((s) => s.id === form.site_id)?.site_name ?? "Unassigned"

  const handleDelete = () => {
    setDeleteError(null)
    startDelete(async () => {
      const res = await deleteGuard(guard.id)
      if (!res.ok) setDeleteError(res.error)
    })
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData()
    fd.set("id", guard.id)
    fd.set("full_name", form.full_name)
    fd.set("phone", form.phone)
    fd.set("site_id", form.site_id)
    fd.set("base_salary", form.base_salary)
    fd.set("shift_start", form.shift_start)
    fd.set("shift_end", form.shift_end)
    fd.set("basic_percent", form.basic_percent)
    fd.set("da_percent", form.da_percent)
    if (form.da_enabled) fd.set("da_enabled", "on")
    fd.set("hra_percent", form.hra_percent)
    if (form.hra_enabled) fd.set("hra_enabled", "on")
    fd.set("lta_percent", form.lta_percent)
    if (form.lta_enabled) fd.set("lta_enabled", "on")
    fd.set("special_allowance_percent", form.special_allowance_percent)
    if (form.special_allowance_enabled) fd.set("special_allowance_enabled", "on")
    fd.set("bonus_percent", form.bonus_percent)
    if (form.bonus_enabled) fd.set("bonus_enabled", "on")
    fd.set("epf_percent", form.epf_percent)
    if (form.epf_enabled) fd.set("epf_enabled", "on")
    fd.set("esi_percent", form.esi_percent)
    if (form.esi_enabled) fd.set("esi_enabled", "on")
    fd.set("pt_amount", form.pt_amount)
    if (form.pt_enabled) fd.set("pt_enabled", "on")
    fd.set("other_deduction", form.other_deduction)
    if (form.other_deduction_enabled) fd.set("other_deduction_enabled", "on")
    fd.set("employer_epf_percent", form.employer_epf_percent)
    if (form.employer_epf_enabled) fd.set("employer_epf_enabled", "on")
    fd.set("employer_eps_percent", form.employer_eps_percent)
    if (form.employer_eps_enabled) fd.set("employer_eps_enabled", "on")
    fd.set("employer_esi_percent", form.employer_esi_percent)
    if (form.employer_esi_enabled) fd.set("employer_esi_enabled", "on")

    startTransition(async () => {
      const res = await updateGuard(fd)
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
        setOpen(false)
      }
    })
  }

  const shiftLabel =
    form.shift_start && form.shift_end
      ? `${formatTime(form.shift_start)} – ${formatTime(form.shift_end)}`
      : null

  return (
    <li className="px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{form.full_name || "Unnamed"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {guard.email ?? "—"} · {currentSite} · ₹{Number(form.base_salary || 0).toLocaleString("en-IN")}
            {shiftLabel ? ` · ${shiftLabel}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-transparent"
          onClick={() => setOpen((v) => !v)}
        >
          {saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          )}
          {saved ? "Saved" : open ? "Close" : "Edit"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="mt-4 grid gap-4 rounded-md border border-border bg-muted/40 p-3 md:p-4"
        >
          {/* Identity / posting */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`name-${guard.id}`} label="Full name">
              <Input
                id={`name-${guard.id}`}
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
              />
            </Field>
            <Field id={`phone-${guard.id}`} label="Phone">
              <Input
                id={`phone-${guard.id}`}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field id={`site-${guard.id}`} label="Assigned site">
              <select
                id={`site-${guard.id}`}
                value={form.site_id}
                onChange={(e) => set("site_id", e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Unassigned —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.site_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`salary-${guard.id}`} label="Base salary (₹)">
              <Input
                id={`salary-${guard.id}`}
                type="number"
                min={0}
                step={100}
                value={form.base_salary}
                onChange={(e) => set("base_salary", e.target.value)}
              />
            </Field>
            <Field id={`shift-start-${guard.id}`} label="Shift start">
              <Input
                id={`shift-start-${guard.id}`}
                type="time"
                value={form.shift_start}
                onChange={(e) => set("shift_start", e.target.value)}
              />
            </Field>
            <Field id={`shift-end-${guard.id}`} label="Shift end">
              <Input
                id={`shift-end-${guard.id}`}
                type="time"
                value={form.shift_end}
                onChange={(e) => set("shift_end", e.target.value)}
              />
            </Field>
          </div>

          {/* Earnings structure */}
          <Section title="Earnings structure" subtitle="Basic is a % of gross. Other components are % of Basic.">
            <PercentRow
              id={`basic-${guard.id}`}
              label="Basic"
              hint="% of gross"
              value={form.basic_percent}
              onChange={(v) => set("basic_percent", v)}
              amount={computed.basic}
              alwaysOn
            />
            <PercentRow
              id={`da-${guard.id}`}
              label="DA (Dearness Allowance)"
              hint="% of Basic"
              value={form.da_percent}
              onChange={(v) => set("da_percent", v)}
              amount={computed.da}
              enabled={form.da_enabled}
              onToggle={(c) => set("da_enabled", c)}
            />
            <PercentRow
              id={`hra-${guard.id}`}
              label="HRA"
              hint="% of Basic"
              value={form.hra_percent}
              onChange={(v) => set("hra_percent", v)}
              amount={computed.hra}
              enabled={form.hra_enabled}
              onToggle={(c) => set("hra_enabled", c)}
            />
            <PercentRow
              id={`lta-${guard.id}`}
              label="LTA"
              hint="% of Basic"
              value={form.lta_percent}
              onChange={(v) => set("lta_percent", v)}
              amount={computed.lta}
              enabled={form.lta_enabled}
              onToggle={(c) => set("lta_enabled", c)}
            />
            <PercentRow
              id={`special-${guard.id}`}
              label="Special Allowance"
              hint="% of Basic"
              value={form.special_allowance_percent}
              onChange={(v) => set("special_allowance_percent", v)}
              amount={computed.special}
              enabled={form.special_allowance_enabled}
              onToggle={(c) => set("special_allowance_enabled", c)}
            />
            <PercentRow
              id={`bonus-${guard.id}`}
              label="Bonus"
              hint="% of Basic"
              value={form.bonus_percent}
              onChange={(v) => set("bonus_percent", v)}
              amount={computed.bonus}
              enabled={form.bonus_enabled}
              onToggle={(c) => set("bonus_enabled", c)}
            />
            <p className="text-xs text-muted-foreground">
              Anything left after the components above is paid out as <span className="font-medium">Other
              Allowance</span> so the earnings always sum to gross.
            </p>
          </Section>

          {/* Employee deductions */}
          <Section title="Employee deductions" subtitle="Subtracted from the guard&apos;s earned amount.">
            <PercentRow
              id={`epf-${guard.id}`}
              label="EPF"
              hint="% of Basic + DA"
              value={form.epf_percent}
              onChange={(v) => set("epf_percent", v)}
              amount={computed.epf}
              enabled={form.epf_enabled}
              onToggle={(c) => set("epf_enabled", c)}
            />
            <PercentRow
              id={`esi-${guard.id}`}
              label="ESI"
              hint="% of Gross"
              value={form.esi_percent}
              onChange={(v) => set("esi_percent", v)}
              amount={computed.esi}
              enabled={form.esi_enabled}
              onToggle={(c) => set("esi_enabled", c)}
            />
            <AmountRow
              id={`pt-${guard.id}`}
              label="Professional Tax"
              hint="Flat amount in ₹"
              value={form.pt_amount}
              onChange={(v) => set("pt_amount", v)}
              enabled={form.pt_enabled}
              onToggle={(c) => set("pt_enabled", c)}
            />
            <AmountRow
              id={`other-${guard.id}`}
              label="Other deduction"
              hint="Flat amount in ₹"
              value={form.other_deduction}
              onChange={(v) => set("other_deduction", v)}
              enabled={form.other_deduction_enabled}
              onToggle={(c) => set("other_deduction_enabled", c)}
            />
          </Section>

          {/* Employer contributions */}
          <Section
            title="Employer contributions"
            subtitle="Shown on payslip for transparency. Not deducted from take-home."
          >
            <PercentRow
              id={`emp-epf-${guard.id}`}
              label="Employer EPF"
              hint="% of Basic + DA"
              value={form.employer_epf_percent}
              onChange={(v) => set("employer_epf_percent", v)}
              amount={computed.empEpf}
              enabled={form.employer_epf_enabled}
              onToggle={(c) => set("employer_epf_enabled", c)}
            />
            <PercentRow
              id={`emp-eps-${guard.id}`}
              label="Employer EPS"
              hint="% of Basic + DA"
              value={form.employer_eps_percent}
              onChange={(v) => set("employer_eps_percent", v)}
              amount={computed.empEps}
              enabled={form.employer_eps_enabled}
              onToggle={(c) => set("employer_eps_enabled", c)}
            />
            <PercentRow
              id={`emp-esi-${guard.id}`}
              label="Employer ESI"
              hint="% of Gross"
              value={form.employer_esi_percent}
              onChange={(v) => set("employer_esi_percent", v)}
              amount={computed.empEsi}
              enabled={form.employer_esi_enabled}
              onToggle={(c) => set("employer_esi_enabled", c)}
            />
          </Section>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Remove guard
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {form.full_name || "this guard"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes their account, attendance history, and salary data. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    {deleteError}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete()
                    }}
                    disabled={isDeleting}
                    className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
                  >
                    {isDeleting ? "Removing..." : "Yes, remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      )}
    </li>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 rounded-md border border-dashed border-border bg-background/40 p-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  )
}

function PercentRow({
  id,
  label,
  hint,
  value,
  onChange,
  amount,
  enabled,
  onToggle,
  alwaysOn,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  amount: number
  enabled?: boolean
  onToggle?: (checked: boolean) => void
  alwaysOn?: boolean
}) {
  const dim = !alwaysOn && enabled === false
  return (
    <div
      className={`flex flex-col gap-2 border-b border-dashed border-border/60 pb-2 last:border-b-0 last:pb-0 sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-3 sm:border-b-0 sm:pb-0 ${
        dim ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center justify-between gap-2 sm:contents">
        <Input
          id={id}
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-20 text-right tabular-nums sm:w-24"
          aria-label={`${label} percent`}
        />
        <span className="flex-1 text-right text-sm font-medium tabular-nums text-foreground sm:w-24 sm:flex-none">
          {formatINR(dim ? 0 : amount)}
        </span>
        {alwaysOn ? (
          <span className="w-16 text-right text-xs text-muted-foreground">always</span>
        ) : (
          <label className="inline-flex w-16 cursor-pointer items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={!!enabled}
              onChange={(e) => onToggle?.(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-emerald-600"
            />
            <span>On</span>
          </label>
        )}
      </div>
    </div>
  )
}

function AmountRow({
  id,
  label,
  hint,
  value,
  onChange,
  enabled,
  onToggle,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  enabled: boolean
  onToggle: (checked: boolean) => void
}) {
  const dim = !enabled
  return (
    <div
      className={`flex flex-col gap-2 border-b border-dashed border-border/60 pb-2 last:border-b-0 last:pb-0 sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-3 sm:border-b-0 sm:pb-0 ${
        dim ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center justify-between gap-2 sm:contents">
        <Input
          id={id}
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-20 text-right tabular-nums sm:w-24"
          aria-label={`${label} amount`}
        />
        <span className="flex-1 text-right text-sm font-medium tabular-nums text-foreground sm:w-24 sm:flex-none">
          {formatINR(dim ? 0 : num(value))}
        </span>
        <label className="inline-flex w-16 cursor-pointer items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-emerald-600"
          />
          <span>On</span>
        </label>
      </div>
    </div>
  )
}

function formatTime(t: string) {
  const [hh, mm] = t.split(":")
  const d = new Date()
  d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0)
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
}
