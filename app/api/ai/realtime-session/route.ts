import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildRealtimeInstructions } from "@/lib/ai/realtime-prompts"
import type { RealtimeSessionRequest } from "@/lib/ai/types"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: RealtimeSessionRequest = await request.json()
  const { templateSections, initialData } = body

  const instructions = buildRealtimeInstructions(templateSections, initialData)

  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: "alloy",
      modalities: ["audio", "text"],
      instructions,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        silence_duration_ms: 800,
      },
      tools: [
        {
          type: "function",
          name: "save_section_data",
          description: "Сохранить извлечённые данные секции из ответа врача",
          parameters: {
            type: "object",
            properties: {
              sectionId: {
                type: "string",
                description: "ID секции шаблона",
              },
              data: {
                type: "object",
                description: "Объект с парами fieldId: value для секции",
                additionalProperties: { type: "string" },
              },
            },
            required: ["sectionId", "data"],
          },
        },
        {
          type: "function",
          name: "complete_session",
          description: "Завершить сессию когда все секции заполнены",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("OpenAI Realtime session error:", errorText)
    return NextResponse.json(
      { error: "Failed to create realtime session" },
      { status: 502 }
    )
  }

  const data = await response.json()

  return NextResponse.json({
    token: data.client_secret.value,
    expiresAt: data.expires_at
      ? new Date(data.expires_at * 1000).toISOString()
      : new Date(Date.now() + 60_000).toISOString(),
  })
}
