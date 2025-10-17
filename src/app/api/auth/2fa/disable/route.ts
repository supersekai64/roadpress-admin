/**
 * POST /api/auth/2fa/disable
 * Désactive le 2FA pour l'utilisateur connecté
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';
import { verifyTwoFactorToken, verifyBackupCode, decrypt } from '@/lib/two-factor';
import { DebugLogger } from '@/lib/debug-logger';

interface DisableRequest {
  token?: string; // Token TOTP ou code de backup
  password: string; // Mot de passe requis pour sécurité
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body: DisableRequest = await request.json();
    const { token, password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Mot de passe requis' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Vérifier le mot de passe
    const bcrypt = await import('bcryptjs');
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'DISABLE_2FA',
        method: 'POST',
        endpoint: '/api/auth/2fa/disable',
        status: 'WARNING',
        message: `Tentative désactivation 2FA avec mauvais mot de passe : ${user.email}`,
        requestData: {
          userId: user.id,
          email: user.email,
        },
      });

      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Si 2FA activé, vérifier le token avant de désactiver
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!token) {
        return NextResponse.json(
          { error: 'Token 2FA requis car 2FA est activé' },
          { status: 400 }
        );
      }

      const secret = decrypt(user.twoFactorSecret);
      let isValid = false;

      // Vérifier si c'est un token TOTP ou un code de backup
      if (token.length === 6) {
        // Token TOTP
        isValid = verifyTwoFactorToken(secret, token);
      } else if (token.length === 8 && user.backupCodes) {
        // Code de backup
        const { valid } = verifyBackupCode(user.backupCodes, token);
        isValid = valid;
      }

      if (!isValid) {
        await DebugLogger.log({
          category: 'LICENSE',
          action: 'DISABLE_2FA',
          method: 'POST',
          endpoint: '/api/auth/2fa/disable',
          status: 'WARNING',
          message: `Échec désactivation 2FA : token invalide pour ${user.email}`,
          requestData: {
            userId: user.id,
            email: user.email,
          },
        });

        return NextResponse.json(
          { error: 'Token 2FA invalide' },
          { status: 401 }
        );
      }
    }

    // Désactiver le 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });

    await DebugLogger.log({
      category: 'LICENSE',
      action: 'DISABLE_2FA',
      method: 'POST',
      endpoint: '/api/auth/2fa/disable',
      status: 'SUCCESS',
      message: `2FA désactivé pour ${user.email}`,
      requestData: {
        userId: user.id,
        email: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA désactivé avec succès',
    });
  } catch (error) {
    console.error('Erreur désactivation 2FA:', error);

    await DebugLogger.log({
      category: 'LICENSE',
      action: 'DISABLE_2FA',
      method: 'POST',
      endpoint: '/api/auth/2fa/disable',
      status: 'ERROR',
      message: 'Erreur désactivation 2FA',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Erreur lors de la désactivation' },
      { status: 500 }
    );
  }
}
