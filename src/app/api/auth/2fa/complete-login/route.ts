/**
 * API Route : Finalisation connexion après vérification 2FA
 * 
 * Vérifie le code TOTP ou le backup code, puis finalise la connexion
 * en créant une session NextAuth complète.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyTwoFactorToken, verifyBackupCode } from '@/lib/two-factor';
import { DebugLogger } from '@/lib/debug-logger';
import { signIn } from '@/lib/auth.server';

const PENDING_2FA_COOKIE = 'pending_2fa_user';

interface CompleteLoginRequest {
  readonly token: string;
  readonly isBackupCode?: boolean;
}

/**
 * POST /api/auth/2fa/complete-login
 * Body: { token: string, isBackupCode?: boolean }
 * 
 * Vérifie le code 2FA et finalise la connexion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CompleteLoginRequest;
    const { token, isBackupCode = false } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Code requis' },
        { status: 400 }
      );
    }

    // Récupérer l'ID utilisateur depuis le cookie temporaire
    const cookieStore = await cookies();
    const userId = cookieStore.get(PENDING_2FA_COOKIE)?.value;

    if (!userId) {
      await DebugLogger.log({
        category: 'AUTH',
        action: 'COMPLETE_LOGIN',
        method: 'POST',
        endpoint: '/api/auth/2fa/complete-login',
        status: 'ERROR',
        message: 'Session 2FA expirée',
      });

      return NextResponse.json(
        { error: 'Session expirée. Reconnectez-vous.' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      await DebugLogger.log({
        category: 'AUTH',
        action: 'COMPLETE_LOGIN',
        status: 'ERROR',
        message: '2FA non configuré ou utilisateur introuvable',
        requestData: { userId },
      });

      // Nettoyer le cookie
      cookieStore.delete(PENDING_2FA_COOKIE);

      return NextResponse.json(
        { error: 'Configuration 2FA invalide' },
        { status: 400 }
      );
    }

    let verified = false;

    // Vérifier le code
    if (isBackupCode) {
      // Vérifier et consommer un backup code
      const result = await verifyBackupCode(userId, token);
      verified = result.valid;

      if (verified) {
        await DebugLogger.log({
          category: 'AUTH',
          action: 'COMPLETE_LOGIN',
          status: 'SUCCESS',
          message: 'Connexion avec backup code',
          requestData: {
            userId,
            backupCodesRemaining: result.remainingCodes.length,
          },
        });
      }
    } else {
      // Vérifier le code TOTP
      verified = verifyTwoFactorToken(user.twoFactorSecret, token);

      if (verified) {
        await DebugLogger.log({
          category: 'AUTH',
          action: 'COMPLETE_LOGIN',
          status: 'SUCCESS',
          message: 'Connexion avec TOTP',
          requestData: { userId },
        });
      }
    }

    if (!verified) {
      await DebugLogger.log({
        category: 'AUTH',
        action: 'COMPLETE_LOGIN',
        status: 'ERROR',
        message: 'Code 2FA invalide',
        requestData: {
          userId,
          isBackupCode,
        },
      });

      return NextResponse.json(
        { error: 'Code invalide' },
        { status: 401 }
      );
    }

    // Code valide : nettoyer le cookie temporaire
    cookieStore.delete(PENDING_2FA_COOKIE);

    // Définir un cookie de vérification 2FA (valide 60 secondes)
    cookieStore.set('2fa_verified', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // 60 secondes pour se reconnecter
      path: '/',
    });

    // Retourner les données utilisateur + credentials pour reconnexion
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[COMPLETE LOGIN ERROR]', error);
    await DebugLogger.log({
      category: 'AUTH',
      action: 'COMPLETE_LOGIN',
      status: 'ERROR',
      message: 'Erreur serveur',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
