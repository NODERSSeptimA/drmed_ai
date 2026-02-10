export interface TemplateField {
  id: string
  label: string
  type: "text" | "prose" | "date" | "select" | "bullets" | "subsections" | "timeline" | "medications" | "vitals"
  options?: string[]
  placeholder?: string
}

export interface TemplateSubsection {
  id: string
  label: string
}

export interface TemplateSection {
  id: string
  title: string
  icon: string
  fields?: TemplateField[]
  subsections?: TemplateSubsection[]
}

export interface TemplateSchema {
  sections: TemplateSection[]
}

export interface TimelineEntry {
  date: string
  description: string
  current?: boolean
}

export interface Medication {
  name: string
  group: string
  dose: string
  schedule: string
}

export interface VitalSigns {
  bloodPressure?: string
  heartRate?: string
  temperature?: string
  bmi?: string
  spo2?: string
}

export interface MedicalHistoryData {
  [sectionId: string]: Record<string, unknown>
}
