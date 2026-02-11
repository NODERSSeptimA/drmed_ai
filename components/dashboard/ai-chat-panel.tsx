"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sparkles, Send, Mic, Paperclip, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder"

interface Message {
  id: string
  role: "user" | "ai"
  content: string
  timestamp: string
}

export function AiChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const onTranscribed = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text))
  }, [])

  const { isRecording, isTranscribing, startRecording, stopRecording, error: voiceError } = useVoiceRecorder({ onTranscribed })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    }

    const history = messages.map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }))

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsStreaming(true)

    const aiMsgId = (Date.now() + 1).toString()
    const aiMsg: Message = {
      id: aiMsgId,
      role: "ai",
      content: "",
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, aiMsg])

    try {
      const res = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: "Ошибка соединения с AI. Попробуйте позже." } : m
          )
        )
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6)
            if (payload === "[DONE]") break
            try {
              const parsed = JSON.parse(payload)
              if (parsed.content) {
                accumulated += parsed.content
                const current = accumulated
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiMsgId ? { ...m, content: current } : m))
                )
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: "Ошибка соединения с AI. Попробуйте позже." } : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col h-full min-h-[300px] sm:min-h-[400px]">
      <div className="flex items-center justify-between p-5 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-medgreen/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-medgreen" />
          </div>
          <h3 className="font-display text-base font-medium">AI Ассистент</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-medgreen" />
          <span className="text-xs text-muted-foreground">В сети</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Задайте вопрос AI-ассистенту
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "")}>
            {msg.role === "ai" && (
              <div className="w-6 h-6 rounded-md bg-medgreen/15 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-3 h-3 text-medgreen" />
              </div>
            )}
            <div className={cn(
              "rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[80%]",
              msg.role === "user"
                ? "bg-foreground text-background"
                : "bg-secondary"
            )}>
              <p className="text-sm whitespace-pre-wrap">{msg.content || (isStreaming ? "..." : "")}</p>
              <p className={cn(
                "text-[10px] mt-1",
                msg.role === "user" ? "text-background/50" : "text-muted-foreground"
              )}>{msg.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        {voiceError && <p className="text-xs text-red-500 mb-2">{voiceError}</p>}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-full px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Спросить AI о пациенте..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={isStreaming}
            />
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <button
                type="button"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2.5"
                onClick={isRecording ? stopRecording : startRecording}
              >
                <Mic
                  className={cn(
                    "w-4 h-4 cursor-pointer hover:text-foreground",
                    isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground"
                  )}
                />
              </button>
            )}
            <button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2.5">
              <Paperclip className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </button>
          </div>
          <Button size="icon" className="rounded-full shrink-0" onClick={handleSend} disabled={isStreaming}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
