import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

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
      totalDelivered: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.emailsDelivered, 0),
      totalOpened: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.emailsOpened, 0),
      totalClicked: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.emailsClicked, 0),
      totalBounced: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.emailsBounced, 0),
      totalSpam: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.emailsSpam, 0),
    };

    const deliveryRate =
      totals.totalSent > 0
        ? ((totals.totalDelivered / totals.totalSent) * 100).toFixed(2)
        : '0';
    const openRate =
      totals.totalDelivered > 0
        ? ((totals.totalOpened / totals.totalDelivered) * 100).toFixed(2)
        : '0';
    const clickRate =
      totals.totalOpened > 0
        ? ((totals.totalClicked / totals.totalOpened) * 100).toFixed(2)
        : '0';

    return NextResponse.json({
      stats,
      totals: {
        ...totals,
        deliveryRate: `${deliveryRate}%`,
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`,
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/statistics/email:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
