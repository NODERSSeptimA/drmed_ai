import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { openai } from "@/lib/ai/openai"
import { VOICE_SESSION_SYSTEM_PROMPT } from "@/lib/ai/prompts"
import type { NextQuestionRequest, NextQuestionResponse } from "@/lib/ai/types"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: NextQuestionRequest = await req.json()
  const { sessionId, conversationLog, filledData, templateSections } = body

  const schemaDescription = templateSections
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

  const dialogHistory = conversationLog
    .map((msg) => `[${msg.role === "ai" ? "AI" : "Врач"}]: ${msg.text}`)
    .join("\n")

  const filledSummary = Object.keys(filledData).length > 0
    ? `Уже заполненные данные:\n${JSON.stringify(filledData, null, 2)}`
    : "Данные ещё не заполнены."

  const userPrompt = `Шаблон секций:\n${schemaDescription}\n\n${filledSummary}\n\nИстория диалога:\n${dialogHistory || "(начало диалога)"}\n\nОпредели, какие данные можно извлечь из последнего ответа врача, и задай следующий вопрос по незаполненной секции.`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: VOICE_SESSION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Пустой ответ от AI" }, { status: 502 })
    }

    const parsed = JSON.parse(content)

    // Merge extracted data into filledData
    const mergedData = { ...filledData }
    if (parsed.extractedData) {
      for (const [sectionId, fields] of Object.entries(parsed.extractedData)) {
        mergedData[sectionId] = {
          ...mergedData[sectionId],
          ...(fields as Record<string, unknown>),
        }
      }
    }

    const completedSections: string[] = parsed.completedSections || []
    const total = templateSections.length

    // Server-side completion check: if all sections have at least one field filled
    const filledSectionIds = Object.keys(mergedData).filter(
      (id) => mergedData[id] && Object.keys(mergedData[id]).length > 0
    )
    const allSectionIds = templateSections.map((s) => s.id)
    const allSectionsFilled = allSectionIds.every((id) => filledSectionIds.includes(id))
    const isComplete = parsed.isComplete === true || allSectionsFilled

    const completed = isComplete ? total : completedSections.length

    const result: NextQuestionResponse = {
      question: isComplete ? "" : (parsed.nextQuestion || ""),
      currentSection: parsed.currentSection || "",
      filledData: mergedData,
      isComplete,
      progress: { completed, total },
    }

    // Update voice session in DB
    await prisma.voiceSession.update({
      where: { id: sessionId },
      data: {
        conversationLog: JSON.parse(JSON.stringify(conversationLog)),
        currentSection: result.currentSection,
        ...(result.isComplete ? { status: "completed" } : {}),
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[NextQuestion] Error:", error)
    return NextResponse.json(
      { error: "Ошибка обработки вопроса" },
      { status: 500 }
    )
  }
}
