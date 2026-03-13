import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { PermissionKey } from "@/types/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      tenantId: string;
      roleId: string;
      roleName: string;
      permissions: PermissionKey[];
      onboardingComplete: boolean;
    };
  }

  interface User {
    tenantId: string;
    roleId: string;
    roleName: string;
    permissions: PermissionKey[];
    onboardingComplete: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    tenantId: string;
    roleId: string;
    roleName: string;
    permissions: PermissionKey[];
    onboardingComplete: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const users = await prisma.user.findMany({
          where: { email, isActive: true },
          include: { role: true, tenant: true },
        });

        if (users.length === 0) {
          logger.warn({ email }, "Login failed: user not found");
          return null;
        }

        // Use the first active user found (for single-tenant login)
        // Multi-tenant disambiguation handled by tenant slug in login form
        const user = users[0];

        if (!user.passwordHash) {
          logger.warn({ email }, "Login failed: no password set");
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          logger.warn({ email }, "Login failed: invalid password");
          return null;
        }

        if (!user.tenant.isActive) {
          logger.warn(
            { email, tenantId: user.tenantId },
            "Login failed: tenant inactive"
          );
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        logger.info(
          { userId: user.id, tenantId: user.tenantId },
          "User logged in"
        );

        const permissions = (user.role.permissions as string[]) || [];

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions: permissions as PermissionKey[],
          onboardingComplete: user.tenant.onboardingComplete,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.tenantId = user.tenantId;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
        token.onboardingComplete = user.onboardingComplete;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.tenantId = token.tenantId;
      session.user.roleId = token.roleId;
      session.user.roleName = token.roleName;
      session.user.permissions = token.permissions;
      session.user.onboardingComplete = token.onboardingComplete;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
