import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { authConfig } from './auth.config';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true,
            twoFactorEnabled: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        // Vérifier si le 2FA a déjà été validé (cookie de vérification)
        const cookieStore = await cookies();
        const twoFactorVerified = cookieStore.get('2fa_verified')?.value;

        // Si 2FA activé ET pas encore vérifié : bloquer la connexion
        if (user.twoFactorEnabled && twoFactorVerified !== user.id) {
          // Signal spécial : erreur avec code "2FA_REQUIRED"
          throw new Error('2FA_REQUIRED:' + user.id);
        }

        // Si 2FA vérifié : nettoyer le cookie et autoriser la connexion
        if (twoFactorVerified === user.id) {
          cookieStore.delete('2fa_verified');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
