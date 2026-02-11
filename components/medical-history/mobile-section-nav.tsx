"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Section {
  id: string
  title: string
  icon: string
}

interface MobileSectionNavProps {
  sections: Section[]
}

export function MobileSectionNav({ sections }: MobileSectionNavProps) {
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
    <div className="lg:hidden sticky top-[72px] z-40 bg-background border-b border-border -mx-4 px-4 overflow-hidden">
      <div className="flex gap-2 py-2 overflow-x-auto no-scrollbar">
        {sections.map((section, i) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              activeSection === section.id
                ? "bg-medgreen/15 text-medgreen"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {i + 1}. {section.title}
          </button>
        ))}
      </div>
    </div>
  )
}
