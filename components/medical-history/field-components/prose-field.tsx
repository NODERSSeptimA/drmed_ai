"use client"

import { Textarea } from "@/components/ui/textarea"

interface ProseFieldProps {
  label?: string
  value: string
  editing: boolean
  onChange: (value: string) => void
}

export function ProseField({ label, value, editing, onChange }: ProseFieldProps) {
  if (editing) {
    return (
      <div className="space-y-1">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
    )
  }

  return (
    <div>
      {label && <span className="text-xs text-muted-foreground block mb-1">{label}</span>}
      <p className="text-sm leading-relaxed whitespace-pre-line">{value || "—"}</p>
    </div>
  )
}
