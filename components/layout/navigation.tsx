"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { HeartPulse, Search, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface NavigationProps {
  userName: string
}

const navLinks = [
  { href: "/", label: "Панель" },
  { href: "/patients", label: "Пациенты" },
  { href: "/voice-session/new", label: "AI Ассистент" },
]

export function Navigation({ userName }: NavigationProps) {
  const pathname = usePathname()

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <nav className="flex items-center justify-between h-[72px] px-6 lg:px-20 bg-card border-b border-border sticky top-0 z-50">
      <div className="flex items-center gap-8 lg:gap-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-primary flex items-center justify-center">
            <HeartPulse className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-display text-[22px] font-medium tracking-tight hidden sm:inline">
            MedAI
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card text-sm text-muted-foreground">
          <Search className="w-4 h-4" />
          <span>Поиск...</span>
        </div>
        <Avatar className="w-10 h-10 bg-border">
          <AvatarFallback className="text-xs font-semibold text-muted-foreground bg-secondary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </nav>
  )
}
