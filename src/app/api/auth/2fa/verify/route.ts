/**
 * POST /api/auth/2fa/verify
 * Vérifie un token 2FA et active le 2FA si c'est le premier setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';
import { verifyTwoFactorToken, verifyBackupCode, decrypt, encrypt } from '@/lib/two-factor';
import { DebugLogger } from '@/lib/debug-logger';

interface VerifyRequest {
  token: string;
  isSetup?: boolean; // true lors du setup initial
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body: VerifyRequest = await request.json();
    const { token, isSetup = false } = body;

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: 'Token invalide (6 chiffres requis)' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA non configuré. Configurez-le d\'abord.' },
        { status: 400 }
      );
    }

    // Déchiffrer le secret
    const secret = decrypt(user.twoFactorSecret);

    // Vérifier le token TOTP
    const isValid = verifyTwoFactorToken(secret, token);

    if (!isValid) {
      // Log tentative échouée
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'VERIFY_2FA',
        method: 'POST',
        endpoint: '/api/auth/2fa/verify',
        status: 'WARNING',
        message: `Échec vérification 2FA pour ${user.email}`,
        requestData: {
          userId: user.id,
          email: user.email,
          tokenLength: token.length,
        },
      });

      return NextResponse.json(
        { success: false, message: 'Code invalide' },
        { status: 401 }
      );
    }

    // Si c'est le setup initial, activer le 2FA
    if (isSetup && !user.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      });

      await DebugLogger.log({
        category: 'LICENSE',
        action: 'ENABLE_2FA',
        method: 'POST',
        endpoint: '/api/auth/2fa/verify',
        status: 'SUCCESS',
        message: `2FA activé avec succès pour ${user.email}`,
        requestData: {
          userId: user.id,
          email: user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: '2FA activé avec succès',
        enabled: true,
      });
    }

    // Vérification simple (login)
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'VERIFY_2FA',
      method: 'POST',
      endpoint: '/api/auth/2fa/verify',
      status: 'SUCCESS',
      message: `2FA vérifié pour ${user.email}`,
      requestData: {
        userId: user.id,
        email: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Code valide',
    });
  } catch (error) {
    console.error('Erreur vérification 2FA:', error);

    await DebugLogger.log({
      category: 'LICENSE',
      action: 'VERIFY_2FA',
      method: 'POST',
      endpoint: '/api/auth/2fa/verify',
      status: 'ERROR',
      message: 'Erreur vérification 2FA',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
