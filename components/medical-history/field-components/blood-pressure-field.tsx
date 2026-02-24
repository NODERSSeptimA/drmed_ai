"use client"

import { Input } from "@/components/ui/input"

interface BloodPressureFieldProps {
  label: string
  value: string
  editing: boolean
  onChange: (value: string) => void
}

export function BloodPressureField({ label, value, editing, onChange }: BloodPressureFieldProps) {
  const parts = value.split("/")
  const systolic = parts[0] || ""
  const diastolic = parts[1] || ""

  function handleChange(sys: string, dia: string) {
    onChange(sys || dia ? `${sys}/${dia}` : "")
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">{value || "\u2014"}</span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={40}
          max={300}
          placeholder="120"
          value={systolic}
          onChange={(e) => handleChange(e.target.value, diastolic)}
          className="w-20 text-center"
        />
        <span className="text-lg font-medium text-muted-foreground">/</span>
        <Input
          type="number"
          min={30}
          max={200}
          placeholder="80"
          value={diastolic}
          onChange={(e) => handleChange(systolic, e.target.value)}
          className="w-20 text-center"
        />
        <span className="text-xs text-muted-foreground ml-1">мм рт. ст.</span>
      </div>
    </div>
  )
}
