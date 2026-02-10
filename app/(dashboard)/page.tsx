"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, Calendar, Brain, Timer, Download, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PatientList } from "@/components/dashboard/patient-list"
import { AiChatPanel } from "@/components/dashboard/ai-chat-panel"
import { PatientCardModal } from "@/components/patients/patient-card-modal"
import { NewPatientModal } from "@/components/patients/new-patient-modal"

interface Patient {
  id: string
  firstName: string
  lastName: string
  middleName?: string | null
  birthDate: string
  gender: string
  phone?: string | null
  email?: string | null
  address?: string | null
  allergies: string[]
  insuranceNumber?: string | null
  medicalHistories?: Array<{
    id: string
    status: string
    examinationDate: string
    template?: { title: string }
    doctor?: { name: string }
  }>
}

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientCardOpen, setPatientCardOpen] = useState(false)
  const [newPatientOpen, setNewPatientOpen] = useState(false)

  const loadPatients = useCallback(async () => {
    const res = await fetch("/api/patients")
    if (res.ok) {
      setPatients(await res.json())
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/patients")
      if (res.ok) setPatients(await res.json())
    }
    load()
  }, [])

  async function handlePatientClick(patient: { id: string }) {
    const res = await fetch(`/api/patients/${patient.id}`)
    if (res.ok) {
      setSelectedPatient(await res.json())
      setPatientCardOpen(true)
    }
  }

  const today = new Date()
  const dayName = today.toLocaleDateString("ru-RU", { weekday: "long" })
  const dateStr = today.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
  const greeting = today.getHours() < 12 ? "Доброе утро" : today.getHours() < 18 ? "Добрый день" : "Добрый вечер"

  return (
    <>
      <PageHeader
        title={`${greeting}, Др. Иванова`}
        subtitle={`${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateStr} — ${patients.length} пациентов`}
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Экспорт
            </Button>
            <Button className="gap-2" onClick={() => setNewPatientOpen(true)}>
              <Plus className="w-4 h-4" /> Новый пациент
            </Button>
          </>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Пациенты сегодня"
          value={patients.length}
          change="+3 со вчера"
          icon={<TrendingUp className="w-3 h-3" />}
        />
        <MetricCard
          label="Приёмы"
          value={8}
          change="Осталось 2"
          icon={<Calendar className="w-3 h-3" />}
        />
        <MetricCard
          label="AI Консультации"
          value={24}
          change="+12% за неделю"
          icon={<Brain className="w-3 h-3" />}
        />
        <MetricCard
          label="Ожидают проверки"
          value={5}
          change="3 срочных"
          icon={<Timer className="w-3 h-3" />}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 flex-1">
        <PatientList patients={patients} onPatientClick={handlePatientClick} />
        <AiChatPanel />
      </div>

      {/* Modals */}
      <PatientCardModal
        patient={selectedPatient}
        open={patientCardOpen}
        onOpenChange={setPatientCardOpen}
      />
      <NewPatientModal
        open={newPatientOpen}
        onOpenChange={setNewPatientOpen}
        onCreated={loadPatients}
      />
    </>
  )
}
