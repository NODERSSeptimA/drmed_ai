export interface ConversationMessage {
  role: "system" | "user" | "assistant"
  content: string
  timestamp?: string
}

export interface ConversationRequest {
  message: string
  history?: { role: "user" | "assistant"; content: string }[]
  sectionId?: string
  context?: Record<string, unknown>
}

export interface ConversationResponse {
  message: string
  suggestedSection?: string
  filledFields?: Record<string, unknown>
}

export interface FillSectionsRequest {
  text: string
  sections: {
    id: string
    title: string
    fields?: {
      id: string
      label: string
      type: string
      options?: unknown[]
    }[]
  }[]
}

export interface FillSectionsResponse {
  data: Record<string, Record<string, unknown>>
}

export interface SpeechToTextResult {
  text: string
  confidence: number
}

// Voice session types

export interface VoiceSessionMessage {
  role: "ai" | "doctor"
  text: string
  timestamp: string
  section?: string
}

export interface NextQuestionRequest {
  sessionId: string
  conversationLog: VoiceSessionMessage[]
  filledData: Record<string, Record<string, unknown>>
  templateSections: {
    id: string
    title: string
    fields?: {
      id: string
      label: string
      type: string
      options?: unknown[]
    }[]
  }[]
}

export interface NextQuestionResponse {
  question: string
  currentSection: string
  filledData: Record<string, Record<string, unknown>>
  isComplete: boolean
  progress: { completed: number; total: number }
}
