import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { openai } from "@/lib/ai/openai"
import { FILL_SECTIONS_SYSTEM_PROMPT } from "@/lib/ai/prompts"
import type { FillSectionsRequest } from "@/lib/ai/types"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: FillSectionsRequest = await req.json()

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Текст осмотра обязателен" }, { status: 400 })
  }

  const schemaDescription = body.sections
    .map((s) => {
      const fields = s.fields
        ?.map((f) => {
          let desc = `  - "${f.id}" (${f.type}): ${f.label}`
          if (f.options && f.options.length > 0) {
            desc += ` [варианты: ${JSON.stringify(f.options)}]`
          }
          return desc
        })
        .join("\n")
      return `Секция "${s.id}" — ${s.title}:\n${fields || "  (нет полей)"}`
    })
    .join("\n\n")

  const userPrompt = `Схема шаблона:\n${schemaDescription}\n\nТекст осмотра врача:\n${body.text}\n\nИзвлеки данные из текста и верни JSON-объект. Ключи верхнего уровня — id секций, значения — объекты с полями этой секции.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: FILL_SECTIONS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    return NextResponse.json({ error: "Пустой ответ от AI" }, { status: 502 })
  }

  try {
    const data = JSON.parse(content)
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: "Ошибка парсинга ответа AI" }, { status: 502 })
  }
}
