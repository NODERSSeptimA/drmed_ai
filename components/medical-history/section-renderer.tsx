"use client"

import type { ReactNode } from "react"
import { TextField } from "./field-components/text-field"
import { ProseField } from "./field-components/prose-field"
import { DateField } from "./field-components/date-field"
import { SelectField } from "./field-components/select-field"
import { MultiSelectField } from "./field-components/multi-select-field"
import { DiagnosisBlock } from "./diagnosis-block"
import { ICD10Field } from "./field-components/icd10-field"
import {
  User, ClipboardList, MessageCircle, History, Brain, Activity,
  TrendingUp, FileCheck, Stethoscope, TestTubes, Pill, CalendarCheck, Calendar
} from "lucide-react"

const iconMap: Record<string, React.ElementType> = {
  "user": User,
  "clipboard-list": ClipboardList,
  "message-circle": MessageCircle,
  "history": History,
  "brain": Brain,
  "activity": Activity,
  "trending-up": TrendingUp,
  "file-check": FileCheck,
  "stethoscope": Stethoscope,
  "test-tubes": TestTubes,
  "pill": Pill,
  "calendar-check": CalendarCheck,
  "calendar": Calendar,
}

interface FieldDef {
  id: string
  label: string
  type: string
  options?: unknown[]
  subsections?: Array<{ id: string; label: string; type?: string }>
}

interface SectionRendererProps {
  section: {
    id: string
    title: string
    icon: string
    description?: string
    fields?: FieldDef[]
  }
  sectionIndex: number
  data: Record<string, unknown>
  editing: boolean
  onFieldChange: (fieldId: string, value: unknown) => void
}

