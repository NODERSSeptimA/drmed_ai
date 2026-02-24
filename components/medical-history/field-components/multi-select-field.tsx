"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

function parseMultiSelectValue(value: string, options: string[]): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch { /* not JSON — legacy comma-separated format */ }
  // Legacy: try to match known options greedily
  const result: string[] = []
  let remaining = value
  while (remaining.length > 0) {
    remaining = remaining.replace(/^[\s,]+/, "")
    if (!remaining) break
    const match = options
      .filter((o) => remaining.toLowerCase().startsWith(o.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0]
    if (match) {
      result.push(match)
      remaining = remaining.slice(match.length)
    } else {
      const idx = remaining.indexOf(",")
      if (idx === -1) {
        result.push(remaining.trim())
        break
      }
      result.push(remaining.slice(0, idx).trim())
      remaining = remaining.slice(idx + 1)
    }
  }
  return result.filter(Boolean)
}

interface MultiSelectFieldProps {
  label: string
  value: string
  editing: boolean
  options: string[]
  onChange: (value: string) => void
}

export function MultiSelectField({ label, value, editing, options, onChange }: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedItems = parseMultiSelectValue(value, options)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function isActive(option: string) {
    return selectedItems.some((item) => item.toLowerCase() === option.toLowerCase())
  }

  function toggle(option: string) {
    if (isActive(option)) {
      const next = selectedItems.filter((item) => item.toLowerCase() !== option.toLowerCase())
      onChange(JSON.stringify(next))
    } else {
      onChange(JSON.stringify([...selectedItems, option]))
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">{parseMultiSelectValue(value, options).join(", ") || "—"}</span>
      </div>
    )
  }

  return (
    <div className="space-y-1" ref={ref}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto min-h-9 py-1.5"
          onClick={() => setOpen(!open)}
        >
          <span className="text-left truncate">
            {selectedItems.length > 0
              ? selectedItems.join(", ")
              : <span className="text-muted-foreground">Выберите</span>
            }
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            <div className="max-h-60 overflow-y-auto p-1">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => toggle(option)}
                >
                  <div className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                    isActive(option) ? "bg-primary text-primary-foreground" : "opacity-50"
                  )}>
                    {isActive(option) && <Check className="h-3 w-3" />}
                  </div>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
