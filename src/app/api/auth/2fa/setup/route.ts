/**
 * POST /api/auth/2fa/setup
 * Génère un secret 2FA et un QR code pour l'utilisateur connecté
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';
import { generateTwoFactorSecretAsync, encrypt } from '@/lib/two-factor';
import { DebugLogger } from '@/lib/debug-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Si 2FA déjà activé, refuser (doit désactiver d'abord)
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA déjà activé. Désactivez-le d\'abord pour le réinitialiser.' },
        { status: 400 }
      );
    }

    // Générer le secret et le QR code
    const { secret, qrCodeUrl, backupCodes } = await generateTwoFactorSecretAsync(
      user.email
    );

    // Chiffrer le secret et les codes de backup
    const encryptedSecret = encrypt(secret);
    const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

    // Stocker temporairement (non activé tant que pas vérifié)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        twoFactorEnabled: false, // Pas encore activé
      },
    });

    // Log
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'SETUP_2FA',
      method: 'POST',
      endpoint: '/api/auth/2fa/setup',
      status: 'SUCCESS',
      message: `Setup 2FA initié pour ${user.email}`,
      requestData: {
        userId: user.id,
        email: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      backupCodes, // À afficher une seule fois
      secret, // Pour tests manuels (optionnel)
    });
  } catch (error) {
    console.error('Erreur setup 2FA:', error);

    await DebugLogger.log({
      category: 'LICENSE',
      action: 'SETUP_2FA',
      method: 'POST',
      endpoint: '/api/auth/2fa/setup',
      status: 'ERROR',
      message: 'Erreur setup 2FA',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Erreur lors du setup 2FA' },
      { status: 500 }
    );
  }
}
