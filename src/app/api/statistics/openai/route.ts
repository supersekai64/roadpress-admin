import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';

// GET /api/statistics/openai - Récupérer les statistiques OpenAI
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
    const statsRaw = await prisma.openaiStats.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        requestsCount: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        totalCost: true,
      },
    });

    // Grouper par jour (format YYYY-MM-DD)
    const groupedByDay = statsRaw.reduce((acc: Record<string, { createdAt: Date; requestsCount: number; promptTokens: number; completionTokens: number; totalTokens: number; totalCost: number }>, stat) => {
      const dayKey = stat.createdAt.toISOString().split('T')[0];
      if (!acc[dayKey]) {
        acc[dayKey] = { createdAt: new Date(dayKey), requestsCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, totalCost: 0 };
      }
      acc[dayKey].requestsCount += stat.requestsCount;
      acc[dayKey].promptTokens += stat.promptTokens;
      acc[dayKey].completionTokens += stat.completionTokens;
      acc[dayKey].totalTokens += stat.totalTokens;
      acc[dayKey].totalCost += Number(stat.totalCost);
      return acc;
    }, {});

    // Remplir tous les jours entre startDate et endDate (même ceux sans données)
    const allDays: Record<string, { createdAt: Date; requestsCount: number; promptTokens: number; completionTokens: number; totalTokens: number; totalCost: number }> = {};
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dayKey = currentDate.toISOString().split('T')[0];
      allDays[dayKey] = groupedByDay[dayKey] || { createdAt: new Date(dayKey), requestsCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, totalCost: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Convertir en tableau
    const stats = Object.values(allDays).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const totals = {
      totalRequests: stats.reduce((sum, s) => sum + s.requestsCount, 0),
      totalPromptTokens: stats.reduce((sum, s) => sum + s.promptTokens, 0),
      totalCompletionTokens: stats.reduce((sum, s) => sum + s.completionTokens, 0),
      totalTokens: stats.reduce((sum, s) => sum + s.totalTokens, 0),
      totalCost: stats.reduce((sum, s) => sum + s.totalCost, 0),
    };

    return NextResponse.json({
      stats,
      totals: {
        ...totals,
        totalCost: totals.totalCost.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/statistics/openai:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
