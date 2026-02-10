import { cn } from "@/lib/utils"

interface TimelineEntry {
  date: string
  description: string
  current?: boolean
}

interface TimelineDisplayProps {
  entries: TimelineEntry[]
}

export function TimelineDisplay({ entries }: TimelineDisplayProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={cn(
            "shrink-0 rounded-xl p-4 min-w-[180px] border",
            entry.current
              ? "bg-medgreen/5 border-medgreen/20"
              : "bg-secondary/50 border-border"
          )}
        >
          <p className={cn(
            "text-sm font-mono font-medium mb-1",
            entry.current ? "text-medgreen" : ""
          )}>
            {entry.date}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
        </div>
      ))}
    </div>
  )
}
