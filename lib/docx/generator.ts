import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Packer,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  TabStopType,
} from "docx"
import { readFileSync } from "fs"
import { join } from "path"

interface MedicalHistoryData {
  [key: string]: Record<string, unknown>
}

interface GeneratorInput {
  templateTitle: string
  clinicName: string
  doctorName: string
  examinationDate: string
  patientName: string
  patientBirthDate?: string
  data: MedicalHistoryData
  sections: Array<{
    id: string
    title: string
    fields?: Array<{
      id: string
      label: string
      type: string
      options?: unknown[]
      prefix?: string
      description?: string
    }>
    description?: string
  }>
}

const FONT = "Arial"
const SZ = 22        // 11pt — base text
const SZ_SM = 18     // 9pt — header details
const SZ_TITLE = 28  // 14pt — document title
const SZ_HEAD = 24   // 12pt — section headings
const SZ_FOOT = 14   // 7pt — footer
const SZ_CO = 20     // 10pt — company name

// A4 width 11906 twips, margins left=1134 right=850 → usable 9922
const RIGHT_TAB = 9922
const MID_TAB = 4800

const NOBORDER = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
} as const

// --- helpers ---

function t(s: string, opts?: Partial<{ bold: boolean; underline: boolean; size: number; italic: boolean }>): TextRun {
  return new TextRun({
    text: s,
    font: FONT,
    size: opts?.size ?? SZ,
    bold: opts?.bold,
    underline: opts?.underline ? {} : undefined,
    italics: opts?.italic,
  })
}

/** Label + underlined value extending to right margin via tab */
function fieldLine(label: string, value: string, opts?: { bold?: boolean; before?: number }): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { after: 20, before: opts?.before ?? 0 },
    children: [
      t(label + " ", { bold: opts?.bold }),
      t((value || "") + "\t", { underline: true }),
    ],
  })
}

/** Two fields on one line: label1 value1 [tab] label2 value2 [tab-to-end] */
function fieldLine2(
  label1: string, value1: string,
  label2: string, value2: string,
): Paragraph {
  return new Paragraph({
    tabStops: [
      { type: TabStopType.LEFT, position: MID_TAB },
      { type: TabStopType.RIGHT, position: RIGHT_TAB },
    ],
    spacing: { after: 20 },
    children: [
      t(label1 + " "),
      t((value1 || "") + "\t", { underline: true }),
      t(label2 + " "),
      t((value2 || "") + "\t", { underline: true }),
    ],
  })
}

/** Text line (no underline, just text) */
function textLine(s: string, opts?: { bold?: boolean; size?: number; before?: number; after?: number }): Paragraph {
  return new Paragraph({
    spacing: { after: opts?.after ?? 20, before: opts?.before ?? 0 },
    children: [t(s, { bold: opts?.bold, size: opts?.size })],
  })
}

/** An underlined blank line (border-bottom) for writing */
function blankULine(): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, space: 1, color: "000000" } },
    children: [t(" ")],
  })
}

function sectionTitle(title: string, opts?: { size?: number; before?: number }): Paragraph {
  return new Paragraph({
    children: [t(title, { bold: true, size: opts?.size })],
    spacing: { before: opts?.before ?? 80, after: 40 },
  })
}

// --- header table builder ---
// Logo: original 499x135px. HTML uses height: 18mm ≈ 68px, width auto ≈ 251px
// In docx, keep it modest: ~13mm height
const LOGO_W = 185
const LOGO_H = 50

