"use client"

import { format } from "date-fns"
import { useState } from "react"
import { Phone, Mail, MapPin, ShieldCheck, Heart, Activity, Thermometer, Droplets, Pill, FileText, Sparkles, Upload, Pencil, Loader2, Plus, Building2, Car, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface PatientCardModalProps {
  patient: {
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
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getAge(birthDate: string) {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function PatientCardModal({ patient, open, onOpenChange }: PatientCardModalProps) {
  const router = useRouter()
  const [creatingHistory, setCreatingHistory] = useState(false)
  const [showVisitTypeChoice, setShowVisitTypeChoice] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleCreateHistory(visitType: "clinic" | "home") {
    if (!patient || creatingHistory) return
    setCreatingHistory(true)
    setShowVisitTypeChoice(false)
    try {
      const templatesRes = await fetch("/api/templates")
      const templates = await templatesRes.json()
      if (!templates.length) return
      const templateId = templates[0].id

      const res = await fetch("/api/medical-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, templateId, visitType }),
      })
      if (res.ok) {
        const history = await res.json()
        onOpenChange(false)
        router.push(`/medical-history/${history.id}`)
      }
    } finally {
      setCreatingHistory(false)
    }
  }

  async function handleDeleteHistory(historyId: string) {
    setDeletingId(historyId)
    try {
      const res = await fetch(`/api/medical-history/${historyId}`, { method: "DELETE" })
      if (res.ok && patient) {
        patient.medicalHistories = patient.medicalHistories?.filter((h) => h.id !== historyId)
        setConfirmDeleteId(null)
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (!patient) return null

  const age = getAge(patient.birthDate)
  const genderLabel = patient.gender === "male" ? "Мужчина" : "Женщина"
  const initials = `${patient.lastName[0] || ""}${patient.firstName[0] || ""}`.toUpperCase()
  const latestHistory = patient.medicalHistories?.[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[900px] sm:max-w-[900px] p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogTitle className="sr-only">Карта пациента</DialogTitle>
        <div className="flex flex-col md:flex-row min-h-[500px] max-h-[85vh] overflow-y-auto md:overflow-hidden">
          {/* Left Panel */}
          <div className="w-full md:w-[280px] bg-secondary/50 p-6 flex flex-col gap-4 border-r border-border">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-medgreen/15 text-medgreen flex items-center justify-center text-lg font-semibold mx-auto">
                {initials}
              </div>
              <h3 className="font-display text-lg font-medium">{patient.lastName} {patient.firstName}</h3>
              <p className="text-sm text-muted-foreground">{age} лет · {genderLabel}</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-medgreen" />
                <span className="text-xs text-muted-foreground">Активный пациент</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Контакты</p>
              {patient.phone && (
                <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {patient.phone}</div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {patient.email}</div>
              )}
              {patient.address && (
                <div className="flex items-center gap-2 text-sm"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {patient.address}</div>
              )}
            </div>

            {patient.allergies.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Аллергии</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.map((a) => (
                      <Badge key={a} variant="outline" className="border-warm/30 text-warm bg-warm-bg text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {patient.insuranceNumber && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Страховка</p>
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-medgreen" />
                    ОМС · {patient.insuranceNumber}
                  </div>
                </div>
              </>
            )}

            <div className="mt-auto space-y-2">
              {latestHistory && (
                <Link href={`/medical-history/${latestHistory.id}`}>
                  <Button variant="default" size="sm" className="w-full gap-2">
                    <FileText className="w-3.5 h-3.5" /> Открыть историю
                  </Button>
                </Link>
              )}
              {showVisitTypeChoice ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground text-center">Тип осмотра:</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleCreateHistory("clinic")}
                    disabled={creatingHistory}
                  >
                    {creatingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                    В клинике
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleCreateHistory("home")}
                    disabled={creatingHistory}
                  >
                    {creatingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Car className="w-3.5 h-3.5" />}
                    Выездной осмотр
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setShowVisitTypeChoice(true)}
                  disabled={creatingHistory}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Новая история болезни
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-medium">Медицинская карта</h2>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Pencil className="w-3.5 h-3.5" /> Редактировать
              </Button>
            </div>

            {/* AI Fill Bar */}
            <div className="flex items-center gap-3 bg-medgreen/5 border border-medgreen/15 rounded-xl p-3 mb-5">
              <Sparkles className="w-4 h-4 text-medgreen shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">AI Заполнение карты</p>
                <p className="text-xs text-muted-foreground">Файлы · Фото</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
                <Upload className="w-3 h-3" /> Файл
              </Button>
            </div>

            {/* Vitals */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Показатели здоровья</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <Heart className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-mono font-medium">78</p>
                <p className="text-[10px] text-muted-foreground">Пульс, уд/мин</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <Activity className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-mono font-medium">135/85</p>
                <p className="text-[10px] text-muted-foreground">Давление</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <Thermometer className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-mono font-medium">36.6</p>
                <p className="text-[10px] text-muted-foreground">Температура, °C</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <Droplets className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-mono font-medium">98%</p>
                <p className="text-[10px] text-muted-foreground">SpO₂</p>
              </div>
            </div>

            {/* Medications */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Текущие назначения</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-blue-bg flex items-center justify-center">
                  <Pill className="w-4 h-4 text-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium">Метопролол</p>
                  <p className="text-xs text-muted-foreground">50мг · 2 раза/день</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-blue-bg flex items-center justify-center">
                  <Pill className="w-4 h-4 text-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium">Лизиноприл</p>
                  <p className="text-xs text-muted-foreground">10мг · 1 раз/день</p>
                </div>
              </div>
            </div>

            {/* History */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">История визитов</p>
            <div className="space-y-2">
              {(patient.medicalHistories || []).map((history) => (
                <div key={history.id} className="flex items-center gap-3 p-3 border border-border rounded-xl group">
                  <Link
                    href={`/medical-history/${history.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-70 transition-opacity"
                  >
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {format(new Date(history.examinationDate), "dd.MM.yyyy")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{history.template?.title || "Осмотр"}</p>
                      <p className="text-xs text-muted-foreground truncate">{history.doctor?.name || ""}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-xs shrink-0",
                      history.status === "completed" ? "border-medgreen/30 text-medgreen bg-medgreen/5" : "border-warm/30 text-warm bg-warm-bg"
                    )}>
                      {history.status === "completed" ? "Завершён" : "Черновик"}
                    </Badge>
                  </Link>
                  {confirmDeleteId === history.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs px-2"
                        disabled={deletingId === history.id}
                        onClick={() => handleDeleteHistory(history.id)}
                      >
                        {deletingId === history.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Да"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Нет
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDeleteId(history.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {(!patient.medicalHistories || patient.medicalHistories.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Нет записей</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
