import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { openai } from "@/lib/ai/openai"
import { FILL_SECTIONS_SYSTEM_PROMPT } from "@/lib/ai/prompts"
import type { FillSectionsRequest } from "@/lib/ai/types"
import { prisma } from "@/lib/prisma"

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
          if (f.type === "select" && f.options && f.options.length > 0) {
            desc += ` [строго один из вариантов: ${JSON.stringify(f.options)}]`
          } else if (f.type === "multi-select" && f.options && f.options.length > 0) {
            desc += ` [выбери подходящие из: ${JSON.stringify(f.options)}, через ", "]`
          }
          return desc
        })
        .join("\n")
      return `Секция "${s.id}" — ${s.title}:\n${fields || "  (нет полей)"}`
    })
    .join("\n\n")

  // Search ICD-10 codes relevant to the text for AI context
  const textWords = body.text
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 10)

  let icd10Context = ""
  if (textWords.length > 0) {
    const icd10Codes = await prisma.icd10.findMany({
      where: {
        OR: textWords.map((word) => ({
          name: { contains: word, mode: "insensitive" as const },
        })),
      },
      orderBy: { code: "asc" },
      take: 15,
    })
    if (icd10Codes.length > 0) {
      icd10Context = `\n\nСправочник МКБ-10 (релевантные коды):\n${icd10Codes
        .map((c: { code: string; name: string }) => `${c.code} — ${c.name}`)
        .join("\n")}\n\nДля поля icd_code используй один из этих кодов БЕЗ буквы "F".`
    }
  }

  const userPrompt = `Схема шаблона:\n${schemaDescription}\n\nТекст осмотра врача:\n${body.text}${icd10Context}\n\nИзвлеки данные из текста и верни JSON-объект. Ключи верхнего уровня — id секций, значения — объекты с полями этой секции.`

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
