import { NextResponse } from "next/server"
import { toFile } from "openai"
import { openai } from "@/lib/ai/openai"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("audio") as File | null

    if (!file) {
      return NextResponse.json({ error: "Аудиофайл не передан" }, { status: 400 })
    }

    console.log("[STT] Received audio:", file.name, file.type, file.size, "bytes")

    const arrayBuffer = await file.arrayBuffer()
    const uploadFile = await toFile(
      new Uint8Array(arrayBuffer),
      file.name || "recording.webm",
      { type: file.type || "audio/webm" }
    )

    const transcription = await openai.audio.transcriptions.create({
      file: uploadFile,
      model: "whisper-1",
      language: "ru",
      prompt: "Психиатрический осмотр. Анамнез, диспансерное наблюдение, нейроинфекции, психотравмирующие ситуации, суицидальные попытки, ЧМТ, фармакотерапия, психоактивные вещества. Сознание, ориентировка, контакт продуктивный, эмоциональные нарушения, ангедония, гипобулия, деперсонализация, дереализация, галлюцинации, сенестопатии, бредовые идеи, навязчивые, сверхценные, каталепсия, негативизм. Рекуррентное депрессивное расстройство, МКБ-10, F33, эндогенный, экзогенно-органический, психогенный, дефицитарный, психотический. Следующий вопрос. Завершить сессию.",
    })

    console.log("[STT] Transcription result:", transcription.text?.slice(0, 100))

    return NextResponse.json({ text: transcription.text })
  } catch (error: unknown) {
    console.error("[STT] Error:", error)

    const status = (error as { status?: number })?.status
    if (status === 429) {
      return NextResponse.json(
        { error: "Превышен лимит API OpenAI — проверьте баланс" },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: "Ошибка распознавания речи" },
      { status: 500 }
    )
  }
}
