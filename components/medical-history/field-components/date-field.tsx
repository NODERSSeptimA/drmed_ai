"use client"

import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface DateFieldProps {
  label: string
  value: string
  editing: boolean
  onChange: (value: string) => void
}

export function DateField({ label, value, editing, onChange }: DateFieldProps) {
  const displayValue = value
    ? (() => {
        try {
          return format(new Date(value), "dd.MM.yyyy", { locale: ru })
        } catch {
          return value
        }
      })()
    : "—"

  if (editing) {
    return (
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{displayValue}</span>
    </div>
  )
}
