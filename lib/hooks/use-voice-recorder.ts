"use client"

import { useState, useRef, useCallback } from "react"

type VoiceState = "idle" | "recording" | "transcribing"

interface UseVoiceRecorderOptions {
  onTranscribed: (text: string) => void
}

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ""
}

export function useVoiceRecorder({ onTranscribed }: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceState>("idle")
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(1000) // collect data every second
      setState("recording")
    } catch {
      setError("Нет доступа к микрофону")
    }
  }, [])

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state !== "recording") return

    mediaRecorder.onstop = async () => {
      stopMediaTracks()

      const mimeType = mediaRecorder.mimeType || "audio/webm"
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm"
      const blob = new Blob(chunksRef.current, { type: mimeType })
      chunksRef.current = []

      console.log("[Voice] Blob ready:", blob.size, "bytes, type:", mimeType)

      if (blob.size === 0) {
        setState("idle")
        setError("Пустая запись")
        return
      }

      setState("transcribing")
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        const formData = new FormData()
        formData.append("audio", blob, `recording.${ext}`)

        const res = await fetch("/api/ai/speech-to-text", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!res.ok) {
          let msg = "Ошибка распознавания"
          try {
            const data = await res.json()
            msg = data.error || msg
          } catch { /* non-json response */ }
          setError(msg)
          setState("idle")
          return
        }

        const { text } = await res.json()
        if (text) {
          onTranscribed(text)
        } else {
          setError("Речь не распознана")
        }
        setState("idle")
      } catch (err) {
        const msg = err instanceof DOMException && err.name === "AbortError"
          ? "Таймаут — попробуйте короче"
          : "Ошибка соединения с сервером"
        setError(msg)
        setState("idle")
      }
    }

    mediaRecorder.stop()
  }, [onTranscribed, stopMediaTracks])

  return {
    isRecording: state === "recording",
    isTranscribing: state === "transcribing",
    startRecording,
    stopRecording,
    error,
  }
}
