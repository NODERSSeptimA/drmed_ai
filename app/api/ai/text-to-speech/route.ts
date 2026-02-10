import { NextResponse } from "next/server"
import { openai } from "@/lib/ai/openai"

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: "Текст не передан" }, { status: 400 })
    }

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    })

    return new NextResponse(response.body as ReadableStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error: unknown) {
    console.error("[TTS] Error:", error)
    return NextResponse.json(
      { error: "Ошибка синтеза речи" },
      { status: 500 }
    )
  }
}
