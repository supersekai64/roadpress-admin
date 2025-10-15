import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const totalLogs = await prisma.debugLog.count();

    // Récupérer les catégories et statuts uniques depuis la base de données
    const [categories, statuses] = await Promise.all([
      prisma.debugLog.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      prisma.debugLog.findMany({
        select: { status: true },
        distinct: ['status'],
        orderBy: { status: 'asc' },
      }),
    ]);

    const uniqueCategories = categories.map((c) => c.category).filter(Boolean);
    const uniqueStatuses = statuses.map((s) => s.status).filter(Boolean);

    return NextResponse.json({
      totalLogs,
      logsLast24h: 0,
      categories: uniqueCategories,
      statuses: uniqueStatuses,
      filters: {
        categories: uniqueCategories,
        statuses: uniqueStatuses,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
