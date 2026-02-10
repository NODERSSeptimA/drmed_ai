import { cn } from "@/lib/utils"

interface DiagnosisBlockProps {
  variant: "green" | "yellow" | "blue"
  label: string
  children: React.ReactNode
  code?: string
}

const variantStyles = {
  green: "bg-medgreen/5 border-medgreen/20",
  yellow: "bg-warm-bg border-warm/20",
  blue: "bg-blue-bg border-blue/20",
}

const dotStyles = {
  green: "bg-medgreen",
  yellow: "bg-warm",
  blue: "bg-blue",
}

const codeStyles = {
  green: "bg-medgreen/10 text-medgreen",
  yellow: "bg-warm-bg text-warm",
  blue: "bg-blue-bg text-blue",
}

export function DiagnosisBlock({ variant, label, children, code }: DiagnosisBlockProps) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-2", variantStyles[variant])}>
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", dotStyles[variant])} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
      {code && (
        <span className={cn("inline-block text-xs font-mono px-2 py-0.5 rounded-md", codeStyles[variant])}>
          МКБ-10: {code}
        </span>
      )}
    </div>
  )
}
