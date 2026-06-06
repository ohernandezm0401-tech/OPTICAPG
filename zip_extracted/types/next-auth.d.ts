import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      empresaId: string
      sedeId: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    empresaId?: string
    sedeId?: string
    role?: string
  }
}

declare module "@auth/core/types" {
  interface Session {
    user: {
      empresaId: string
      sedeId: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    empresaId?: string
    sedeId?: string
    role?: string
  }
}
