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

    // Liste complète de toutes les catégories possibles (enum LogCategory du schema)
    const allCategories = [
      'SYNC',
      'PUSH_API',
      'LICENSE',
      'API_USAGE',
      'API_KEYS',
      'POI',
      'AUTH',
      'PRICING',
      'SYSTEM',
      'ERROR',
    ];

    // Récupérer les statuts, clients et actions uniques depuis la base de données
    const [statuses, clients, actions] = await Promise.all([
      prisma.debugLog.findMany({
        select: { status: true },
        distinct: ['status'],
        orderBy: { status: 'asc' },
      }),
      prisma.debugLog.findMany({
        where: {
          clientName: {
            not: '',
          },
        },
        select: { 
          licenseId: true,
          clientName: true,
        },
        distinct: ['clientName'],
        orderBy: { clientName: 'asc' },
      }),
      prisma.debugLog.findMany({
        where: {
          action: {
            not: '',
          },
        },
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
    ]);

    const uniqueCategories = allCategories;
    const uniqueStatuses = statuses.map((s) => s.status).filter(Boolean);
    const uniqueClients = clients
      .filter((c) => c.clientName)
      .map((c) => ({
        id: c.licenseId || '',
        name: c.clientName || '',
      }));
    const uniqueActions = actions.map((a) => a.action).filter(Boolean);

    // Calculer le temps de réponse moyen depuis minuit (00h00 aujourd'hui)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const logsWithDuration = await prisma.debugLog.findMany({
      where: {
        duration: { not: null },
        timestamp: { gte: startOfToday },
      },
      select: { duration: true },
    });
    
    const averageResponseTime = logsWithDuration.length > 0
      ? logsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / logsWithDuration.length
      : 0;

    return NextResponse.json({
      stats: {
        recentActivity: {
          averageResponseTime: Math.round(averageResponseTime),
        },
      },
      filters: {
        categories: uniqueCategories,
        statuses: uniqueStatuses,
        activeClients: uniqueClients,
        recentActions: uniqueActions,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
