import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const licenseId = searchParams.get('licenseId');
    const year = searchParams.get('year');

    if (!licenseId || !year) {
      return NextResponse.json(
        { error: 'Paramètres manquants: licenseId et year requis' },
        { status: 400 }
      );
    }

    // Vérifier que la licence existe
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      return NextResponse.json({ error: 'Licence non trouvée' }, { status: 404 });
    }

    const yearInt = parseInt(year, 10);
    const startDate = new Date(yearInt, 0, 1); // 1er janvier
    const endDate = new Date(yearInt, 11, 31, 23, 59, 59); // 31 décembre

    // Récupérer tous les logs SMS pour ce client et cette année avec détail par pays
    const smsLogs = await prisma.smsLog.findMany({
      where: {
        licenseId,
        sendDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'delivered', // Seulement les SMS délivrés
      },
      orderBy: {
        sendDate: 'asc',
      },
    });

    // Grouper par mois
    const statsByMonth: Record<
      string,
      {
        totalSms: number;
        totalCost: number;
        byCountry: Record<string, { count: number; cost: number }>;
      }
    > = {};

    const monthNames = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];

    for (const log of smsLogs) {
      const date = new Date(log.sendDate);
      const monthKey = `${monthNames[date.getMonth()]} ${yearInt}`;

      if (!statsByMonth[monthKey]) {
        statsByMonth[monthKey] = {
          totalSms: 0,
          totalCost: 0,
          byCountry: {},
        };
      }

      statsByMonth[monthKey].totalSms += 1;
      statsByMonth[monthKey].totalCost += Number(log.cost);

      // Grouper par pays
      const country = log.country || 'Inconnu';
      if (!statsByMonth[monthKey].byCountry[country]) {
        statsByMonth[monthKey].byCountry[country] = {
          count: 0,
          cost: 0,
        };
      }

      statsByMonth[monthKey].byCountry[country].count += 1;
      statsByMonth[monthKey].byCountry[country].cost += Number(log.cost);
    }

    // Formater pour la réponse
    const result = Object.entries(statsByMonth).map(([month, data]) => ({
      month,
      totalSms: data.totalSms,
      totalCost: data.totalCost,
      byCountry: Object.entries(data.byCountry)
        .map(([country, countryData]) => ({
          country,
          count: countryData.count,
          cost: countryData.cost,
        }))
        .sort((a, b) => b.count - a.count), // Trier par nombre décroissant
    }));

    // Trier par ordre chronologique
    const sortedResult = result.sort((a, b) => {
      const monthA = monthNames.indexOf(a.month.split(' ')[0]);
      const monthB = monthNames.indexOf(b.month.split(' ')[0]);
      return monthA - monthB;
    });

    return NextResponse.json(sortedResult);
  } catch (error) {
    console.error('Erreur lors de la récupération du rapport SMS:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération du rapport' },
      { status: 500 }
    );
  }
}
