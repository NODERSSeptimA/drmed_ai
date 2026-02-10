"use client"

import { useState, useCallback } from "react"
import { Sparkles, Mic, Upload, Camera, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder"

interface AiFillBarProps {
  sections?: {
    id: string
    title: string
    fields?: {
      id: string
      label: string
      type: string
      options?: unknown[]
    }[]
  }[]
  onFill?: (data: Record<string, Record<string, unknown>>) => void
}

export function AiFillBar({ sections, onFill }: AiFillBarProps) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onTranscribed = useCallback((transcribedText: string) => {
    setText((prev) => (prev ? prev + " " + transcribedText : transcribedText))
    setExpanded(true)
  }, [])

  const { isRecording, isTranscribing, startRecording, stopRecording, error: voiceError } = useVoiceRecorder({ onTranscribed })

  async function handleFill() {
    if (!text.trim() || !sections || !onFill) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/ai/fill-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sections }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Ошибка заполнения")
        return
      }

      const { data } = await res.json()
      onFill(data)
      setText("")
      setExpanded(false)
    } catch {
      setError("Ошибка соединения с сервером")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-medgreen/5 border border-medgreen/15 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-medgreen/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-medgreen" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">AI Заполнение осмотра психиатра</p>
          <p className="text-xs text-muted-foreground">Надиктуйте осмотр — AI заполнит все разделы по шаблону клиники «Династия»</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-xs", isRecording && "border-red-500 text-red-500")}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Mic className={cn("w-3 h-3", isRecording && "animate-pulse")} />
            )}
            {isRecording ? "Стоп" : isTranscribing ? "Распознаю..." : "Голос"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Upload className="w-3 h-3" /> Файлы
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Camera className="w-3 h-3" /> Фото
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-medgreen"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Текст
          </Button>
        </div>
      </div>

      {voiceError && !expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{voiceError}</p>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Вставьте или введите текст осмотра пациента..."
            className={cn(
              "w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-sm",
              "resize-y outline-none focus:ring-2 focus:ring-medgreen/30 placeholder:text-muted-foreground"
            )}
            disabled={loading}
          />
          {(error || voiceError) && <p className="text-xs text-red-500">{error || voiceError}</p>}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleFill}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {loading ? "AI заполняет..." : "Заполнить по тексту"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
