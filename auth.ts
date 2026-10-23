import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { getUserByEmail, verifyPassword, getUserByEmailOrCreate } from '@/lib/auth-utils';
import sql from '@/lib/db';
import { cookies } from 'next/headers';

async function getUserDefaultWorkspaceId(userId: number): Promise<number | null> {
  const result = await sql`
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ${userId} AND wm.role = 'owner'
    ORDER BY w.created_at ASC
    LIMIT 1
  `;
  return result[0]?.id || null;
}

async function getUserOnboardingStatus(userId: number): Promise<boolean> {
  const result = await sql`
    SELECT has_completed_onboarding FROM users WHERE id = ${userId}
  `;
  return result[0]?.has_completed_onboarding || false;
}

async function getUserAccessibleWorkspaceIds(userId: number): Promise<number[]> {
  const result = await sql`
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ${userId}
    UNION
    SELECT w.id FROM workspaces w
    WHERE w.created_by = ${userId}
  `;
  return result.map(r => r.id);
}

async function getUserAvatarUrl(userId: number): Promise<string | null> {
  const result = await sql`
    SELECT avatar_url FROM users WHERE id = ${userId}
  `;
  return result[0]?.avatar_url || null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'tu@email.com' },
        password: { label: 'Contraseña', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email as string);
        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name || user.email.split('@')[0],
        };
      },
    }),
  ],

  pages: {
    signIn: '/',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const email = user.email;
          const name = user.name || profile?.name || undefined;
          
          if (!email) return false;
          
          const dbUser = await getUserByEmailOrCreate(email, name);
          
          user.id = String(dbUser.id);
          
          // Store new user flag in user object for session callback
          (user as { isNewUser?: boolean }).isNewUser = !dbUser.hasCompletedOnboarding;
        } catch (error) {
          console.error('[GOOGLE SIGNIN ERROR]', error);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, user, trigger, session }) {
      // Handle user switching - if a new user logs in, COMPLETELY OVERWRITE token
      if (user) {
        // Force complete token reset - ignore any previous state
        token.sub = user.id;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.workspaceId = await getUserDefaultWorkspaceId(Number(user.id));
        token.hasCompletedOnboarding = await getUserOnboardingStatus(Number(user.id));
        token.isNewUser = (user as { isNewUser?: boolean }).isNewUser === true;
        token.avatarUrl = await getUserAvatarUrl(Number(user.id));
        
        // Clear any stale properties that might persist
        delete token.picture;
        delete token.iat;
        delete token.exp;
        delete token.jti;
      }
      
      // Check for workspace switch via cookie
      if (trigger === 'update' && session?.workspaceId !== undefined) {
        // Explicit workspace switch - validate access before setting
        const userId = Number(token.id);
        const accessibleWorkspaces = await getUserAccessibleWorkspaceIds(userId);
        
        if (accessibleWorkspaces.includes(session.workspaceId)) {
          token.workspaceId = session.workspaceId;
        } else {
          // Fallback to default if switched workspace not accessible
          token.workspaceId = await getUserDefaultWorkspaceId(userId);
        }
      } else {
        // Read from cookie on each request - but validate it belongs to current user
        const cookieStore = await cookies();
        const cookieWorkspaceId = cookieStore.get('workspace-id')?.value;
        
        if (cookieWorkspaceId) {
          const workspaceId = Number(cookieWorkspaceId);
          const userId = Number(token.id);
          
          if (userId) {
            // Verify user has access to this workspace
            const accessibleWorkspaces = await getUserAccessibleWorkspaceIds(userId);
            
            if (accessibleWorkspaces.includes(workspaceId)) {
              token.workspaceId = workspaceId;
            } else {
              // Cookie workspace not accessible - use default and let middleware handle redirect
              token.workspaceId = await getUserDefaultWorkspaceId(userId);
            }
          }
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { name?: string }).name = token.name as string;
        (session.user as { email?: string }).email = token.email as string;
        (session.user as { workspaceId?: number | null }).workspaceId = token.workspaceId as number | null;
        (session.user as { hasCompletedOnboarding?: boolean }).hasCompletedOnboarding = token.hasCompletedOnboarding as boolean | undefined;
        (session.user as { isNewUser?: boolean }).isNewUser = token.isNewUser as boolean | undefined;
        (session.user as { avatarUrl?: string | null }).avatarUrl = token.avatarUrl as string | null | undefined;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.AUTH_SECRET,
});