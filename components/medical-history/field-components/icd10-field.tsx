"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ChevronsUpDown, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Icd10Entry {
  code: string
  name: string
}

interface ICD10FieldProps {
  label: string
  value: string
  editing: boolean
  onChange: (value: string) => void
}

export function ICD10Field({ label, value, editing, onChange }: ICD10FieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Icd10Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Full code with F prefix for display
  const fullCode = value ? (value.startsWith("F") ? value : `F${value}`) : ""

  // Load display name for current value
  useEffect(() => {
    let cancelled = false
    const codeToSearch = fullCode
    if (!codeToSearch) return
    fetch(`/api/icd10?search=${encodeURIComponent(codeToSearch)}&limit=5`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return
        const match = res.data?.find(
          (item: Icd10Entry) => item.code === codeToSearch
        )
        setDisplayName(match?.name || "")
      })
      .catch(() => {
        if (!cancelled) setDisplayName("")
      })
    return () => { cancelled = true }
  }, [fullCode])

  const doSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    fetch(`/api/icd10?search=${encodeURIComponent(query)}&limit=20`)
      .then((r) => r.json())
      .then((res) => setResults(res.data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (query: string) => {
    setSearch(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
  }

  const handleSelect = (code: string) => {
    // Store without F prefix (legacy format)
    onChange(code.replace(/^F/, ""))
    setOpen(false)
    setSearch("")
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">
          {fullCode ? (
            <>
              <span className="font-mono">{fullCode}</span>
              {displayName && (
                <span className="text-muted-foreground"> — {displayName}</span>
              )}
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-9"
          >
            {fullCode ? (
              <span className="truncate">
                <span className="font-mono">{fullCode}</span>
                {displayName && ` — ${displayName}`}
              </span>
            ) : (
              <span className="text-muted-foreground">Выберите код МКБ-10...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск по коду или названию..."
              value={search}
              onValueChange={handleSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <CommandEmpty>
                  {search.trim() ? "Ничего не найдено" : "Начните вводить код или название"}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((item) => (
                    <CommandItem
                      key={item.code}
                      value={item.code}
                      onSelect={() => handleSelect(item.code)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          fullCode === item.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-mono text-xs mr-2 shrink-0">{item.code}</span>
                      <span className="truncate text-sm">{item.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
