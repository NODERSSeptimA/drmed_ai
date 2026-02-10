import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPatientSchema } from "@/lib/validations/patient"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search") || ""

  const patients = await prisma.patient.findMany({
    where: {
      clinicId: session.user.clinicId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { middleName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      medicalHistories: {
        orderBy: { examinationDate: "desc" },
        take: 1,
        select: { id: true, status: true, examinationDate: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(patients)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const result = createPatientSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        ...result.data,
        birthDate: new Date(result.data.birthDate),
        clinicId: session.user.clinicId,
      },
    })

    return NextResponse.json(patient, { status: 201 })
  } catch (e) {
    console.error("Patient create error:", e, "clinicId:", session.user.clinicId)
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 })
  }
}
