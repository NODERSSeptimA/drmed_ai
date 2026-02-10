import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  change?: string
  icon?: React.ReactNode
  className?: string
}

export function MetricCard({ label, value, change, icon, className }: MetricCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5 flex flex-col gap-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-mono font-medium">{value}</span>
      {change && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span>{change}</span>
        </div>
      )}
    </div>
  )
}
