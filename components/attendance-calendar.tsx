import { cn } from "@/lib/utils"

export function AttendanceCalendar({
  year,
  month, // 0-indexed
  presentDates,
}: {
  year: number
  month: number
  presentDates: Set<string>
}) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startWeekday = first.getDay() // 0 = Sun
  const daysInMonth = last.getDate()
  const todayIso = new Date().toISOString().slice(0, 10)

  type Cell = {
    key: string
    day: number | null
    iso?: string
    isPresent?: boolean
    isAbsent?: boolean
    isFuture?: boolean
    isToday?: boolean
  }

  const cells: Cell[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ key: `pad-${i}`, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const isPresent = presentDates.has(iso)
    const isFuture = iso > todayIso
    cells.push({
      key: iso,
      day: d,
      iso,
      isPresent,
      isAbsent: !isPresent && !isFuture,
      isFuture,
      isToday: iso === todayIso,
    })
  }

  const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"]

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {weekdayLabels.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => (
          <div
            key={c.key}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md text-sm",
              c.day === null && "opacity-0",
              c.isFuture && "bg-muted text-muted-foreground",
              c.isPresent && "bg-green-500 text-white font-medium",
              c.isAbsent && "bg-red-500 text-white font-medium",
              c.isToday && "ring-2 ring-ring ring-offset-1 ring-offset-background",
            )}
            aria-label={
              c.iso
                ? `${c.iso}${c.isPresent ? " present" : c.isAbsent ? " absent" : ""}`
                : undefined
            }
          >
            {c.day ?? ""}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-green-500" /> Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-500" /> Absent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-muted" /> Upcoming
        </span>
      </div>
    </div>
  )
}
