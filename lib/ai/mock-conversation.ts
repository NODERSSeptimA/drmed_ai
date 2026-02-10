import { ConversationRequest, ConversationResponse } from "./types"

const mockResponses: Record<string, string> = {
  default: "Спасибо за информацию. Я записал данные. Что ещё вы хотели бы добавить?",
  complaints: "Хорошо, записал жалобы пациента. Есть ли дополнительные симптомы, которые стоит отметить?",
  anamnesis: "Понял. Информация по анамнезу зафиксирована. Переходим к следующему разделу?",
  mental_status: "Данные о психическом статусе записаны. Хотите уточнить какой-либо пункт?",
  diagnosis: "На основании описанной симптоматики, рекомендую рассмотреть следующие диагностические категории. Хотите, чтобы я предложил формулировку диагноза?",
  treatment: "Понял схему лечения. Проверьте дозировки и кратность приёма. Добавить что-нибудь ещё?",
}

export function getMockConversationResponse(request: ConversationRequest): ConversationResponse {
  const sectionKey = request.sectionId || "default"
  const responseText = mockResponses[sectionKey] || mockResponses.default

  return {
    message: responseText,
    suggestedSection: request.sectionId,
  }
}
