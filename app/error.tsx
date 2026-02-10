"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="font-display text-xl font-medium">Что-то пошло не так</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Произошла ошибка при загрузке страницы. Попробуйте обновить или вернуться назад.
        </p>
        <Button onClick={reset}>Попробовать снова</Button>
      </div>
    </div>
  )
}
