import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { days } = body;

    if (!days || typeof days !== 'number' || days <= 0) {
      return NextResponse.json(
        { error: 'Le nombre de jours doit être un nombre positif' },
        { status: 400 }
      );
    }

    // Calculer la date limite
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    // Supprimer les logs plus anciens que la date limite
    const result = await prisma.debugLog.deleteMany({
      where: {
        timestamp: {
          lt: dateLimit,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `${result.count} log(s) supprimé(s) (plus de ${days} jours)`,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
