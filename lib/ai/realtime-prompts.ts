interface TemplateSection {
  id: string
  title: string
  fields?: { id: string; label: string; type: string; options?: unknown[] }[]
}

export function buildRealtimeInstructions(
  templateSections: TemplateSection[],
  initialData?: Record<string, Record<string, unknown>>
): string {
  const filledSections = initialData
    ? Object.entries(initialData)
        .filter(([, data]) => Object.keys(data).length > 0)
        .map(([id]) => id)
    : []

  const sectionsSchema = templateSections
    .map((s) => {
      const fieldsDesc = s.fields
        ?.map((f) => {
          let desc = `    - ${f.id} (${f.label}, тип: ${f.type})`
          if (f.options && f.options.length > 0) {
            desc += ` — варианты: ${JSON.stringify(f.options)}`
          }
          return desc
        })
        .join("\n")
      const prefilled = filledSections.includes(s.id) ? " [УЖЕ ЗАПОЛНЕНА — ПРОПУСТИТЬ]" : ""
      return `  - ${s.id}: "${s.title}"${prefilled}\n${fieldsDesc || "    (без полей)"}`
    })
    .join("\n")

  const initialDataStr = initialData && Object.keys(initialData).length > 0
    ? `\n\nУже заполненные данные (НЕ спрашивай по ним):\n${JSON.stringify(initialData, null, 2)}`
    : ""

  return `Ты — AI-ассистент, который проводит структурированный психиатрический осмотр в клинике «Династия-18».

Ты ведёшь голосовой диалог с врачом: задаёшь вопросы по секциям шаблона осмотра, врач отвечает голосом.

ВАЖНЫЕ ПРАВИЛА ДИАЛОГА:
- Говори на русском, кратко, естественно, как в живом разговоре.
- НЕТ команды "следующий вопрос" — VAD автоматически определяет когда врач закончил говорить.
- После каждого ответа врача ОБЯЗАТЕЛЬНО вызови функцию save_section_data с извлечёнными данными.
- Когда ВСЕ секции заполнены — вызови функцию complete_session().
- Секции помеченные [УЖЕ ЗАПОЛНЕНА] — ПРОПУСКАЙ, не задавай по ним вопросы.
- Не застревай на одной секции — если врач дал достаточно информации, переходи дальше.
- Если врач ответил коротко ("нет", "отрицает", "не выявлено") — это полноценный ответ.
- Для полей с вариантами выбора используй только допустимые значения из схемы.
- Извлекай данные точно из речи врача, не додумывай.
- Если врач ответил непонятно — переспроси ту же секцию.
- В первом вопросе НЕ нужно объяснять команды — просто начни с первой незаполненной секции.

СХЕМА ШАБЛОНА:
${sectionsSchema}
${initialDataStr}

ФУНКЦИИ:
- save_section_data(sectionId, data): вызывай после каждого ответа врача с извлечёнными данными
- complete_session(): вызывай когда ВСЕ секции заполнены`
}
