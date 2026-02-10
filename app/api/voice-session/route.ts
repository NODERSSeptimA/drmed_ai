import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { medicalHistoryId } = await req.json()

  if (!medicalHistoryId) {
    return NextResponse.json({ error: "medicalHistoryId обязателен" }, { status: 400 })
  }

  const voiceSession = await prisma.voiceSession.create({
    data: {
      status: "active",
      medicalHistoryId,
      userId: session.user.id,
      conversationLog: [],
    },
  })

  return NextResponse.json(voiceSession)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const medicalHistoryId = searchParams.get("medicalHistoryId")

  const sessions = await prisma.voiceSession.findMany({
    where: {
      userId: session.user.id,
      ...(medicalHistoryId ? { medicalHistoryId } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(sessions)
}
