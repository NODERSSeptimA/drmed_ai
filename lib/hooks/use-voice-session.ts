"use client"

import { useState, useRef, useEffect } from "react"
import type {
  VoiceSessionMessage,
  NextQuestionRequest,
  NextQuestionResponse,
} from "@/lib/ai/types"

export type VoiceSessionPhase =
  | "idle"
  | "playing"
  | "listening"
  | "processing"
  | "paused"
  | "completed"
  | "error"

interface TemplateSection {
  id: string
  title: string
  fields?: { id: string; label: string; type: string; options?: unknown[] }[]
}

interface UseVoiceSessionOptions {
  sessionId: string
  medicalHistoryId: string
  templateSections: TemplateSection[]
  initialData?: Record<string, Record<string, unknown>>
}

const CHUNK_DURATION_MS = 15000

// Minimal silent WAV — used to "unlock" Audio element on mobile browsers
// during user gesture so later programmatic play() calls are allowed
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
const TRIGGER_NEXT = "следующий вопрос"
const TRIGGER_END = "завершить сессию"

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t
  }
  return ""
}

function detectTrigger(text: string): "next" | "end" | null {
  const n = text.toLowerCase().replace(/[.!?,;:\s]+$/, "").trim()
  if (n.endsWith(TRIGGER_NEXT)) return "next"
  if (n.includes(TRIGGER_END)) return "end"
  return null
}

function stripTrigger(text: string): string {
  return text
    .replace(/[,.\s]*следующий вопрос[.!?,;\s]*$/i, "")
    .replace(/[,.\s]*завершить сессию[.!?,;\s]*$/i, "")
    .trim()
}

function recordChunk(stream: MediaStream, durationMs: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!stream.active) { resolve(null); return }
    try {
      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      const timerId = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop()
      }, durationMs)

      recorder.onstop = () => {
        clearTimeout(timerId)
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" })
        resolve(blob.size > 0 ? blob : null)
      }

      recorder.onerror = () => {
        clearTimeout(timerId)
        resolve(null)
      }

      recorder.start()
    } catch {
      resolve(null)
    }
  })
}

async function transcribeBlob(blob: Blob): Promise<string> {
  if (!blob || blob.size === 0) return ""
  const mimeType = blob.type || "audio/webm"
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm"

  const formData = new FormData()
  formData.append("audio", blob, `recording.${ext}`)

  try {
    const res = await fetch("/api/ai/speech-to-text", {
      method: "POST",
      body: formData,
    })
    if (!res.ok) return ""
    const { text } = await res.json()
    return text || ""
  } catch {
    return ""
  }
}

