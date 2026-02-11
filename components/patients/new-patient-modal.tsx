"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { UserPlus, Sparkles, Mic, Upload, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPatientSchema, type CreatePatientInput } from "@/lib/validations/patient"
import { cn } from "@/lib/utils"
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder"

interface NewPatientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NewPatientModal({ open, onOpenChange, onCreated }: NewPatientModalProps) {
  const [loading, setLoading] = useState(false)

  const onTranscribed = useCallback((text: string) => {
    alert(`Распознанный текст:\n\n${text}`)
  }, [])

  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder({ onTranscribed })

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      allergies: [],
    },
  })

  console.log("Form errors:", errors)

  async function onSubmit(data: CreatePatientInput) {
    setLoading(true)
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        reset()
        onOpenChange(false)
        onCreated()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] p-0 gap-0">
        <DialogTitle className="flex items-center gap-3 p-5 border-b border-border m-0">
          <div className="w-10 h-10 rounded-xl bg-medgreen/15 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-medgreen" />
          </div>
          <span className="font-display text-xl font-medium">Новый пациент</span>
        </DialogTitle>

        <form id="new-patient-form" onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* AI Fill Bar */}
          <div className="flex items-center gap-3 bg-medgreen/5 border border-medgreen/15 rounded-xl p-3">
            <Sparkles className="w-4 h-4 text-medgreen shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">AI Заполнение</p>
              <p className="text-xs text-muted-foreground">Надиктуйте данные или загрузите документ</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("gap-1.5 text-xs", isRecording && "border-red-500 text-red-500")}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Mic className={cn("w-3 h-3", isRecording && "animate-pulse")} />
              )}
              {isRecording ? "Стоп" : isTranscribing ? "..." : "Голос"}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
              <Upload className="w-3 h-3" /> Файл
            </Button>
          </div>

          {/* Personal Data */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Персональные данные</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input id="lastName" placeholder="Введите фамилию" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Имя *</Label>
              <Input id="firstName" placeholder="Введите имя" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="middleName">Отчество</Label>
              <Input id="middleName" placeholder="Введите отчество" {...register("middleName")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Дата рождения *</Label>
              <Input id="birthDate" type="date" {...register("birthDate")} />
              {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Пол *</Label>
              <input type="hidden" {...register("gender")} />
              <Select onValueChange={(v) => setValue("gender", v as "male" | "female", { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Мужской</SelectItem>
                  <SelectItem value="female">Женский</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" placeholder="+7 (___) ___-__-__" {...register("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="address">Адрес</Label>
              <Input id="address" placeholder="Город, улица, дом" {...register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="email@example.com" {...register("email")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="insuranceNumber">Полис ОМС</Label>
              <Input id="insuranceNumber" placeholder="Номер полиса" {...register("insuranceNumber")} />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between p-5 border-t border-border">
          <span className="text-xs text-muted-foreground">* -- обязательные поля</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="button" disabled={loading} onClick={() => handleSubmit(onSubmit)()}>
              {loading ? "Создание..." : "Создать пациента"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
