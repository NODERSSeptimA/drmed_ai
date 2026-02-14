import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const search = req.nextUrl.searchParams.get("search") || ""
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 20, 50)

  if (!search.trim()) {
    return NextResponse.json({ data: [] })
  }

  const data = await prisma.icd10.findMany({
    where: {
      OR: [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { code: "asc" },
    take: limit,
  })

  return NextResponse.json({ data })
}
