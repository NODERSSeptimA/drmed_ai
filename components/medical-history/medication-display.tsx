interface Medication {
  name: string
  group: string
  dose: string
  schedule: string
}

interface MedicationDisplayProps {
  medications: Medication[]
}

export function MedicationDisplay({ medications }: MedicationDisplayProps) {
  return (
    <div className="space-y-3">
      {medications.map((med, i) => (
        <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-xl p-4 border border-border">
          <div>
            <p className="text-sm font-medium">{med.name}</p>
            <p className="text-xs text-muted-foreground">{med.group}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono font-medium">{med.dose}</p>
            <p className="text-xs text-muted-foreground">{med.schedule}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
