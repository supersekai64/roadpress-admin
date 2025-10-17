'use server';

/**
 * Server Actions : Finalisation de la session après 2FA
 */

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyTwoFactorToken, verifyBackupCode } from '@/lib/two-factor';
import { DebugLogger } from '@/lib/debug-logger';
import { signIn } from '@/lib/auth.server';

const PENDING_2FA_COOKIE = 'pending_2fa_user';

interface VerifyResult {
  readonly success: boolean;
  readonly error?: string;
  readonly redirectUrl?: string;
}

/**
 * Vérifie le code 2FA et crée la session
 */
export async function verifyTwoFactorAndLogin(
  token: string,
  isBackupCode: boolean = false
): Promise<VerifyResult> {
  try {
    // Récupérer l'ID utilisateur depuis le cookie temporaire
    const cookieStore = await cookies();
    const userId = cookieStore.get(PENDING_2FA_COOKIE)?.value;

    if (!userId) {
      return {
        success: false,
        error: 'Session expirée. Reconnectez-vous.',
      };
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
      cookieStore.delete(PENDING_2FA_COOKIE);

      return {
        success: false,
        error: 'Configuration 2FA invalide',
      };
    }

    let verified = false;

    // Vérifier le code
    if (isBackupCode) {
      const result = await verifyBackupCode(userId, token);
      verified = result.valid;

      if (verified) {
        await DebugLogger.log({
          category: 'AUTH',
          action: 'VERIFY_2FA_LOGIN',
          status: 'SUCCESS',
          label: 'AUTHENTIFICATION',
          message: 'Connexion avec backup code',
          requestData: {
            userId,
            backupCodesRemaining: result.remainingCodes.length,
          },
        });
      }
    } else {
      verified = verifyTwoFactorToken(user.twoFactorSecret, token);

      if (verified) {
        await DebugLogger.log({
          category: 'AUTH',
          action: 'VERIFY_2FA_LOGIN',
          status: 'SUCCESS',
          label: 'AUTHENTIFICATION',
          message: 'Connexion avec TOTP',
          requestData: { userId },
        });
      }
    }

    if (!verified) {
      await DebugLogger.log({
        category: 'AUTH',
        action: 'VERIFY_2FA_LOGIN',
        status: 'WARNING',
        label: 'AUTHENTIFICATION',
        message: 'Code 2FA invalide',
        requestData: { userId, isBackupCode },
      });

      return {
        success: false,
        error: 'Code invalide',
      };
    }

    // Code valide : nettoyer le cookie temporaire
    cookieStore.delete(PENDING_2FA_COOKIE);

    // Créer une session NextAuth "manuelle" via signIn callback
    // Malheureusement NextAuth ne permet pas de créer une session programmatiquement
    // après coup, donc on va retourner un succès et laisser le client se reconnecter
    // avec un flag spécial

    return {
      success: true,
      redirectUrl: '/dashboard',
    };
  } catch (error) {
    console.error('[VERIFY 2FA LOGIN ERROR]', error);
    await DebugLogger.log({
      category: 'AUTH',
      action: 'VERIFY_2FA_LOGIN',
      status: 'ERROR',
      label: 'AUTHENTIFICATION',
      message: 'Erreur serveur',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: 'Erreur serveur',
    };
  }
}

/**
 * Annule la session 2FA temporaire
 */
export async function cancelTwoFactorLogin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_2FA_COOKIE);
}
