import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

/**
 * GET /api/debug/stats - Récupère les statistiques des logs
 * SIMPLIFIÉ - Même structure que /api/licenses
 */
export async function GET() {
  try {
    // Auth
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Stats simples
    const [
      totalLogs,
      logsLast24h,
      categories,
      statuses,
    ] = await Promise.all([
      prisma.debugLog.count(),
      prisma.debugLog.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.debugLog.groupBy({
        by: ['category'],
        _count: true,
      }),
      prisma.debugLog.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return NextResponse.json({
      totalLogs,
      logsLast24h,
      categories: categories.map(c => ({
        category: c.category,
        count: c._count,
      })),
      statuses: statuses.map(s => ({
        status: s.status,
        count: s._count,
      })),
      filters: {
        categories: ['ALL', ...categories.map(c => c.category)],
        statuses: ['ALL', ...statuses.map(s => s.status)],
      },
    });

  } catch (error) {
    console.error('Erreur GET /api/debug/stats:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
