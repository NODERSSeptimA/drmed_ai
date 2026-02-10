import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const voiceSession = await prisma.voiceSession.findUnique({
    where: { id },
    include: {
      medicalHistory: {
        include: {
          patient: true,
          template: true,
        },
      },
    },
  })

  if (!voiceSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(voiceSession)
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

  const voiceSession = await prisma.voiceSession.update({
    where: { id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.conversationLog !== undefined ? { conversationLog: body.conversationLog } : {}),
      ...(body.currentSection !== undefined ? { currentSection: body.currentSection } : {}),
    },
  })

  return NextResponse.json(voiceSession)
}
