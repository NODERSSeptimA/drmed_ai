import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    clinicId?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      clinicId: string
    }
  }
}