export function SectionRenderer({ section, sectionIndex, data, editing, onFieldChange }: SectionRendererProps) {
  const Icon = iconMap[section.icon] || User

  function renderField(field: FieldDef): ReactNode {
    const value = data[field.id]

    if (field.id === "icd_code") {
      return (
        <ICD10Field
          key={field.id}
          label={field.label}
          value={(value as string) || ""}
          editing={editing}
          onChange={(v) => onFieldChange(field.id, v)}
        />
      )
    }

    switch (field.type) {
      case "text":
        return (
          <TextField
            key={field.id}
            label={field.label}
            value={(value as string) || ""}
            editing={editing}
            onChange={(v) => onFieldChange(field.id, v)}
          />
        )
      case "prose":
        return (
          <ProseField
            key={field.id}
            label={field.label}
            value={(value as string) || ""}
            editing={editing}
            onChange={(v) => onFieldChange(field.id, v)}
          />
        )
      case "date":
        return (
          <DateField
            key={field.id}
            label={field.label}
            value={(value as string) || ""}
            editing={editing}
            onChange={(v) => onFieldChange(field.id, v)}
          />
        )
      case "multi-select":
        return (
          <MultiSelectField
            key={field.id}
            label={field.label}
            value={(value as string) || ""}
            editing={editing}
            options={(field.options as string[]) || []}
            onChange={(v) => onFieldChange(field.id, v)}
          />
        )
      case "select":
        return (
          <SelectField
            key={field.id}
            label={field.label}
            value={(value as string) || ""}
            editing={editing}
            options={(field.options as Array<{ value: string; label: string }>) || []}
            onChange={(v) => onFieldChange(field.id, v)}
          />
        )
      default:
        return (
          <TextField
            key={field.id}
            label={field.label}
            value={String(value || "")}
            editing={editing}
            onChange={(v) => onFieldChange(field.id, v)}
          />
        )
    }
  }

  /** Inline field: label + value on one line (view mode), or label above input (edit mode) */
  function renderInlineField(field: FieldDef): ReactNode {
    const value = (data[field.id] as string) || ""
    if (editing) {
      return renderField(field)
    }
    return (
      <div key={field.id} className="py-1.5 border-b border-border/50 last:border-b-0 min-w-0">
        <span className="text-sm text-muted-foreground">{field.label}:</span>{" "}
        <span className="text-sm break-words">{value || "—"}</span>
      </div>
    )
  }

  /** Two fields side by side on one row */
  function renderPairedFields(f1: FieldDef, f2: FieldDef): ReactNode {
    const v1 = (data[f1.id] as string) || ""
    const v2 = (data[f2.id] as string) || ""
    if (editing) {
      return (
        <div key={f1.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderField(f1)}
          {renderField(f2)}
        </div>
      )
    }
    return (
      <div key={f1.id} className="flex flex-col sm:flex-row gap-2 sm:gap-4 py-1.5 border-b border-border/50">
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground">{f1.label}:</span>{" "}
          <span className="text-sm break-words">{v1 || "—"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground">{f2.label}:</span>{" "}
          <span className="text-sm break-words">{v2 || "—"}</span>
        </div>
      </div>
    )
  }

  // --- Special layouts per section ---

  // Patient info: 2 short fields in a row
  if (section.id === "patient_info") {
    return (
      <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {section.fields?.map(renderField)}
        </div>
      </SectionWrapper>
    )
  }

  // Examination basis: show description + single prose field
  if (section.id === "examination_basis") {
    return (
      <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title}>
        {section.description && (
          <p className="text-sm font-medium mb-3">{section.description}</p>
        )}
        <div className="space-y-3">
          {section.fields?.map(renderField)}
        </div>
      </SectionWrapper>
    )
  }

  // Anamnesis: vertical list of inline label:value fields
  if (section.id === "anamnesis") {
    return (
      <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title}>
        {editing ? (
          <div className="space-y-3">
            {section.fields?.map(renderField)}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {section.fields?.map((f) => renderInlineField(f))}
          </div>
        )}
      </SectionWrapper>
    )
  }

  // Mental status: paired fields + sub-headers as in the blank
  if (section.id === "mental_status") {
    const f = (id: string) => section.fields?.find((field) => field.id === id)

    return (
      <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title}>
        {editing ? (
          <div className="space-y-3">
            {section.fields?.map(renderField)}
          </div>
        ) : (
          <div className="space-y-0">
            {/* Сознание + ориентировка */}
            {f("consciousness") && f("orientation") && renderPairedFields(f("consciousness")!, f("orientation")!)}
            {/* На вопросы отвечает */}
            {f("question_response") && renderInlineField(f("question_response")!)}
            {/* Контакт */}
            {f("contact_productive") && renderInlineField(f("contact_productive")!)}
            {/* Речь, Внимание */}
            {f("speech") && renderInlineField(f("speech")!)}
            {f("attention") && renderInlineField(f("attention")!)}
            {/* По данным наблюдения */}
            {f("observation_data") && renderInlineField(f("observation_data")!)}

            {/* Separator */}
            <div className="pt-2" />

            {/* Эмоциональные нарушения */}
            {f("emotional_disorders") && renderInlineField(f("emotional_disorders")!)}
            {/* Память + интеллект */}
            {f("memory_disorders") && f("intellect_disorders") && renderPairedFields(f("memory_disorders")!, f("intellect_disorders")!)}
            {/* Мышление */}
            {f("thinking_disorders") && renderInlineField(f("thinking_disorders")!)}

            {/* Нарушения ощущений — sub-header */}
            <div className="pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Нарушения ощущений</p>
              {f("sensation_quantitative") && renderInlineField(f("sensation_quantitative")!)}
              {f("sensation_qualitative") && renderInlineField(f("sensation_qualitative")!)}
            </div>

            {/* Нарушения восприятия */}
            {f("perception_disorders") && renderInlineField(f("perception_disorders")!)}

            {/* Separator */}
            <div className="pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Двигательно-волевая сфера</p>
              {f("motor_volitional") && renderInlineField(f("motor_volitional")!)}
              {f("suicidal_intentions") && renderInlineField(f("suicidal_intentions")!)}
              {f("self_assessment") && renderInlineField(f("self_assessment")!)}
            </div>
          </div>
        )}
      </SectionWrapper>
    )
  }

  // Conclusion: special block
  if (section.id === "conclusion") {
    return (
      <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title}>
        <div className="space-y-4">
          {section.fields?.filter((f) => f.id === "conclusion_features").map(renderField)}
          <DiagnosisBlock variant="yellow" label="Уровень нарушений">
            <p>
              <strong>{(data.disorder_level as string) || "—"}</strong>
              {" "}психотический / дефицитарный. Тип реагирования:{" "}
              <strong>{(data.reaction_type as string) || "—"}</strong>
            </p>
          </DiagnosisBlock>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.fields?.filter((f) => f.id === "disorder_level" || f.id === "reaction_type").map(renderField)}
            </div>
          )}
        </div>
      </SectionWrapper>
    )
  }

  // Diagnosis: special block
  if (section.id === "diagnosis") {
    const icdRaw = (data.icd_code as string) || ""
    const icdCode = icdRaw ? (icdRaw.startsWith("F") ? icdRaw : `F${icdRaw}`) : undefined
    return (
      <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title}>
        <div className="space-y-4">
          {editing ? (
            section.fields?.map(renderField)
          ) : (
            <DiagnosisBlock variant="green" label="Диагноз" code={icdCode}>
              <p>{(data.diagnosis_text as string) || "—"}</p>
            </DiagnosisBlock>
          )}
        </div>
      </SectionWrapper>
    )
  }

  // Follow up: grid for short fields
  if (section.id === "follow_up") {
    return (
      <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.fields?.map(renderField)}
        </div>
      </SectionWrapper>
    )
  }

  // Default: single-column vertical list
  return (
    <SectionWrapper id={section.id} icon={Icon} index={sectionIndex} title={section.title} description={section.description}>
      <div className="space-y-3">
        {section.fields?.map(renderField)}
      </div>
    </SectionWrapper>
  )
}

// Shared section wrapper
function SectionWrapper({
  id, icon: Icon, index, title, description, children,
}: {
  id: string
  icon: React.ElementType
  index: number
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-muted-foreground" />
        </div>
        <span className="font-display text-lg font-medium">
          {index + 1}. {title}
        </span>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        {description && (
          <p className="text-sm font-medium mb-3">{description}</p>
        )}
        {children}
      </div>
    </div>
  )
}
