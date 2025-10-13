import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/statistics/sms/by-country - Récupérer les statistiques SMS par pays
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

    const whereClause: { sendDate?: { gte: Date; lte: Date }; licenseId?: string; status?: string } = {
      sendDate: { gte: startDate, lte: endDate },
      status: 'delivered', // Ne compter que les SMS délivrés
    };

    if (licenseId && licenseId !== 'all') {
      whereClause.licenseId = licenseId;
    }

    // Récupérer tous les logs SMS
    const smsLogs = await prisma.smsLog.findMany({
      where: whereClause,
      select: {
        country: true,
        cost: true,
      },
    });

    // Grouper par pays
    const byCountry = smsLogs.reduce((acc: Record<string, { count: number; totalCost: number }>, log) => {
      const country = log.country || 'Inconnu';
      if (!acc[country]) {
        acc[country] = { count: 0, totalCost: 0 };
      }
      acc[country].count += 1;
      acc[country].totalCost += Number(log.cost);
      return acc;
    }, {});

    // Transformer en tableau pour l'affichage
    const result = Object.entries(byCountry)
      .map(([country, data]) => ({
        country,
        count: data.count,
        totalCost: Number(data.totalCost.toFixed(4)),
        averageCost: Number((data.totalCost / data.count).toFixed(4)),
      }))
      .sort((a, b) => b.count - a.count); // Trier par nombre de SMS décroissant

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des stats SMS par pays:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
