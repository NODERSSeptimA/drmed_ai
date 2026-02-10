"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SelectFieldProps {
  label: string
  value: string
  editing: boolean
  options: Array<{ value: string; label: string }> | string[]
  onChange: (value: string) => void
}

export function SelectField({ label, value, editing, options, onChange }: SelectFieldProps) {
  const normalizedOptions = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  )

  const displayValue = normalizedOptions.find((o) => o.value === value)?.label || value || "—"

  if (editing) {
    return (
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
          <SelectContent>
            {normalizedOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
