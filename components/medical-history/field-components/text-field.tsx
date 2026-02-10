"use client"

import { Input } from "@/components/ui/input"

interface TextFieldProps {
  label: string
  value: string
  editing: boolean
  onChange: (value: string) => void
}

export function TextField({ label, value, editing, onChange }: TextFieldProps) {
  if (editing) {
    return (
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  )
}
