/**
 * API Route : Finalisation connexion après vérification 2FA
 * 
 * Vérifie le code TOTP ou le backup code, puis finalise la connexion
 * en créant une session NextAuth complète.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyTwoFactorToken, verifyBackupCode, decrypt } from '@/lib/two-factor';
import { signIn } from '@/lib/auth.server';
import { createTrustedDevice, setTrustedDeviceCookie, extractDeviceInfo } from '@/lib/trusted-device';

const PENDING_2FA_COOKIE = 'pending_2fa_user';

interface CompleteLoginRequest {
  readonly token: string;
  readonly isBackupCode?: boolean;
  readonly rememberDevice?: boolean;
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
    const { token, isBackupCode = false, rememberDevice = false } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Code requis' },
        { status: 400 }
      );
    }

    // Récupérer l'ID utilisateur depuis le cookie temporaire
    const cookieStore = await cookies();
    const pendingData = cookieStore.get(PENDING_2FA_COOKIE)?.value;

    if (!pendingData) {
      return NextResponse.json(
        { error: 'Session expirée. Reconnectez-vous.' },
        { status: 401 }
      );
    }

    // Parser le cookie (format: "userId|email|password")
    const [userId] = pendingData.split('|');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Session invalide' },
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
    } else {
      // Vérifier le code TOTP
      // Déchiffrer le secret avant vérification
      const decryptedSecret = decrypt(user.twoFactorSecret);
      verified = verifyTwoFactorToken(decryptedSecret, token);
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Code invalide' },
        { status: 401 }
      );
    }

    // Code valide : nettoyer le cookie temporaire
    cookieStore.delete(PENDING_2FA_COOKIE);

    // Si "Remember Device" coché : créer un trusted device
    if (rememberDevice) {
      const deviceInfo = extractDeviceInfo(request);
      const deviceToken = await createTrustedDevice(userId, deviceInfo);
      await setTrustedDeviceCookie(deviceToken);
    }

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

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
