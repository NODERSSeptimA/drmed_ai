import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { openai } from "@/lib/ai/openai"
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts"
import type { ConversationRequest } from "@/lib/ai/types"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const body: ConversationRequest = await req.json()

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
  ]

  if (body.history) {
    for (const msg of body.history) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: "user", content: body.message })

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
