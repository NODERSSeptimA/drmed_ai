"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface QuickFillFieldProps {
  label: string
  value: string
  editing: boolean
  onChange: (value: string) => void
  options: string[]
  multiSelect?: boolean
}

export function QuickFillField({ label, value, editing, onChange, options, multiSelect }: QuickFillFieldProps) {
  if (!editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">{value || "—"}</span>
      </div>
    )
  }

  const selectedItems = multiSelect
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  function isActive(option: string) {
    if (multiSelect) {
      return selectedItems.some((item) => item.toLowerCase() === option.toLowerCase())
    }
    return value.trim().toLowerCase() === option.toLowerCase()
  }

  function handleChipClick(option: string) {
    if (multiSelect) {
      if (isActive(option)) {
        const next = selectedItems.filter((item) => item.toLowerCase() !== option.toLowerCase())
        onChange(next.join(", "))
      } else {
        onChange([...selectedItems, option].join(", "))
      }
    } else {
      onChange(isActive(option) ? "" : option)
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleChipClick(option)}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer border ${
              isActive(option)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {multiSelect ? (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="resize-none"
        />
      ) : (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
