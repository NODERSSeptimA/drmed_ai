import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="font-display text-xl font-medium">Страница не найдена</h2>
        <p className="text-sm text-muted-foreground">
          Запрошенная страница не существует или была удалена.
        </p>
        <Link href="/">
          <Button>На главную</Button>
        </Link>
      </div>
    </div>
  )
}
