import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/statistics/deepl - Récupérer les statistiques DeepL
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const licenseId = searchParams.get('licenseId');

    const now = new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    const whereClause: { createdAt?: { gte: Date; lte: Date }; licenseId?: string } = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (licenseId && licenseId !== 'all') {
      whereClause.licenseId = licenseId;
    }

    const stats = await prisma.deeplStats.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: {
        license: {
          select: {
            clientName: true,
            licenseKey: true,
          },
        },
      },
    });

    const totals = {
      totalTranslations: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.translationsCount, 0),
      totalCharacters: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.charactersTranslated, 0),
    };

    return NextResponse.json({
      stats,
      totals,
    });
  } catch (error) {
    console.error('Erreur GET /api/statistics/deepl:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
