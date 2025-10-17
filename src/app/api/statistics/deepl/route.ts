import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';

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

    // Ajouter 1 jour à endDate pour inclure toute la journée (23:59:59)
    const endDateInclusive = new Date(endDate);
    endDateInclusive.setDate(endDateInclusive.getDate() + 1);

    const whereClause: { createdAt?: { gte: Date; lt: Date }; licenseId?: string } = {
      createdAt: { gte: startDate, lt: endDateInclusive },
    };

    if (licenseId && licenseId !== 'all') {
      whereClause.licenseId = licenseId;
    }

    // Récupérer les stats et les grouper par jour
    const statsRaw = await prisma.deeplStats.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        translationsCount: true,
        charactersTranslated: true,
      },
    });

    // Grouper par jour (format YYYY-MM-DD)
    const groupedByDay = statsRaw.reduce((acc: Record<string, { createdAt: Date; translationsCount: number; charactersTranslated: number }>, stat) => {
      const dayKey = stat.createdAt.toISOString().split('T')[0];
      if (!acc[dayKey]) {
        acc[dayKey] = { createdAt: new Date(dayKey), translationsCount: 0, charactersTranslated: 0 };
      }
      acc[dayKey].translationsCount += stat.translationsCount;
      acc[dayKey].charactersTranslated += stat.charactersTranslated;
      return acc;
    }, {});

    // Remplir tous les jours entre startDate et endDate (même ceux sans données)
    const allDays: Record<string, { createdAt: Date; translationsCount: number; charactersTranslated: number }> = {};
    const currentDate = new Date(startDate);
    const endForLoop = new Date(endDate);
    
    while (currentDate <= endForLoop) {
      const dayKey = currentDate.toISOString().split('T')[0];
      allDays[dayKey] = groupedByDay[dayKey] || { createdAt: new Date(dayKey), translationsCount: 0, charactersTranslated: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Convertir en tableau
    const stats = Object.values(allDays).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const totals = {
      totalTranslations: stats.reduce((sum, s) => sum + s.translationsCount, 0),
      totalCharacters: stats.reduce((sum, s) => sum + s.charactersTranslated, 0),
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
