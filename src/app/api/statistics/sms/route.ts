import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';

// GET /api/statistics/sms - Récupérer les statistiques SMS
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

    const stats = await prisma.smsStats.findMany({
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
      totalSent: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.smsSent, 0),
      totalDelivered: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.smsDelivered, 0),
      totalFailed: stats.reduce((sum: number, s: typeof stats[0]) => sum + s.smsFailed, 0),
      totalCost: stats.reduce((sum: number, s: typeof stats[0]) => sum + Number(s.totalCost), 0),
    };

    const deliveryRate =
      totals.totalSent > 0
        ? ((totals.totalDelivered / totals.totalSent) * 100).toFixed(2)
        : '0';

    return NextResponse.json({
      stats,
      totals: {
        ...totals,
        totalCost: totals.totalCost.toFixed(2),
        deliveryRate: `${deliveryRate}%`,
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/statistics/sms:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
