"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { FileText, Building2, Calendar, MapPin, Pencil, Printer, Download, Save, X, ArrowLeft, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarNav } from "@/components/medical-history/sidebar-nav"
import { MobileSectionNav } from "@/components/medical-history/mobile-section-nav"
import { SectionRenderer } from "@/components/medical-history/section-renderer"
import { AiFillBar } from "@/components/medical-history/ai-fill-bar"

interface TemplateSection {
  id: string
  title: string
  icon: string
  fields?: Array<{
    id: string
    label: string
    type: string
    options?: unknown[]
    subsections?: Array<{ id: string; label: string; type?: string }>
  }>
}

interface MedicalHistoryResponse {
  id: string
  data: Record<string, Record<string, unknown>>
  status: string
  visitType: string
  examinationDate: string
  patient: {
    firstName: string
    lastName: string
    middleName?: string | null
  }
  template: {
    title: string
    schema: { sections: TemplateSection[] }
  }
  doctor: { name: string }
}

export default function MedicalHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const [history, setHistory] = useState<MedicalHistoryResponse | null>(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Record<string, Record<string, unknown>>>({})
  const [saving, setSaving] = useState(false)
  const [creatingVoiceSession, setCreatingVoiceSession] = useState(false)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/medical-history/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setHistory(data)
      setFormData(data.data || {})
    }
  }, [params.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Autosave draft
  useEffect(() => {
    if (!editing || !history) return

    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await fetch(`/api/medical-history/${history.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData }),
      })
    }, 2000)

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [formData, editing, history])

  async function handleSave() {
    if (!history) return
    setSaving(true)
    await fetch(`/api/medical-history/${history.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: formData, status: "completed" }),
    })
    setSaving(false)
    setEditing(false)
    loadHistory()
  }

  function handleFieldChange(sectionId: string, fieldId: string, value: unknown) {
    setFormData((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldId]: value,
      },
    }))
  }

  async function handleExport() {
    const res = await fetch(`/api/medical-history/${params.id}/export`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `осмотр_${history?.patient.lastName || ""}_${format(new Date(), "dd-MM-yyyy")}.docx`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function handleVoiceSession() {
    if (!history) return
    setCreatingVoiceSession(true)
    try {
      const res = await fetch("/api/voice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicalHistoryId: history.id }),
      })
      if (res.ok) {
        const session = await res.json()
        router.push(`/voice-session/${session.id}`)
      }
    } finally {
      setCreatingVoiceSession(false)
    }
  }

  if (!history) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  const sections = history.template.schema.sections

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-card px-4 lg:px-8 xl:px-20 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => router.push("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-display text-xl lg:text-2xl font-medium flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {history.template.title}
                <Badge variant="outline" className={history.visitType === "home"
                  ? "border-amber-500/30 text-amber-600 bg-amber-50 text-xs font-normal gap-1"
                  : "border-medgreen/30 text-medgreen bg-medgreen/5 text-xs font-normal gap-1"
                }>
                  {history.visitType === "home" ? <><Car className="w-3 h-3" /> Выездной</> : <><Building2 className="w-3 h-3" /> В клинике</>}
                </Badge>
              </h1>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> ООО «Династия-18»
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(history.examinationDate), "dd.MM.yyyy", { locale: ru })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {history.doctor.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setEditing(false); setFormData(history.data || {}) }}>
                  <X className="w-4 h-4" /> <span className="hidden sm:inline">Отмена</span>
                </Button>
                <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4" /> <span className="hidden sm:inline">{saving ? "Сохранение..." : "Сохранить"}</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Редактировать</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Печать</span>
                </Button>
                <Button size="sm" className="gap-1.5" onClick={handleExport}>
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Экспорт в Word</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 lg:px-8 xl:px-20 py-6">
        <MobileSectionNav sections={sections} />
        <div className="flex gap-6">
          <SidebarNav sections={sections} />

          <div className="flex-1 min-w-0 space-y-6">
            {/* AI Fill Bar */}
            <div className="sticky top-[73px] z-30 bg-background pb-3">
              <AiFillBar
                sections={sections.map((s) => ({
                  id: s.id,
                  title: s.title,
                  fields: s.fields?.map((f) => ({
                    id: f.id,
                    label: f.label,
                    type: f.type,
                    options: f.options,
                  })),
                }))}
                onFill={(data) => {
                  setFormData((prev) => {
                    const merged = { ...prev }
                    for (const [sectionId, fields] of Object.entries(data)) {
                      merged[sectionId] = { ...merged[sectionId], ...fields }
                    }
                    return merged
                  })
                  setEditing(true)
                }}
                onVoiceSession={handleVoiceSession}
                voiceSessionLoading={creatingVoiceSession}
              />
            </div>

            {/* Sections */}
            {sections.map((section, index) => (
              <SectionRenderer
                key={section.id}
                section={section}
                sectionIndex={index}
                data={formData[section.id] || {}}
                editing={editing}
                onFieldChange={(fieldId, value) => handleFieldChange(section.id, fieldId, value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
