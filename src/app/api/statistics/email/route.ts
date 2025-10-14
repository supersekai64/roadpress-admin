import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';

// GET /api/statistics/email - Récupérer les statistiques email
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const licenseId = searchParams.get('licenseId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Utiliser les dates personnalisées si fournies, sinon utiliser le dernier mois
    const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    // Ajouter 1 jour à endDate pour inclure toute la journée (23:59:59)
    const endDateInclusive = new Date(endDate);
    endDateInclusive.setDate(endDateInclusive.getDate() + 1);

    // Construire la requête avec filtres
    const whereClause: { createdAt?: { gte: Date; lt: Date }; licenseId?: string } = {
      createdAt: { gte: startDate, lt: endDateInclusive },
    };

    if (licenseId && licenseId !== 'all') {
      whereClause.licenseId = licenseId;
    }

    // Récupérer les stats et les grouper par jour
    const statsRaw = await prisma.emailStats.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        emailsSent: true,
      },
    });

    // Grouper par jour (format YYYY-MM-DD)
    const groupedByDay = statsRaw.reduce((acc: Record<string, { createdAt: Date; emailsSent: number }>, stat) => {
      const dayKey = stat.createdAt.toISOString().split('T')[0];
      if (!acc[dayKey]) {
        acc[dayKey] = { createdAt: new Date(dayKey), emailsSent: 0 };
      }
      acc[dayKey].emailsSent += stat.emailsSent;
      return acc;
    }, {});

    // Remplir tous les jours entre startDate et endDate (même ceux sans données)
    const allDays: Record<string, { createdAt: Date; emailsSent: number }> = {};
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      const dayKey = currentDate.toISOString().split('T')[0];
      allDays[dayKey] = groupedByDay[dayKey] || { createdAt: new Date(dayKey), emailsSent: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Convertir en tableau
    const stats = Object.values(allDays).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Calculer les totaux
    const totals = {
      totalSent: stats.reduce((sum, s) => sum + s.emailsSent, 0),
    };

    return NextResponse.json({
      stats,
      totals,
    });
  } catch (error) {
    console.error('Erreur GET /api/statistics/email:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
