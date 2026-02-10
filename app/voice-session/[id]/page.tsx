"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Mic,
  ArrowLeft,
  CheckCircle2,
  Circle,
  ArrowRight,
  Pause,
  Play,
  Square,
  Loader2,
  Volume2,
  Bot,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useVoiceSession, type VoiceSessionPhase } from "@/lib/hooks/use-voice-session"

interface TemplateSection {
  id: string
  title: string
  icon?: string
  fields?: { id: string; label: string; type: string; options?: unknown[] }[]
}

interface VoiceSessionData {
  id: string
  status: string
  medicalHistoryId: string
  medicalHistory: {
    id: string
    patient: { firstName: string; lastName: string; middleName?: string | null; birthDate: string }
    template: {
      title: string
      schema: { sections: TemplateSection[] }
    }
  }
}

function phaseLabel(phase: VoiceSessionPhase): string {
  switch (phase) {
    case "idle": return "Готов к началу"
    case "playing": return "AI говорит..."
    case "listening": return "Слушаю..."
    case "processing": return "AI обрабатывает..."
    case "paused": return "Пауза"
    case "completed": return "Сессия завершена"
    case "error": return "Ошибка"
  }
}

export default function VoiceSessionPage() {
  const params = useParams()
  const router = useRouter()
  const [sessionData, setSessionData] = useState<VoiceSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const dialogEndRef = useRef<HTMLDivElement>(null)

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/voice-session/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setSessionData(data)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const sections: TemplateSection[] = sessionData?.medicalHistory.template.schema.sections || []

  // Build initial data from patient card (ФИО + дата рождения)
  const patientInitialData = sessionData ? (() => {
    const p = sessionData.medicalHistory.patient
    const fullName = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ")
    const birthDate = p.birthDate ? p.birthDate.split("T")[0] : ""
    return {
      patient_info: {
        full_name: fullName,
        birth_date: birthDate,
      },
    }
  })() : undefined

  const voiceSession = useVoiceSession({
    sessionId: (params.id as string) || "",
    medicalHistoryId: sessionData?.medicalHistoryId || "",
    templateSections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      fields: s.fields?.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        options: f.options,
      })),
    })),
    initialData: patientInitialData,
  })

  // Auto-scroll dialog
  useEffect(() => {
    dialogEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [voiceSession.conversationLog, voiceSession.partialTranscript])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Сессия не найдена</div>
      </div>
    )
  }

  const patient = sessionData.medicalHistory.patient
  const patientName = [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(" ")
  const { phase, conversationLog, progress, error, currentSection, completedSections, partialTranscript } = voiceSession

  const isActive = phase !== "idle" && phase !== "completed" && phase !== "paused"

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 lg:px-8 xl:px-20 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/medical-history/${sessionData.medicalHistoryId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-xl font-medium">Голосовая сессия</h1>
              <p className="text-xs text-muted-foreground">
                {patientName} &middot; {sessionData.medicalHistory.template.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
              phase === "completed"
                ? "bg-green-500/10 text-green-600"
                : phase === "error"
                ? "bg-red-500/10 text-red-600"
                : phase === "listening"
                ? "bg-red-500/10 text-red-600"
                : isActive
                ? "bg-blue-500/10 text-blue-600"
                : "bg-muted text-muted-foreground"
            }`}>
              {phase === "listening" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              {phase === "playing" && <Volume2 className="w-3 h-3" />}
              {phase === "processing" && <Loader2 className="w-3 h-3 animate-spin" />}
              {phaseLabel(phase)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {(isActive || phase === "paused") && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Прогресс</span>
              <span>{progress.completed}/{progress.total} секций</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-medgreen rounded-full transition-all duration-500"
                style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections sidebar */}
        <div className="w-64 border-r border-border bg-card/50 p-4 overflow-y-auto hidden lg:block">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Секции</h3>
          <div className="space-y-1">
            {sections.map((section) => {
              const isCompleted = completedSections.includes(section.id)
              const isCurrent = currentSection === section.id
              return (
                <div
                  key={section.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isCurrent
                      ? "bg-medgreen/10 text-medgreen font-medium"
                      : isCompleted
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-medgreen shrink-0" />
                  ) : isCurrent ? (
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{section.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dialog area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
            {phase === "idle" && conversationLog.length === 0 && (
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-medgreen/10 flex items-center justify-center mx-auto">
                    <Mic className="w-8 h-8 text-medgreen" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-medium">Начать голосовую сессию</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      AI задаст вопросы по {sections.length} секциям шаблона.
                      Отвечайте голосом и говорите <strong>&laquo;Следующий вопрос&raquo;</strong> когда закончите ответ.
                    </p>
                  </div>
                  <Button onClick={voiceSession.start} className="gap-2">
                    <Play className="w-4 h-4" /> Начать
                  </Button>
                </div>
              </div>
            )}

            {conversationLog.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "ai" ? "bg-medgreen/10" : "bg-blue-500/10"
                }`}>
                  {msg.role === "ai" ? (
                    <Bot className="w-4 h-4 text-medgreen" />
                  ) : (
                    <User className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "ai"
                    ? "bg-card border border-border"
                    : "bg-blue-500/10 text-foreground"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Partial transcript — live preview of what doctor is saying */}
            {phase === "listening" && partialTranscript && (
              <div className="flex gap-3 flex-row-reverse">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-blue-500/5 text-muted-foreground border border-dashed border-blue-200">
                  {partialTranscript}
                  <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-1 align-middle rounded-full" />
                </div>
              </div>
            )}

            {phase === "processing" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-medgreen/10">
                  <Bot className="w-4 h-4 text-medgreen" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                  Обрабатываю ответ...
                </div>
              </div>
            )}

            {phase === "completed" && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-medgreen mx-auto" />
                  <h3 className="font-display text-lg font-medium">Сессия завершена</h3>
                  <p className="text-sm text-muted-foreground">
                    Данные сохранены в медицинскую историю.
                  </p>
                  <Button
                    onClick={() => router.push(`/medical-history/${sessionData.medicalHistoryId}`)}
                    className="gap-2"
                  >
                    Перейти к осмотру
                  </Button>
                </div>
              </div>
            )}

            <div ref={dialogEndRef} />
          </div>

          {/* Controls */}
          {phase !== "idle" && phase !== "completed" && (
            <div className="border-t border-border bg-card px-4 lg:px-6 py-4">
              {error && (
                <p className="text-xs text-red-500 mb-2">{error}</p>
              )}
              <div className="flex items-center justify-center gap-3">
                {phase === "listening" ? (
                  <>
                    <Button variant="outline" size="sm" className="gap-2" onClick={voiceSession.pauseSession}>
                      <Pause className="w-4 h-4" /> Пауза
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-600 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Слушаю... скажите &laquo;Следующий вопрос&raquo;
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={voiceSession.completeSession}>
                      <Square className="w-4 h-4" /> Завершить
                    </Button>
                  </>
                ) : phase === "playing" ? (
                  <Button variant="outline" size="sm" className="gap-2" onClick={voiceSession.pauseSession}>
                    <Pause className="w-4 h-4" /> Пауза
                  </Button>
                ) : phase === "paused" ? (
                  <>
                    <Button size="sm" className="gap-2" onClick={voiceSession.resumeSession}>
                      <Play className="w-4 h-4" /> Продолжить
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={voiceSession.completeSession}>
                      <Square className="w-4 h-4" /> Завершить
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" disabled className="gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {phaseLabel(phase)}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
