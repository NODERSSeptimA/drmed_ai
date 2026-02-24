import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
      doctor: { select: { name: true, email: true } },
    },
  })

  if (!history) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const priorCount = await prisma.medicalHistory.count({
    where: {
      patientId: history.patientId,
      id: { not: history.id },
      status: "completed",
    },
  })

  return NextResponse.json({ ...history, isRepeatVisit: priorCount > 0 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const history = await prisma.medicalHistory.update({
    where: { id },
    data: {
      ...(body.data !== undefined ? { data: body.data } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.visitType !== undefined ? { visitType: body.visitType } : {}),
    },
  })

  return NextResponse.json(history)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await prisma.voiceSession.deleteMany({ where: { medicalHistoryId: id } })
  await prisma.medicalHistory.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
