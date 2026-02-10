import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const templates = await prisma.template.findMany({
    where: {
      OR: [
        { clinicId: session.user.clinicId },
        { clinicId: null },
      ],
    },
    orderBy: { title: "asc" },
  })

  return NextResponse.json(templates)
}