function buildHeaderTable(logoData: Buffer | null, clinicName: string): Table {
  const logoCell = new TableCell({
    borders: NOBORDER,
    width: { size: 20, type: WidthType.PERCENTAGE },
    children: logoData
      ? [new Paragraph({
          spacing: { after: 0 },
          children: [new ImageRun({ data: logoData, transformation: { width: LOGO_W, height: LOGO_H }, type: "png" })],
        })]
      : [new Paragraph({ children: [], spacing: { after: 0 } })],
  })

  const lines = [
    { text: clinicName, bold: true, size: SZ_CO },
    { text: "г. Санкт-Петербург, ул. Ленина д. 5", size: SZ_SM },
    { text: "тел: (812)385-50-80", size: SZ_SM },
    { text: "e-mail: info@meddynasty.ru", size: SZ_SM },
    { text: "www.meddynasty.ru", size: SZ_SM },
  ]

  const infoCell = new TableCell({
    borders: NOBORDER,
    width: { size: 80, type: WidthType.PERCENTAGE },
    children: lines.map((l) =>
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        children: [t(l.text, { bold: l.bold, size: l.size })],
      })
    ),
  })

  return new Table({
    rows: [new TableRow({ children: [logoCell, infoCell] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

// ============================
// MAIN GENERATOR
// ============================

export async function generateDocx(input: GeneratorInput): Promise<Buffer> {
  const d = input.data

  // Read logo
  let logoData: Buffer | null = null
  try {
    logoData = readFileSync(join(process.cwd(), "public/dynasty-logo.png"))
  } catch { /* logo not found */ }

  const p1: (Paragraph | Table)[] = []
  const p2: (Paragraph | Table)[] = []

  // ==================== PAGE 1 ====================

  // Title
  p1.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 140 },
    children: [t("Осмотр психиатра", { bold: true, size: SZ_TITLE })],
  }))

  // ФИО + Дата рождения (two fields on one line)
  const pi = d.patient_info || {}
  const fullName = String(pi.full_name || input.patientName || "")
  const birthDate = String(pi.birth_date || input.patientBirthDate || "")
  p1.push(fieldLine2("ФИО пациента", fullName, "Дата рождения", birthDate))

  // С имеющейся документацией ознакомлен
  p1.push(textLine("С имеющейся документацией ознакомлен.", { bold: true, before: 60 }))

  // Основания для осмотра
  const basis = d.examination_basis || {}
  const basisVal = String(basis.basis || "")
  p1.push(new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { after: 20 },
    children: [
      t("Основания для осмотра ", { bold: true }),
      t("(по данным наблюдения, мед. документов): "),
    ],
  }))
  if (basisVal) {
    p1.push(new Paragraph({ spacing: { after: 20 }, children: [t(basisVal)] }))
  } else {
    p1.push(blankULine())
    p1.push(blankULine())
  }

  // Жалобы
  const complaints = d.complaints || {}
  const complaintsVal = String(complaints.complaints_text || "")
  p1.push(sectionTitle("Жалобы:", { before: 60 }))
  if (complaintsVal) {
    p1.push(new Paragraph({ spacing: { after: 20 }, children: [t(complaintsVal)] }))
  } else {
    p1.push(blankULine())
    p1.push(blankULine())
  }

  // Анамнез
  const an = d.anamnesis || {}
  p1.push(sectionTitle("Анамнез:", { before: 60 }))
  p1.push(fieldLine("Диспансерное наблюдение у психиатра, нарколога, др. специалиста:", String(an.dispensary_observation || "")))
  p1.push(fieldLine("Нейроинфекции, профессиональные вредности:", String(an.neuroinfections || "")))
  p1.push(fieldLine("Пагубное употребление психоактивных веществ: алкоголь, наркотики, лекарственные средства", String(an.substance_use || "")))
  p1.push(fieldLine("Психотравмирующие ситуации:", String(an.psychotrauma || "")))
  p1.push(fieldLine("Суицидальные попытки в прошлом:", String(an.suicide_attempts || "")))
  p1.push(fieldLine("Эпизоды нарушения сознания, судорожные приступы, ЧМТ:", String(an.consciousness_episodes || "")))

  // Хронические заболевания (text-line style + blank lines)
  const chronicVal = String(an.chronic_diseases || "")
  p1.push(textLine("Хронические заболевания и фармакотерапия:"))
  if (chronicVal) {
    p1.push(new Paragraph({ spacing: { after: 20 }, children: [t(chronicVal)] }))
  } else {
    p1.push(blankULine())
    p1.push(blankULine())
  }

  // Дополнения
  const additionsVal = String(an.anamnesis_additions || "")
  p1.push(textLine("Дополнения:", { before: 30 }))
  if (additionsVal) {
    p1.push(new Paragraph({ spacing: { after: 20 }, children: [t(additionsVal)] }))
  } else {
    p1.push(blankULine())
    p1.push(blankULine())
  }

  // Психический статус
  const ms = d.mental_status || {}
  p1.push(sectionTitle("Психический статус:", { size: SZ_HEAD, before: 100 }))

  // Сознание + ориентировка
  p1.push(fieldLine2("Сознание", String(ms.consciousness || ""), "ориентировка", String(ms.orientation || "")))
  p1.push(fieldLine("На вопросы (    ) отвечает", String(ms.question_response || "")))
  p1.push(fieldLine("Контакт с больным (    ) продуктивный", String(ms.contact_productive || "")))
  p1.push(fieldLine("Речь", String(ms.speech || "")))
  p1.push(fieldLine("Внимание", String(ms.attention || "")))

  // По данным наблюдения
  const obsVal = String(ms.observation_data || "")
  p1.push(fieldLine("По данным наблюдения за пациентом", obsVal))
  if (!obsVal) p1.push(blankULine())

  // Эмоциональные нарушения
  p1.push(fieldLine("Эмоциональные нарушения:", String(ms.emotional_disorders || "")))

  // Память + интеллект
  p1.push(fieldLine2("Нарушение памяти", String(ms.memory_disorders || ""), "нарушения интеллекта", String(ms.intellect_disorders || "")))

  // Нарушения мышления
  const thinkVal = String(ms.thinking_disorders || "")
  p1.push(textLine("Нарушения мышления (навязчивые; сверхценные; бредовые идеи и их содержание):"))
  if (thinkVal) {
    p1.push(new Paragraph({ spacing: { after: 20 }, children: [t(thinkVal)] }))
  } else {
    p1.push(blankULine())
    p1.push(blankULine())
    p1.push(blankULine())
  }

  // Нарушения ощущений
  p1.push(textLine("Нарушения ощущений:", { before: 20 }))
  p1.push(fieldLine("- количественные (анестезия, гипо-, гиперстезия)", String(ms.sensation_quantitative || "")))
  p1.push(fieldLine("- качественные (синестезия, парестезия)", String(ms.sensation_qualitative || "")))

  // Нарушения восприятия
  const percVal = String(ms.perception_disorders || "")
  p1.push(textLine("Нарушения восприятия (иллюзии, галлюцинации, сенестопатии, деперсонализация, дереализация):", { before: 20 }))
  if (percVal) {
    p1.push(new Paragraph({ spacing: { after: 20 }, children: [t(percVal)] }))
  } else {
    p1.push(blankULine())
    p1.push(blankULine())
    p1.push(blankULine())
  }

  // ==================== PAGE 2 ====================

  // Двигательно-волевые
  p2.push(fieldLine("Двигательно-волевые нарушения (абулия, импульсивность, негативизм, каталепсия)", String(ms.motor_volitional || ""), { before: 40 }))
  p2.push(fieldLine("Суицидальные намерения", String(ms.suicidal_intentions || "")))
  p2.push(fieldLine("Самооценка психического состояния", String(ms.self_assessment || "")))

  // Сомато-неврологический статус
  const som = d.somatic_neurological || {}
  const somVal = String(som.somatic_neuro_text || "")
  p2.push(textLine("Сомато-неврологический статус:", { bold: true, before: 100 }))
  if (somVal) {
    p2.push(new Paragraph({ spacing: { after: 20 }, children: [t(somVal)] }))
  } else {
    p2.push(blankULine())
    p2.push(blankULine())
    p2.push(blankULine())
    p2.push(blankULine())
  }

  // Динамика
  const dyn = d.dynamics || {}
  const dynVal = String(dyn.dynamics_text || "")
  p2.push(textLine("Динамика состояния за время наблюдения:", { before: 80 }))
  if (dynVal) {
    p2.push(new Paragraph({ spacing: { after: 20 }, children: [t(dynVal)] }))
  } else {
    p2.push(blankULine())
    p2.push(blankULine())
    p2.push(blankULine())
  }

  // Заключение
  const con = d.conclusion || {}
  const conFeatures = String(con.conclusion_features || "")
  p2.push(new Paragraph({
    spacing: { before: 80, after: 20 },
    children: [
      t("Заключение: ", { bold: true }),
      t("выявленные особенности психического статуса "),
      t(conFeatures || "______", { underline: true }),
      t(" указывают на наличие психического расстройства. В клинической картине отмечаются следующие симптомы:"),
    ],
  }))
  if (!conFeatures) {
    p2.push(blankULine())
    p2.push(blankULine())
  }

  // Уровень нарушений
  const disLevel = String(con.disorder_level || "")
  const reactType = String(con.reaction_type || "")
  p2.push(new Paragraph({
    spacing: { before: 60, after: 20 },
    children: [
      t("Уровень нарушений: ", { bold: true }),
      t(disLevel || "___", { underline: true }),
      t(" психотический / дефицитарный. Исходя из данных истории болезни, анамнеза и состояния пациента, тип реагирования определяется как: "),
      t(reactType || "эндогенный / экзогенно-органический / психогенный / смешанный"),
    ],
  }))
  if (!disLevel) p2.push(blankULine())

  // Диагноз
  const diag = d.diagnosis || {}
  const diagVal = String(diag.diagnosis_text || "")
  p2.push(sectionTitle("Диагноз:", { before: 80 }))
  if (diagVal) {
    p2.push(new Paragraph({ spacing: { after: 20 }, children: [t(diagVal)] }))
  } else {
    p2.push(blankULine())
  }

  // Код МКБ
  const icdVal = String(diag.icd_code || "").replace(/^F\s*/i, "")
  p2.push(new Paragraph({
    tabStops: [{ type: TabStopType.LEFT, position: 3000 }],
    spacing: { after: 20, before: 20 },
    children: [
      t("Код МКБ – 10: F "),
      t(icdVal || "\t", { underline: true }),
    ],
  }))
  p2.push(blankULine())

  // План обследования
  p2.push(new Paragraph({
    spacing: { before: 80, after: 0 },
    children: [
      t("План обследования ", { bold: true }),
      t("(консультации специалистов, ЭКГ, УЗИ, ФГ, ОАМ, ОАК, глюкоза крови,", { bold: true }),
    ],
  }))
  const examVal = String((d.examination_plan || {}).examination_plan_text || "")
  p2.push(new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { after: 20 },
    children: [
      t("биохимический анализ крови) ", { bold: true }),
      t((examVal || "") + "\t", { underline: true }),
    ],
  }))
  if (!examVal) {
    p2.push(blankULine())
    p2.push(blankULine())
  }

  // План лечения
  const treatVal = String((d.treatment_plan || {}).treatment_plan_text || "")
  p2.push(new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 80, after: 20 },
    children: [
      t("План лечения ", { bold: true }),
      t((treatVal || "") + "\t", { underline: true }),
    ],
  }))
  if (!treatVal) {
    p2.push(blankULine())
    p2.push(blankULine())
    p2.push(blankULine())
  }

  // Повторный осмотр
  const fu = d.follow_up || {}
  const fuDate = String(fu.follow_up_date || "")
  let fuFormatted = "«___» _____________ 20___ г."
  if (fuDate) {
    const dt = new Date(fuDate)
    if (!isNaN(dt.getTime())) {
      const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"]
      fuFormatted = `«${dt.getDate()}» ${months[dt.getMonth()]} 20${String(dt.getFullYear()).slice(2)} г.`
    }
  }
  p2.push(textLine(`Повторный осмотр ${fuFormatted}`, { before: 120 }))

  // Врач-психиатр + Подпись
  p2.push(new Paragraph({
    tabStops: [
      { type: TabStopType.LEFT, position: 5500 },
      { type: TabStopType.RIGHT, position: RIGHT_TAB },
    ],
    spacing: { before: 100, after: 20 },
    children: [
      t("Врач-психиатр "),
      t((String(fu.doctor_name || input.doctorName || "")) + "\t", { underline: true }),
      t("Подпись "),
      t("\t", { underline: true }),
    ],
  }))

  // Дата
  p2.push(new Paragraph({
    tabStops: [{ type: TabStopType.LEFT, position: 2500 }],
    spacing: { before: 40, after: 20 },
    children: [
      t("Дата "),
      t(String(fu.examination_date || input.examinationDate || "") + "\t", { underline: true }),
    ],
  }))

  // --- FOOTER ---
  const fl1 = "ИНН 7813615229, КПП 781301001, р/счет 40702810255000018946 в СЕВЕРО-ЗАПАДНЫЙ БАНК ОАО «СБЕРБАНК РОССИИ»,"
  const fl2 = "к/счет 30101810500000000653, БИК 044030653, ОКПО 31580617, ОКАТО 40288000000, ОГРН 1187847192719"
  const mkFooter = () => new Footer({
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: fl1, font: FONT, size: SZ_FOOT })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: fl2, font: FONT, size: SZ_FOOT })] }),
    ],
  })

  // Margins: top 12mm, right 15mm, bottom 15mm, left 20mm (1mm ≈ 56.7 twips)
  const margin = { top: 680, bottom: 850, left: 1134, right: 850 }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin } },
        footers: { default: mkFooter() },
        children: [buildHeaderTable(logoData, input.clinicName), ...p1],
      },
      {
        properties: { page: { margin } },
        footers: { default: mkFooter() },
        children: [buildHeaderTable(logoData, input.clinicName), ...p2],
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
