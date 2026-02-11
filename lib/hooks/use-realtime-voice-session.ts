"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { VoiceSessionMessage } from "@/lib/ai/types"

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

const REALTIME_WS_URL = "wss://api.openai.com/v1/realtime"
const PERSIST_DEBOUNCE_MS = 5000
const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAYS = [1000, 2000, 4000]

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64Decode(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function useRealtimeVoiceSession({
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
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlaybackTimeRef = useRef(0)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const phaseRef = useRef<VoiceSessionPhase>("idle")
  const filledDataRef = useRef<Record<string, Record<string, unknown>>>({})
  const conversationLogRef = useRef<VoiceSessionMessage[]>([])
  const isPlayingAudioRef = useRef(false)
  const pendingAudioBuffersRef = useRef<number>(0)
  const templateSectionsRef = useRef(templateSections)
  const sessionIdRef = useRef(sessionId)
  const medicalHistoryIdRef = useRef(medicalHistoryId)
  const initialDataRef = useRef(initialData)
  // Track current response's function call accumulator
  const currentFunctionCallRef = useRef<{
    callId: string
    name: string
    arguments: string
  } | null>(null)

  // Function refs to break circular deps
  const completeSessionInternalRef = useRef<() => Promise<void>>(async () => {})
  const attemptReconnectRef = useRef<() => Promise<void>>(async () => {})

  // Keep refs in sync via effects (React 19 rule: no ref writes during render)
  useEffect(() => { templateSectionsRef.current = templateSections }, [templateSections])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { medicalHistoryIdRef.current = medicalHistoryId }, [medicalHistoryId])
  useEffect(() => { initialDataRef.current = initialData }, [initialData])

  const updatePhase = useCallback((p: VoiceSessionPhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const updateFilledData = useCallback((data: Record<string, Record<string, unknown>>) => {
    filledDataRef.current = data
    setFilledData(data)
  }, [])

  const updateConversationLog = useCallback((updater: (prev: VoiceSessionMessage[]) => VoiceSessionMessage[]) => {
    setConversationLog((prev) => {
      const next = updater(prev)
      conversationLogRef.current = next
      return next
    })
  }, [])

  const updateCompletedSections = useCallback((sections: string[]) => {
    setCompletedSections(sections)
  }, [])

  // --- Persistence ---

  const persistToDb = useCallback(async () => {
    const data = filledDataRef.current
    const sid = sessionIdRef.current
    const mhId = medicalHistoryIdRef.current

    if (Object.keys(data).length > 0) {
      try {
        await fetch(`/api/medical-history/${mhId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        })
      } catch (e) {
        console.error("Failed to persist medical history:", e)
      }
    }

    try {
      await fetch(`/api/voice-session/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationLog: conversationLogRef.current,
          filledData: data,
        }),
      })
    } catch (e) {
      console.error("Failed to persist voice session:", e)
    }
  }, [])

  const debouncedPersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      persistToDb()
    }, PERSIST_DEBOUNCE_MS)
  }, [persistToDb])

  // --- Audio Playback ---

  const schedulePlayback = useCallback((pcm16Buffer: ArrayBuffer) => {
    const ctx = audioContextRef.current
    if (!ctx || ctx.state === "closed") return

    const int16 = new Int16Array(pcm16Buffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000)
    audioBuffer.getChannelData(0).set(float32)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)

    const now = ctx.currentTime
    if (nextPlaybackTimeRef.current < now) {
      nextPlaybackTimeRef.current = now
    }

    source.start(nextPlaybackTimeRef.current)
    nextPlaybackTimeRef.current += audioBuffer.duration

    pendingAudioBuffersRef.current++
    source.onended = () => {
      pendingAudioBuffersRef.current--
      if (pendingAudioBuffersRef.current <= 0 && !isPlayingAudioRef.current) {
        pendingAudioBuffersRef.current = 0
        if (phaseRef.current === "playing") {
          updatePhase("listening")
        }
      }
    }
  }, [updatePhase])

  // --- WebSocket helpers ---

  const sendWsEvent = useCallback((event: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event))
    }
  }, [])

  // --- Cleanup helpers ---

  const stopMic = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null // Prevent reconnect
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const closeAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
  }, [])

  // --- Session completion ---

  const completeSessionInternal = useCallback(async () => {
    stopMic()
    closeWebSocket()

    // Persist immediately
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }

    const data = filledDataRef.current
    if (Object.keys(data).length > 0) {
      try {
        await fetch(`/api/medical-history/${medicalHistoryIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        })
      } catch (e) {
        console.error("Failed to save medical history:", e)
      }
    }

    try {
      await fetch(`/api/voice-session/${sessionIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          conversationLog: conversationLogRef.current,
          filledData: data,
        }),
      })
    } catch (e) {
      console.error("Failed to update voice session:", e)
    }

    closeAudioContext()
    updatePhase("completed")
  }, [stopMic, closeWebSocket, closeAudioContext, updatePhase])
  useEffect(() => { completeSessionInternalRef.current = completeSessionInternal }, [completeSessionInternal])

  // --- Function call handling ---

  const handleFunctionCall = useCallback((callId: string, name: string, argsStr: string) => {
    if (name === "save_section_data") {
      try {
        const { sectionId, data } = JSON.parse(argsStr) as {
          sectionId: string
          data: Record<string, string>
        }

        // Merge into filledData
        const current = { ...filledDataRef.current }
        current[sectionId] = { ...(current[sectionId] || {}), ...data }
        updateFilledData(current)

        // Update completed sections
        const sectionIds = templateSectionsRef.current.map((s) => s.id)
        const newCompleted = sectionIds.filter(
          (id) => current[id] && Object.keys(current[id]).length > 0
        )
        updateCompletedSections(newCompleted)
        setProgress({ completed: newCompleted.length, total: sectionIds.length })

        // Update current section to next unfilled
        const nextUnfilled = sectionIds.find((id) => !newCompleted.includes(id))
        if (nextUnfilled) {
          setCurrentSection(nextUnfilled)
        } else {
          setCurrentSection(sectionId)
        }

        // Send function result back
        sendWsEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ success: true, sectionId }),
          },
        })

        // Tell model to continue
        sendWsEvent({ type: "response.create" })

        // Debounced persist
        debouncedPersist()
      } catch (e) {
        console.error("Failed to parse save_section_data:", e)
        sendWsEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ error: "parse_error" }),
          },
        })
        sendWsEvent({ type: "response.create" })
      }
    } else if (name === "complete_session") {
      // Send function result first
      sendWsEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify({ success: true }),
        },
      })

      // Complete the session via ref
      completeSessionInternalRef.current()
    }
  }, [updateFilledData, updateCompletedSections, sendWsEvent, debouncedPersist])

  // --- WebSocket message handler ---

  const handleWsMessage = useCallback((event: MessageEvent) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(event.data as string)
    } catch {
      return
    }

    const type = msg.type as string

    switch (type) {
      case "response.audio.delta": {
        if (!isPlayingAudioRef.current) {
          // AI just started speaking — clear any echo captured in the input buffer
          sendWsEvent({ type: "input_audio_buffer.clear" })
        }
        isPlayingAudioRef.current = true
        if (phaseRef.current !== "playing") {
          updatePhase("playing")
        }
        const delta = msg.delta as string
        if (delta) {
          const pcm16 = base64Decode(delta)
          schedulePlayback(pcm16)
        }
        break
      }

      case "response.audio.done": {
        isPlayingAudioRef.current = false
        // Phase transition happens in source.onended when all buffers finish
        break
      }

      case "response.audio_transcript.done": {
        const transcript = msg.transcript as string
        if (transcript) {
          updateConversationLog((prev) => [
            ...prev,
            {
              role: "ai",
              text: transcript,
              timestamp: new Date().toISOString(),
            },
          ])
        }
        break
      }

      case "conversation.item.input_audio_transcription.completed": {
        const transcript = msg.transcript as string
        if (transcript) {
          setPartialTranscript("")
          updateConversationLog((prev) => [
            ...prev,
            {
              role: "doctor",
              text: transcript,
              timestamp: new Date().toISOString(),
            },
          ])
        }
        break
      }

      case "input_audio_buffer.speech_started": {
        if (phaseRef.current !== "listening") {
          updatePhase("listening")
        }
        setPartialTranscript("")
        break
      }

      case "input_audio_buffer.speech_stopped": {
        // VAD detected end of speech — model will process
        break
      }

      case "response.function_call_arguments.delta": {
        // Accumulate function call arguments
        const callId = msg.call_id as string
        const name = msg.name as string
        const delta = msg.delta as string
        if (!currentFunctionCallRef.current) {
          currentFunctionCallRef.current = { callId, name, arguments: "" }
        }
        if (delta) {
          currentFunctionCallRef.current.arguments += delta
        }
        break
      }

      case "response.function_call_arguments.done": {
        const callId = (msg.call_id as string) || currentFunctionCallRef.current?.callId || ""
        const name = (msg.name as string) || currentFunctionCallRef.current?.name || ""
        const args = (msg.arguments as string) || currentFunctionCallRef.current?.arguments || ""
        currentFunctionCallRef.current = null
        handleFunctionCall(callId, name, args)
        break
      }

      case "error": {
        const errorMsg = msg.error as { message?: string } | undefined
        console.error("Realtime API error:", errorMsg)
        setError(errorMsg?.message || "Ошибка Realtime API")
        updatePhase("error")
        break
      }

      case "session.created":
      case "session.updated":
        // Session ready — no action needed
        break

      case "response.created":
      case "response.done":
      case "response.output_item.added":
      case "response.output_item.done":
      case "response.content_part.added":
      case "response.content_part.done":
      case "conversation.item.created":
      case "rate_limits.updated":
        // Informational events — no action needed
        break

      default:
        // Unknown event type — log for debugging
        if (process.env.NODE_ENV === "development") {
          console.log("Realtime event:", type, msg)
        }
    }
  }, [updatePhase, schedulePlayback, updateConversationLog, handleFunctionCall, sendWsEvent])

  // --- Mic Setup ---

  const setupAudioInput = useCallback(async (ctx: AudioContext, stream: MediaStream) => {
    await ctx.audioWorklet.addModule("/audio-worklet-processor.js")
    const source = ctx.createMediaStreamSource(stream)
    const workletNode = new AudioWorkletNode(ctx, "pcm16-capture-processor")
    workletNodeRef.current = workletNode

    workletNode.port.onmessage = (event: MessageEvent) => {
      const { pcm16 } = event.data as { pcm16: ArrayBuffer }
      // Mute mic input while AI is speaking to prevent echo feedback on mobile
      if (isPlayingAudioRef.current || phaseRef.current === "playing") return
      if (pcm16 && wsRef.current?.readyState === WebSocket.OPEN) {
        sendWsEvent({
          type: "input_audio_buffer.append",
          audio: base64Encode(pcm16),
        })
      }
    }

    source.connect(workletNode)
    workletNode.connect(ctx.destination) // Required for worklet to process, but it outputs silence
  }, [sendWsEvent])

  // --- Token fetching ---

  const fetchEphemeralToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/ai/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        templateSections: templateSectionsRef.current,
        initialData: initialDataRef.current,
      }),
    })

    if (!res.ok) {
      throw new Error("Failed to get ephemeral token")
    }

    const { token } = await res.json()
    return token
  }, [])

  // --- Reconnect ---

  const attemptReconnect = useCallback(async () => {
    const attempt = reconnectAttemptRef.current
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      setError("Соединение потеряно. Попробуйте перезапустить сессию.")
      updatePhase("error")
      return
    }

    reconnectAttemptRef.current = attempt + 1
    const delay = RECONNECT_DELAYS[attempt] || 4000

    await new Promise((r) => setTimeout(r, delay))

    try {
      const token = await fetchEphemeralToken()
      const ws = new WebSocket(REALTIME_WS_URL, [
        "realtime",
        `openai-insecure-api-key.${token}`,
        "openai-beta.realtime-v1",
      ])

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          reconnectAttemptRef.current = 0
          resolve()
        }
        ws.onerror = (e) => reject(e)
      })

      ws.onmessage = handleWsMessage
      ws.onclose = () => {
        if (
          phaseRef.current !== "completed" &&
          phaseRef.current !== "idle" &&
          phaseRef.current !== "error"
        ) {
          attemptReconnectRef.current()
        }
      }

      wsRef.current = ws

      // Inject context about progress so far
      const summary = conversationLogRef.current
        .slice(-6)
        .map((m) => `${m.role === "ai" ? "AI" : "Врач"}: ${m.text}`)
        .join("\n")

      sendWsEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Продолжаем сессию. Уже заполнены секции: ${JSON.stringify(Object.keys(filledDataRef.current))}. Последний контекст:\n${summary}\n\nПродолжай с того места где остановились.`,
            },
          ],
        },
      })
      sendWsEvent({ type: "response.create" })
    } catch (e) {
      console.error("Reconnect failed:", e)
      attemptReconnectRef.current()
    }
  }, [fetchEphemeralToken, handleWsMessage, sendWsEvent, updatePhase])
  useEffect(() => { attemptReconnectRef.current = attemptReconnect }, [attemptReconnect])

  // --- Connect WebSocket ---

  const connectWebSocket = useCallback(async (token: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(REALTIME_WS_URL, [
        "realtime",
        `openai-insecure-api-key.${token}`,
        "openai-beta.realtime-v1",
      ])

      ws.onopen = () => {
        reconnectAttemptRef.current = 0
        resolve(ws)
      }

      ws.onerror = (e) => {
        reject(e)
      }

      ws.onclose = () => {
        // Only attempt reconnect if session is active
        if (
          phaseRef.current !== "completed" &&
          phaseRef.current !== "idle" &&
          phaseRef.current !== "error"
        ) {
          attemptReconnectRef.current()
        }
      }

      ws.onmessage = handleWsMessage
    })
  }, [handleWsMessage])

  // --- Public API ---

  const start = useCallback(async () => {
    setError(null)

    // Unlock audio on mobile via user gesture
    const silentAudio = new Audio(SILENT_WAV)
    silentAudio.play().catch(() => {})

    // Request mic
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
    } catch {
      setError("Нет доступа к микрофону")
      return
    }

    // Pre-fill with initial data
    const startData = initialDataRef.current || {}
    if (Object.keys(startData).length > 0) {
      updateFilledData(startData)
      // Update completed sections for prefilled data
      const sectionIds = templateSectionsRef.current.map((s) => s.id)
      const prefilled = sectionIds.filter(
        (id) => startData[id] && Object.keys(startData[id]).length > 0
      )
      updateCompletedSections(prefilled)
      setProgress({ completed: prefilled.length, total: sectionIds.length })
    }

    updatePhase("processing")

    // Get ephemeral token
    let token: string
    try {
      token = await fetchEphemeralToken()
    } catch {
      setError("Не удалось получить токен сессии")
      updatePhase("error")
      stopMic()
      return
    }

    // Connect WebSocket
    let ws: WebSocket
    try {
      ws = await connectWebSocket(token)
      wsRef.current = ws
    } catch {
      setError("Не удалось подключиться к серверу")
      updatePhase("error")
      stopMic()
      return
    }

    // Create AudioContext at 24kHz
    try {
      const ctx = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = ctx

      // Resume context (required by some browsers)
      if (ctx.state === "suspended") {
        await ctx.resume()
      }

      await setupAudioInput(ctx, stream)
    } catch (e) {
      console.error("AudioContext setup failed:", e)
      setError("Ошибка настройки аудио")
      updatePhase("error")
      closeWebSocket()
      stopMic()
      return
    }

    // Reset playback time
    nextPlaybackTimeRef.current = 0
    pendingAudioBuffersRef.current = 0

    // Tell AI to start the first question
    sendWsEvent({ type: "response.create" })
  }, [
    updatePhase, updateFilledData, updateCompletedSections,
    fetchEphemeralToken, connectWebSocket, setupAudioInput,
    sendWsEvent, stopMic, closeWebSocket,
  ])

  const pauseSession = useCallback(() => {
    // Disconnect worklet to stop sending audio
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    // Stop any pending playback by resetting time
    nextPlaybackTimeRef.current = 0
    pendingAudioBuffersRef.current = 0
    isPlayingAudioRef.current = false

    setPartialTranscript("")
    updatePhase("paused")

    // Persist immediately
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    persistToDb()
  }, [updatePhase, persistToDb])

  const resumeSession = useCallback(async () => {
    // Unlock audio on mobile
    const silentAudio = new Audio(SILENT_WAV)
    silentAudio.play().catch(() => {})

    // Reconnect mic worklet
    const ctx = audioContextRef.current
    const stream = streamRef.current
    if (ctx && stream && stream.active) {
      try {
        await setupAudioInput(ctx, stream)
      } catch (e) {
        console.error("Failed to reconnect audio:", e)
        // Try getting new stream
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          streamRef.current = newStream
          await setupAudioInput(ctx, newStream)
        } catch {
          setError("Не удалось восстановить микрофон")
          updatePhase("error")
          return
        }
      }
    } else if (ctx) {
      // Stream was lost, get new one
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = newStream
        await setupAudioInput(ctx, newStream)
      } catch {
        setError("Нет доступа к микрофону")
        updatePhase("error")
        return
      }
    }

    // If WebSocket was closed, reconnect
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      try {
        const token = await fetchEphemeralToken()
        const ws = await connectWebSocket(token)
        wsRef.current = ws
      } catch {
        setError("Не удалось восстановить соединение")
        updatePhase("error")
        return
      }
    }

    // Reset playback
    nextPlaybackTimeRef.current = 0
    pendingAudioBuffersRef.current = 0

    // Tell model to continue
    sendWsEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Продолжаем.",
          },
        ],
      },
    })
    sendWsEvent({ type: "response.create" })

    updatePhase("playing")
  }, [setupAudioInput, updatePhase, fetchEphemeralToken, connectWebSocket, sendWsEvent])

  const completeSession = useCallback(async () => {
    setPartialTranscript("")
    await completeSessionInternalRef.current()
  }, [])

  // --- Cleanup on unmount ---

  useEffect(() => {
    return () => {
      // Stop mic & worklet
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect()
        workletNodeRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }

      // Close AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }

      // Clear persist timer
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }

      // Best-effort persist via sendBeacon
      const data = filledDataRef.current
      if (Object.keys(data).length > 0) {
        const payload = JSON.stringify({
          conversationLog: conversationLogRef.current,
          filledData: data,
        })
        navigator.sendBeacon?.(
          `/api/voice-session/${sessionIdRef.current}`,
          new Blob([payload], { type: "application/json" })
        )
      }
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
