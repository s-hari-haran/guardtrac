"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type GuardDetail } from "@/app/admin/guard-detail-actions"
import { formatINR, WORKING_DAYS } from "@/lib/salary"

const COMPANY_NAME = "Chowkidar Security Services"
const COMPANY_TAGLINE = "Your safety, our duty"

// jsPDF measures text in points by default
type RGB = [number, number, number]
const COLORS: { ink: RGB; muted: RGB; line: RGB; primary: RGB; danger: RGB; surface: RGB; emphasis: RGB } = {
  ink: [17, 24, 39],
  muted: [107, 114, 128],
  line: [229, 231, 235],
  primary: [4, 120, 87], // emerald-700
  danger: [185, 28, 28],
  surface: [243, 244, 246],
  emphasis: [17, 24, 39],
}

function setText(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2])
}
function setFill(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2])
}
function setDraw(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2])
}

function fmtTime(t: string | null) {
  if (!t) return "—"
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
}

function fmtDate(d: string) {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function generatePayslipPdf(data: GuardDetail) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 36
  let y = margin

  // ---------- Header ----------
  setFill(doc, COLORS.primary)
  doc.rect(0, 0, pageW, 70, "F")
  setText(doc, [255, 255, 255])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(COMPANY_NAME, margin, 32)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(COMPANY_TAGLINE, margin, 50)

  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  const slipTitle = `Payslip — ${data.monthLabel}`
  const slipTitleW = doc.getTextWidth(slipTitle)
  doc.text(slipTitle, pageW - margin - slipTitleW, 32)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  const generated = `Generated ${new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`
  const gw = doc.getTextWidth(generated)
  doc.text(generated, pageW - margin - gw, 50)

  y = 90
  setText(doc, COLORS.ink)

  // ---------- Profile block ----------
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(data.full_name, margin, y)
  y += 14

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  setText(doc, COLORS.muted)

  const meta: [string, string][] = [
    ["Email", data.email ?? "—"],
    ["Phone", data.phone ?? "—"],
    ["Site", data.site_name ? (data.site_address ? `${data.site_name} — ${data.site_address}` : data.site_name) : "Not assigned"],
    [
      "Shift",
      data.shift_start && data.shift_end ? `${data.shift_start} – ${data.shift_end}` : "Not set",
    ],
    ["Base salary", formatINR(data.base_salary)],
    [
      "Attendance",
      `${data.presentDaysThisMonth} present / ${WORKING_DAYS} working days`,
    ],
  ]
  const colW = (pageW - margin * 2) / 2
  meta.forEach((row, idx) => {
    const col = idx % 2
    const line = Math.floor(idx / 2)
    const x = margin + col * colW
    const cy = y + line * 16
    setText(doc, COLORS.muted)
    doc.text(`${row[0]}:`, x, cy)
    setText(doc, COLORS.ink)
    const labelW = doc.getTextWidth(`${row[0]}: `)
    const valueMaxW = colW - labelW - 8
    const lines = doc.splitTextToSize(row[1], valueMaxW)
    doc.text(lines[0] ?? "", x + labelW, cy)
  })
  y += Math.ceil(meta.length / 2) * 16 + 6

  // ---------- Salary breakdown (two-column) ----------
  setText(doc, COLORS.ink)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Salary breakdown", margin, y)
  y += 4

  // Build earnings + deductions tables in parallel rows
  const s = data.salary
  const earnings: [string, string][] = []
  earnings.push([`Basic (${s.basicPercent}% of gross)`, formatINR(s.basic)])
  if (s.daEnabled) earnings.push([`DA (${s.daPercent}% of Basic)`, formatINR(s.da)])
  if (s.hraEnabled) earnings.push([`HRA (${s.hraPercent}% of Basic)`, formatINR(s.hra)])
  if (s.ltaEnabled) earnings.push([`LTA (${s.ltaPercent}% of Basic)`, formatINR(s.lta)])
  if (s.specialAllowanceEnabled)
    earnings.push([`Special Allowance (${s.specialAllowancePercent}%)`, formatINR(s.specialAllowance)])
  if (s.bonusEnabled) earnings.push([`Bonus (${s.bonusPercent}% of Basic)`, formatINR(s.bonus)])
  if (s.otherAllowance > 0) earnings.push(["Other Allowance (balancer)", formatINR(s.otherAllowance)])

  const deductions: [string, string][] = []
  if (s.epfEnabled) deductions.push([`EPF (${s.epfPercent}% of Basic+DA)`, `- ${formatINR(s.epf)}`])
  if (s.esiEnabled) deductions.push([`ESI (${s.esiPercent}% of Gross)`, `- ${formatINR(s.esi)}`])
  if (s.ptEnabled) deductions.push(["Professional Tax", `- ${formatINR(s.pt)}`])
  if (s.otherDeductionEnabled && s.otherDeduction > 0) deductions.push(["Other deduction", `- ${formatINR(s.otherDeduction)}`])
  deductions.push(["Total deductions", `- ${formatINR(s.totalDeductions)}`])

  const tableY = y + 8

  autoTable(doc, {
    startY: tableY,
    margin: { left: margin },
    tableWidth: colW - 8,
    head: [["Earnings", "Amount"]],
    body: [...earnings, ["Earned (gross)", formatINR(s.earned)]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 5, lineColor: COLORS.line, textColor: COLORS.ink },
    headStyles: { fillColor: COLORS.surface, textColor: COLORS.ink, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 80 } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === earnings.length) {
        hook.cell.styles.fontStyle = "bold"
        hook.cell.styles.fillColor = [240, 253, 244] // emerald-50
      }
    },
  })

  autoTable(doc, {
    startY: tableY,
    margin: { left: margin + colW + 8 },
    tableWidth: colW - 8,
    head: [["Deductions", "Amount"]],
    body: deductions,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 5, lineColor: COLORS.line, textColor: COLORS.ink },
    headStyles: { fillColor: COLORS.surface, textColor: COLORS.ink, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 80 } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === deductions.length - 1) {
        hook.cell.styles.fontStyle = "bold"
        hook.cell.styles.fillColor = [254, 242, 242] // red-50
      }
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const earningsBottom = (doc as any).lastAutoTable?.finalY ?? tableY
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deductionsBottom = (doc as any).lastAutoTable?.finalY ?? tableY
  y = Math.max(earningsBottom, deductionsBottom) + 14

  // ---------- Net pay banner ----------
  setFill(doc, COLORS.primary)
  doc.roundedRect(margin, y, pageW - margin * 2, 38, 6, 6, "F")
  setText(doc, [255, 255, 255])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Net Payable", margin + 14, y + 24)
  doc.setFontSize(16)
  const netStr = formatINR(s.finalSalary)
  const netW = doc.getTextWidth(netStr)
  doc.text(netStr, pageW - margin - 14 - netW, y + 25)
  y += 50

  // ---------- Employer contribution ----------
  if (s.employerEpfEnabled || s.employerEpsEnabled || s.employerEsiEnabled) {
    setText(doc, COLORS.ink)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Employer contribution (for reference)", margin, y)
    y += 6
    const empBody: [string, string][] = []
    if (s.employerEpfEnabled) empBody.push([`EPF @ ${s.employerEpfPercent}% of Basic+DA`, formatINR(s.employerEpf)])
    if (s.employerEpsEnabled) empBody.push([`EPS @ ${s.employerEpsPercent}% of Basic+DA`, formatINR(s.employerEps)])
    if (s.employerEsiEnabled) empBody.push([`ESI @ ${s.employerEsiPercent}% of Gross`, formatINR(s.employerEsi)])
    empBody.push(["Total employer cost", formatINR(s.totalEmployerContribution)])

    autoTable(doc, {
      startY: y + 6,
      margin: { left: margin, right: margin },
      head: [["Component", "Amount"]],
      body: empBody,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 5, lineColor: COLORS.line, textColor: COLORS.ink },
      headStyles: { fillColor: COLORS.surface, textColor: COLORS.ink, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right", cellWidth: 100 } },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.row.index === empBody.length - 1) {
          hook.cell.styles.fontStyle = "bold"
        }
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y
    y += 14
  }

  // ---------- Attendance log ----------
  setText(doc, COLORS.ink)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`Attendance log — ${data.monthLabel}`, margin, y)
  y += 6

  const attBody = data.monthAttendance.length
    ? data.monthAttendance
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((row) => [
          fmtDate(row.date),
          row.site_name ?? "—",
          fmtTime(row.marked_at),
          row.status === "present" ? "Present" : row.status,
          row.latitude != null && row.longitude != null
            ? `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`
            : "—",
        ])
    : [["—", "No scans recorded for this month.", "", "", ""]]

  autoTable(doc, {
    startY: y + 6,
    margin: { left: margin, right: margin },
    head: [["Date", "Site", "Time", "Status", "Location"]],
    body: attBody,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 4, lineColor: COLORS.line, textColor: COLORS.ink },
    headStyles: { fillColor: COLORS.surface, textColor: COLORS.ink, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      2: { cellWidth: 70 },
      3: { cellWidth: 60 },
      4: { cellWidth: 110 },
    },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 3) {
        const v = String(hook.cell.raw ?? "")
        if (v === "Present") {
          hook.cell.styles.textColor = COLORS.primary
          hook.cell.styles.fontStyle = "bold"
        }
      }
    },
  })

  // ---------- Footer on every page ----------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc.internal as any).getNumberOfPages?.() ?? 1
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    setText(doc, COLORS.muted)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    const footer = `${COMPANY_NAME} — Confidential payroll document  ·  Page ${p} of ${pageCount}`
    const fw = doc.getTextWidth(footer)
    doc.text(footer, (pageW - fw) / 2, doc.internal.pageSize.getHeight() - 18)
  }

  const safeName = data.full_name.replace(/[^a-z0-9-]+/gi, "_")
  doc.save(`payslip_${safeName}_${data.month}.pdf`)
}
