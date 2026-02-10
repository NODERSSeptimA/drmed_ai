"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Patient {
  id: string
  firstName: string
  lastName: string
  middleName?: string | null
  birthDate: string
  gender: string
  phone?: string | null
  medicalHistories?: Array<{
    id: string
    status: string
    examinationDate: string
  }>
}

interface PatientListProps {
  patients: Patient[]
  onPatientClick: (patient: Patient) => void
}

const avatarColors: Record<string, string> = {
  "0": "bg-medgreen/15 text-medgreen",
  "1": "bg-warm-bg text-warm",
  "2": "bg-blue-bg text-blue",
  "3": "bg-secondary text-muted-foreground",
}

function getInitials(firstName: string, lastName: string) {
  return `${lastName[0] || ""}${firstName[0] || ""}`.toUpperCase()
}

function getStatusBadge(status?: string) {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="border-medgreen/30 text-medgreen bg-medgreen/5">Завершён</Badge>
    case "draft":
      return <Badge variant="outline" className="border-warm/30 text-warm bg-warm-bg">Черновик</Badge>
    default:
      return <Badge variant="outline" className="border-border text-muted-foreground">Нет осмотра</Badge>
  }
}

export function PatientList({ patients, onPatientClick }: PatientListProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <h2 className="font-display text-lg font-medium">Пациенты на сегодня</h2>
        <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Все</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-2 text-xs text-muted-foreground border-b border-border">
        <span>Пациент</span>
        <span className="w-16 text-center">Время</span>
        <span className="w-20 text-center">Тип</span>
        <span className="w-24 text-center">Статус</span>
      </div>
      {patients.map((patient, i) => {
        const colorKey = String(i % 4)
        const latestHistory = patient.medicalHistories?.[0]
        const time = latestHistory ? format(new Date(latestHistory.examinationDate), "HH:mm") : "—"

        return (
          <div
            key={patient.id}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
            onClick={() => onPatientClick(patient)}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", avatarColors[colorKey])}>
                {getInitials(patient.firstName, patient.lastName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{patient.lastName} {patient.firstName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {patient.middleName || ""}
                </p>
              </div>
            </div>
            <span className="text-sm font-mono text-center w-16">{time}</span>
            <div className="w-20 flex justify-center">
              <Badge variant="outline" className="border-medgreen/30 text-medgreen bg-medgreen/5">Очно</Badge>
            </div>
            <div className="w-24 flex justify-center">
              {getStatusBadge(latestHistory?.status)}
            </div>
          </div>
        )
      })}
      {patients.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Нет пациентов
        </div>
      )}
    </div>
  )
}
