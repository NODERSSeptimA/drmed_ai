"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  User, ClipboardList, MessageCircle, History, Brain, Activity,
  TrendingUp, FileCheck, Stethoscope, TestTubes, Pill, CalendarCheck, Calendar
} from "lucide-react"

const iconMap: Record<string, React.ElementType> = {
  "user": User,
  "clipboard-list": ClipboardList,
  "message-circle": MessageCircle,
  "history": History,
  "brain": Brain,
  "activity": Activity,
  "trending-up": TrendingUp,
  "file-check": FileCheck,
  "stethoscope": Stethoscope,
  "test-tubes": TestTubes,
  "pill": Pill,
  "calendar-check": CalendarCheck,
  "calendar": Calendar,
}

interface Section {
  id: string
  title: string
  icon: string
}

interface SidebarNavProps {
  sections: Section[]
}

export function SidebarNav({ sections }: SidebarNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          const topmost = visible.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
          )
          setActiveSection(topmost.target.id)
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    )

    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sections])

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      setActiveSection(id)
    }
  }

  return (
    <aside className="sticky top-[73px] h-fit w-[220px] shrink-0 hidden lg:block">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3 px-3">
        Разделы
      </p>
      <div className="space-y-0.5">
        {sections.map((section) => {
          const Icon = iconMap[section.icon] || User
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left",
                isActive
                  ? "bg-medgreen/10 text-medgreen font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{section.title}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
