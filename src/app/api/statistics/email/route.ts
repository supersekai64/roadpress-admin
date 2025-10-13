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

    // Construire la requête avec filtres
    const whereClause: { createdAt?: { gte: Date; lte: Date }; licenseId?: string } = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (licenseId && licenseId !== 'all') {
      whereClause.licenseId = licenseId;
    }

    // Récupérer les stats
    const stats = await prisma.emailStats.findMany({
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

    // Calculer les totaux
    const totals = {
      totalSent: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.emailsSent, 0),
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
