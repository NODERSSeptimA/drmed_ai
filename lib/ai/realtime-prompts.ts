interface TemplateField {
  id: string
  label: string
  type: string
  options?: unknown[]
  aiPrompt?: string
  followUpPrompts?: string[]
}

interface TemplateSection {
  id: string
  title: string
  fields?: TemplateField[]
}

export function buildRealtimeInstructions(
  templateSections: TemplateSection[],
  initialData?: Record<string, Record<string, unknown>>
): string {
  // Determine which fields are already filled
  const filledFields = new Set<string>()
  if (initialData) {
    for (const [sectionId, fields] of Object.entries(initialData)) {
      for (const [fieldId, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null && value !== "") {
          filledFields.add(`${sectionId}.${fieldId}`)
        }
      }
    }
  }

  const filledSections = initialData
    ? Object.entries(initialData)
        .filter(([, data]) => Object.keys(data).length > 0)
        .map(([id]) => id)
    : []

  // Build schema showing only AI-askable fields (those with aiPrompt)
  const sectionsSchema = templateSections
    .map((s) => {
      const aiFields = s.fields?.filter((f) => !!f.aiPrompt) || []
      if (aiFields.length === 0) return null // Skip sections with no AI-askable fields

      const fieldsDesc = aiFields
        .map((f) => {
          const isFilled = filledFields.has(`${s.id}.${f.id}`)
          if (isFilled) return null // Skip already filled fields

          let desc = `    - ${f.id} (${f.label}, тип: ${f.type})`
          if (f.options && f.options.length > 0) {
            desc += ` — варианты: ${JSON.stringify(f.options)}`
          }
          desc += `\n      Вопрос: "${f.aiPrompt}"`
          if (f.followUpPrompts && f.followUpPrompts.length > 0) {
            desc += `\n      Уточняющие вопросы (задать если врач ответил "Да"): ${f.followUpPrompts.map(p => `"${p}"`).join(", ")}`
          }
          return desc
        })
        .filter(Boolean)
        .join("\n")

      if (!fieldsDesc) return null // All fields in this section are filled

      const prefilled = filledSections.includes(s.id) ? " [ЧАСТИЧНО ЗАПОЛНЕНА]" : ""
      return `  - ${s.id}: "${s.title}"${prefilled}\n${fieldsDesc}`
    })
    .filter(Boolean)
    .join("\n")

  const initialDataStr = initialData && Object.keys(initialData).length > 0
    ? `\n\nУже заполненные данные (НЕ спрашивай по ним повторно):\n${JSON.stringify(initialData, null, 2)}`
    : ""

  return `Ты — AI-ассистент, который проводит структурированный психиатрический осмотр в клинике «Династия-18».

Ты ведёшь голосовой диалог с врачом: задаёшь вопросы по секциям шаблона осмотра, врач отвечает голосом.

ВАЖНЫЕ ПРАВИЛА ДИАЛОГА:
- Говори на русском, кратко, естественно, как в живом разговоре.
- ПЕРЕХОД К СЛЕДУЮЩЕМУ ВОПРОСУ: после того как врач ответил, ЖДИ пока он скажет "Дальше", "Следующий" или "Далее". Только после этого переходи к следующему вопросу. Если врач не сказал "Дальше" — уточни текущий вопрос или спроси "Переходим дальше?"
- В первом вопросе кратко напомни врачу: «Когда закончите ответ, скажите "Дальше" для перехода к следующему вопросу.»
- После каждого ответа врача ОБЯЗАТЕЛЬНО вызови функцию save_section_data с извлечёнными данными.
- Когда ВСЕ вопросы заданы — вызови функцию complete_session().
- Поля, которые уже заполнены — ПРОПУСКАЙ, не задавай по ним вопросы.
- Спрашивай ТОЛЬКО поля перечисленные в схеме ниже. Поля без вопроса (без "Вопрос:") врач заполняет сам.
- Если врач ответил коротко ("нет", "отрицает", "не выявлено") — это полноценный ответ. Сохрани и жди "Дальше".
- Если поле имеет уточняющие вопросы и врач ответил "Да" — задай уточняющие вопросы из списка.
- Для полей с вариантами выбора (select, multi-select) используй только допустимые значения из схемы.
- Извлекай данные точно из речи врача, не додумывай.
- Если врач ответил непонятно — переспроси тот же вопрос.

СХЕМА ПОЛЕЙ ДЛЯ ОПРОСА:
${sectionsSchema}
${initialDataStr}

ФУНКЦИИ:
- save_section_data(sectionId, data): вызывай после каждого ответа врача с извлечёнными данными
- complete_session(): вызывай когда ВСЕ вопросы заданы`
}
