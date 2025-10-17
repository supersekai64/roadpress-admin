/**
 * API Route : Vérification 2FA avant connexion
 * 
 * Vérifie les identifiants (email + password) et retourne si le 2FA est activé.
 * Cela permet de décider AVANT l'appel à signIn() s'il faut rediriger vers /login/2fa.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getTrustedDeviceCookie, isTrustedDevice } from '@/lib/trusted-device';

const checkSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

/**
 * POST /api/auth/2fa/check
 * Vérifie les credentials et retourne l'état 2FA
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedFields = checkSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides' },
        { status: 400 }
      );
    }

    const { email, password } = validatedFields.data;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe invalide' },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe invalide' },
        { status: 401 }
      );
    }

    // Vérifier si appareil de confiance (Remember Device)
    const trustedDeviceToken = await getTrustedDeviceCookie();
    let isTrusted = false;

    if (trustedDeviceToken) {
      const { trusted, userId: trustedUserId } = await isTrustedDevice(trustedDeviceToken);
      isTrusted = trusted && trustedUserId === user.id;
    }

    // Si 2FA activé ET pas appareil de confiance → 2FA requis
    if (user.twoFactorEnabled && !isTrusted) {
      return NextResponse.json({
        success: true,
        requires2FA: true,
        userId: user.id,
      });
    }

    // Pas de 2FA requis (désactivé ou appareil de confiance)
    return NextResponse.json({
      success: true,
      requires2FA: false,
    });
  } catch (error) {
    console.error('[2FA CHECK ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
