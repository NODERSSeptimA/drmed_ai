import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Navigation } from "@/components/layout/navigation"
import { SessionProvider } from "next-auth/react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen flex flex-col">
        <Navigation userName={session.user.name || "DR"} />
        <main className="flex-1 p-4 lg:p-8 xl:px-20 flex flex-col gap-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
