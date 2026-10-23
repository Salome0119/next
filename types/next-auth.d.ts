import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      workspaceId?: number | null;
      hasCompletedOnboarding?: boolean;
      isNewUser?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    workspaceId?: number | null;
    hasCompletedOnboarding?: boolean;
    isNewUser?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    name?: string | null;
    email?: string | null;
    workspaceId?: number | null;
    hasCompletedOnboarding?: boolean;
    isNewUser?: boolean;
  }
}