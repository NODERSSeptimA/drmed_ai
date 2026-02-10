interface VitalsDisplayProps {
  vitals: {
    bloodPressure?: string
    heartRate?: string
    temperature?: string
    bmi?: string
  }
}

export function VitalsDisplay({ vitals }: VitalsDisplayProps) {
  const items = [
    { label: "АД, мм рт. ст.", value: vitals.bloodPressure },
    { label: "ЧСС, уд/мин", value: vitals.heartRate },
    { label: "Температура", value: vitals.temperature ? `${vitals.temperature}°` : undefined },
    { label: "ИМТ", value: vitals.bmi, warning: vitals.bmi ? parseFloat(vitals.bmi) < 18.5 : false },
  ].filter((item) => item.value)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`bg-secondary/50 rounded-xl p-3 text-center ${item.warning ? "border border-warm/30" : ""}`}
        >
          <p className="text-xl font-mono font-medium">{item.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {item.label}
            {item.warning && " (дефицит)"}
          </p>
        </div>
      ))}
    </div>
  )
}
