/**
 * GET /api/auth/2fa/status
 * Récupère le statut 2FA de l'utilisateur connecté
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        backupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Compter les codes de backup restants
    let backupCodesCount = 0;
    if (user.backupCodes) {
      try {
        const { decrypt } = await import('@/lib/two-factor');
        const codes = JSON.parse(decrypt(user.backupCodes));
        backupCodesCount = codes.length;
      } catch (error) {
        console.error('Erreur lecture backup codes:', error);
      }
    }

    return NextResponse.json({
      enabled: user.twoFactorEnabled,
      backupCodesRemaining: backupCodesCount,
    });
  } catch (error) {
    console.error('Erreur statut 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}
