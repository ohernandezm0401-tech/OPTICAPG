import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    sedeId?: string;
    user: {
      empresaId: string;
      sedeId: string;
      role: string;
      sesionId?: string;
      devLocal?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    empresaId?: string;
    sedeId?: string;
    role?: string;
    sedesAccess?: string[];
    sesionId?: string;
    devLocal?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    empresaId?: string;
    sedeId?: string;
    role?: string;
    sedesAccess?: string[];
    sesionId?: string;
    devLocal?: boolean;
  }
}

declare module '@auth/core/types' {
  interface Session {
    user: {
      empresaId: string;
      sedeId: string;
      role: string;
      sesionId?: string;
      devLocal?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    empresaId?: string;
    sedeId?: string;
    role?: string;
    sedesAccess?: string[];
    sesionId?: string;
    devLocal?: boolean;
  }
}
