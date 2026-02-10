import { NextRequest, NextResponse } from "next/server"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateDocx } from "@/lib/docx/generator"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const history = await prisma.medicalHistory.findUnique({
    where: { id },
    include: {
      patient: true,
      template: true,
      doctor: { select: { name: true } },
    },
  })

  if (!history) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const schema = history.template.schema as { sections: Array<{ id: string; title: string; fields?: Array<{ id: string; label: string; type: string; subsections?: Array<{ id: string; label: string }> }> }> }

  const buffer = await generateDocx({
    templateTitle: history.template.title,
    clinicName: "ООО «Династия-18»",
    doctorName: history.doctor.name,
    examinationDate: format(new Date(history.examinationDate), "dd.MM.yyyy", { locale: ru }),
    patientName: `${history.patient.lastName} ${history.patient.firstName} ${history.patient.middleName || ""}`.trim(),
    data: history.data as Record<string, Record<string, unknown>>,
    sections: schema.sections,
  })

  const fileName = encodeURIComponent(
    `Осмотр_${history.patient.lastName}_${format(new Date(history.examinationDate), "dd-MM-yyyy")}.docx`
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}