export function useVoiceSession({
  sessionId,
  medicalHistoryId,
  templateSections,
  initialData,
}: UseVoiceSessionOptions) {
  const [phase, setPhase] = useState<VoiceSessionPhase>("idle")
  const [conversationLog, setConversationLog] = useState<VoiceSessionMessage[]>([])
  const [filledData, setFilledData] = useState<Record<string, Record<string, unknown>>>({})
  const [currentSection, setCurrentSection] = useState<string>("")
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [progress, setProgress] = useState({ completed: 0, total: templateSections.length })
  const [error, setError] = useState<string | null>(null)
  const [partialTranscript, setPartialTranscript] = useState<string>("")

  // Refs for async access
  const isListeningRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const conversationLogRef = useRef<VoiceSessionMessage[]>([])
  const filledDataRef = useRef<Record<string, Record<string, unknown>>>({})
  const currentSectionRef = useRef("")

  // Function refs to break circular deps
  const playQuestionRef = useRef<(text: string) => Promise<void>>(async () => {})
  const fetchNextQuestionRef = useRef<(log: VoiceSessionMessage[], data: Record<string, Record<string, unknown>>) => Promise<void>>(async () => {})
  const startListeningRef = useRef<() => Promise<void>>(async () => {})
  const completeSessionInternalRef = useRef<() => Promise<void>>(async () => {})

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const updateConversationLog = (updater: (prev: VoiceSessionMessage[]) => VoiceSessionMessage[]) => {
    setConversationLog((prev) => {
      const next = updater(prev)
      conversationLogRef.current = next
      return next
    })
  }

  const updateFilledData = (data: Record<string, Record<string, unknown>>) => {
    filledDataRef.current = data
    setFilledData(data)
  }

  // Play TTS audio, resolves when playback ends.
  // Reuses the unlocked Audio element from audioRef (unlocked in start/resume
  // during user gesture) so mobile browsers allow programmatic playback.
  const playQuestion = async (text: string): Promise<void> => {
    setPhase("playing")
    try {
      const res = await fetch("/api/ai/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error("TTS error")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      return new Promise<void>((resolve) => {
        const audio = audioRef.current || new Audio()
        audioRef.current = audio
        audio.onended = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.src = url
        audio.play().catch(() => {
          URL.revokeObjectURL(url)
          resolve()
        })
      })
    } catch {
      // If TTS fails, just continue
    }
  }
  playQuestionRef.current = playQuestion

  // Fetch next question from AI, play it, then start listening
  const fetchNextQuestion = async (
    log: VoiceSessionMessage[],
    data: Record<string, Record<string, unknown>>
  ) => {
    setPhase("processing")
    setError(null)
    try {
      const payload: NextQuestionRequest = {
        sessionId,
        conversationLog: log,
        filledData: data,
        templateSections,
      }

      const res = await fetch("/api/ai/voice-session/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Next question error")

      const result: NextQuestionResponse = await res.json()

      updateFilledData(result.filledData)
      setCurrentSection(result.currentSection)
      currentSectionRef.current = result.currentSection
      setProgress(result.progress)

      const sectionIds = templateSections.map((s) => s.id)
      const newCompleted = sectionIds.filter(
        (id) => result.filledData[id] && Object.keys(result.filledData[id]).length > 0
      )
      setCompletedSections(newCompleted)

      if (result.isComplete) {
        await fetch(`/api/medical-history/${medicalHistoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: result.filledData }),
        })
        await fetch(`/api/voice-session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
        setPhase("completed")
        return
      }

      // Add AI message
      const aiMessage: VoiceSessionMessage = {
        role: "ai",
        text: result.question,
        timestamp: new Date().toISOString(),
        section: result.currentSection,
      }
      updateConversationLog((prev) => [...prev, aiMessage])

      // Play question, then auto-start listening
      await playQuestionRef.current(result.question)
      await startListeningRef.current()
    } catch {
      setError("Ошибка получения следующего вопроса")
      setPhase("error")
    }
  }
  fetchNextQuestionRef.current = fetchNextQuestion

  // Continuous listening loop: record 5s chunks, transcribe, check for trigger
  const startListening = async () => {
    setError(null)
    isListeningRef.current = true
    setPartialTranscript("")
    let accumulated = ""

    // Get mic access
    try {
      if (!streamRef.current || !streamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      }
    } catch {
      setError("Нет доступа к микрофону")
      setPhase("error")
      return
    }

    setPhase("listening")

    while (isListeningRef.current) {
      const blob = await recordChunk(streamRef.current!, CHUNK_DURATION_MS)
      if (!isListeningRef.current) break
      if (!blob) continue

      const text = await transcribeBlob(blob)
      if (!isListeningRef.current) break
      if (!text.trim()) continue

      accumulated += (accumulated ? " " : "") + text.trim()
      setPartialTranscript(accumulated)

      const trigger = detectTrigger(accumulated)

      if (trigger === "end") {
        isListeningRef.current = false
        stopStream()
        // Save whatever we have
        const cleanText = stripTrigger(accumulated)
        if (cleanText) {
          const doctorMessage: VoiceSessionMessage = {
            role: "doctor",
            text: cleanText,
            timestamp: new Date().toISOString(),
            section: currentSectionRef.current,
          }
          updateConversationLog((prev) => [...prev, doctorMessage])
        }
        setPartialTranscript("")
        await completeSessionInternalRef.current()
        return
      }

      if (trigger === "next") {
        isListeningRef.current = false
        stopStream()
        const cleanText = stripTrigger(accumulated)
        setPartialTranscript("")

        if (!cleanText) {
          // Empty answer — restart listening
          await startListeningRef.current()
          return
        }

        // Add doctor message
        const doctorMessage: VoiceSessionMessage = {
          role: "doctor",
          text: cleanText,
          timestamp: new Date().toISOString(),
          section: currentSectionRef.current,
        }
        const updatedLog = [...conversationLogRef.current, doctorMessage]
        updateConversationLog(() => updatedLog)

        // Fetch next question (which will play and restart listening)
        await fetchNextQuestionRef.current(updatedLog, filledDataRef.current)
        return
      }
    }

    // Cleanup if loop exited without trigger (pause/stop)
    stopStream()
  }
  startListeningRef.current = startListening

  // Complete session — save data
  const completeSessionInternal = async () => {
    if (Object.keys(filledDataRef.current).length > 0) {
      await fetch(`/api/medical-history/${medicalHistoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: filledDataRef.current }),
      })
    }
    await fetch(`/api/voice-session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    setPhase("completed")
  }
  completeSessionInternalRef.current = completeSessionInternal

  // --- Public API ---

  const start = async () => {
    setError(null)

    // Unlock audio playback on mobile browsers: play a silent WAV
    // synchronously from the user gesture context (before any await).
    // This "warms up" the Audio element so later play() calls succeed.
    const audio = audioRef.current || new Audio()
    audioRef.current = audio
    audio.src = SILENT_WAV
    audio.play().catch(() => {})

    // Request mic upfront so permission prompt appears before session starts
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
    } catch {
      setError("Нет доступа к микрофону")
      return
    }
    // Pre-fill with initial data (patient info, etc.)
    const startData = initialData || {}
    if (Object.keys(startData).length > 0) {
      updateFilledData(startData)
    }
    await fetchNextQuestionRef.current([], startData)
  }

  const pauseSession = () => {
    isListeningRef.current = false
    if (audioRef.current) {
      audioRef.current.pause()
      // Keep audioRef alive — the element stays "unlocked" for resume
    }
    stopStream()
    setPhase("paused")
    setPartialTranscript("")
  }

  const resumeSession = async () => {
    // Re-unlock audio on mobile (called from user gesture context)
    if (audioRef.current) {
      audioRef.current.src = SILENT_WAV
      audioRef.current.play().catch(() => {})
    }
    const lastAi = [...conversationLogRef.current].reverse().find((m) => m.role === "ai")
    if (lastAi) {
      await playQuestionRef.current(lastAi.text)
      await startListeningRef.current()
    }
  }

  const completeSession = async () => {
    isListeningRef.current = false
    if (audioRef.current) {
      audioRef.current.pause()
    }
    stopStream()
    setPartialTranscript("")

    // If there's accumulated partial transcript, save it as a doctor message
    await completeSessionInternalRef.current()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
      stopStream()
    }
  }, [])

  return {
    phase,
    currentSection,
    conversationLog,
    filledData,
    progress,
    error,
    completedSections,
    partialTranscript,
    start,
    pauseSession,
    resumeSession,
    completeSession,
  }
}
