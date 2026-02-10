import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const histories = await prisma.medicalHistory.findMany({
    where: { doctor: { clinicId: session.user.clinicId } },
    include: {
      patient: { select: { firstName: true, lastName: true, middleName: true } },
      template: { select: { title: true } },
      doctor: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(histories)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { patientId, templateId, data } = body

  if (!patientId || !templateId) {
    return NextResponse.json({ error: "patientId and templateId required" }, { status: 400 })
  }

  const history = await prisma.medicalHistory.create({
    data: {
      patientId,
      templateId,
      doctorId: session.user.id,
      data: data || {},
      status: "draft",
    },
  })

  return NextResponse.json(history, { status: 201 })
}
