import { SpeechToTextResult } from "./types"

export function getMockTranscription(): SpeechToTextResult {
  const sampleTexts = [
    "Пациентка жалуется на стойко сниженное настроение в течение трёх месяцев",
    "Отмечает нарушение сна, ранние пробуждения, трудности засыпания",
    "Сознание ясное, ориентирована правильно",
    "Фон настроения снижен, тревога выраженная",
  ]

  return {
    text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
    confidence: 0.95,
  }
}
