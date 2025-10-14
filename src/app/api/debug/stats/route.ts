import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Calcul des statistiques à partir des vraies données
    let stats: any;

    try {
      const debugLogModel = (prisma as any).debugLog;
      
      if (debugLogModel) {
        // Récupération des statistiques réelles
        const [
          totalLogs,
          categoriesStats,
          statusStats,
          recentLogs24h,
          recentLogs7d,
          topClients,
          topActions,
          avgDuration,
        ] = await Promise.all([
          // Total des logs
          debugLogModel.count(),
          
          // Stats par catégorie
          debugLogModel.groupBy({
            by: ['category'],
            _count: { category: true },
            orderBy: { _count: { category: 'desc' } },
          }),
          
          // Stats par statut
          debugLogModel.groupBy({
            by: ['status'],
            _count: { status: true },
            orderBy: { _count: { status: 'desc' } },
          }),
          
          // Logs des dernières 24h
          debugLogModel.count({
            where: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          }),
          
          // Logs des 7 derniers jours
          debugLogModel.count({
            where: {
              timestamp: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          }),
          
          // Top clients
          debugLogModel.groupBy({
            by: ['clientName'],
            _count: { clientName: true },
            where: { clientName: { not: null } },
            orderBy: { _count: { clientName: 'desc' } },
            take: 5,
          }),
          
          // Top actions
          debugLogModel.groupBy({
            by: ['action'],
            _count: { action: true },
            orderBy: { _count: { action: 'desc' } },
            take: 5,
          }),
          
          // Durée moyenne
          debugLogModel.aggregate({
            _avg: { duration: true },
            where: { duration: { not: null } },
          }),
        ]);

        // Récupération de l'activité récente pour chaque catégorie
        const categoryActivity = await Promise.all(
          categoriesStats.map(async (cat: any) => {
            const lastActivity = await debugLogModel.findFirst({
              where: { category: cat.category },
              orderBy: { timestamp: 'desc' },
              select: { timestamp: true },
            });
            return {
              category: cat.category,
              count: cat._count.category,
              lastActivity: lastActivity?.timestamp || new Date(),
            };
          })
        );

        // Client et action les plus actifs
        const mostActiveClient = topClients[0]?.clientName || 'Aucun';
        const mostActiveAction = topActions[0]?.action || 'Aucune';

        stats = {
          totalLogs,
          categoriesStats: categoryActivity,
          statusStats: statusStats.map((stat: any) => ({
            status: stat.status,
            count: stat._count.status,
          })),
          recentActivity: {
            logsLast24h: recentLogs24h,
            logsLast7d: recentLogs7d,
            mostActiveClient,
            mostActiveAction,
            averageResponseTime: Math.round(avgDuration._avg.duration || 0),
          },
          topClients: topClients.map((client: any) => ({
            clientName: client.clientName,
            count: client._count.clientName,
          })),
          topActions: topActions.map((action: any) => ({
            action: action.action,
            count: action._count.action,
          })),
        };
      } else {
        throw new Error('Modèle DebugLog non disponible');
      }
    } catch (error) {
      console.warn('Utilisation des données fictives:', error);
      
      // Fallback vers des données fictives
      stats = {
        totalLogs: 0,
        categoriesStats: [],
        statusStats: [],
        recentActivity: {
          logsLast24h: 0,
          logsLast7d: 0,
          mostActiveClient: 'Aucun',
          mostActiveAction: 'Aucune',
          averageResponseTime: 0,
        },
        topClients: [],
        topActions: [],
      };
    }

    // Récupération des filtres disponibles
    const filters = {
      categories: [
        'SYNC',
        'PUSH_API', 
        'LICENSE',
        'API_USAGE',
        'POI',
        'AUTH',
        'PRICING',
        'SYSTEM',
        'ERROR'
      ],
      statuses: [
        'SUCCESS',
        'INFO',
        'WARNING',
        'ERROR'
      ],
      // Actions récentes (top 20)
      recentActions: [
        'sync_statistics',
        'push_api_keys',
        'license_verification',
        'poi_sync',
        'api_usage_update',
        'create_license',
        'update_license',
        'delete_license',
        'sync_email_stats',
        'sync_sms_stats',
        'sync_deepl_stats',
        'sync_openai_stats',
        'push_openai_key',
        'push_deepl_key',
        'verify_license_token',
        'associate_license',
        'disassociate_license',
        'pricing_calculation',
        'user_authentication',
        'api_rate_limit_exceeded',
      ],
      // Clients actifs (avec leurs IDs)
      activeClients: [
        { id: 'license_1', name: 'Client Premium 1' },
        { id: 'license_2', name: 'Client Standard 2' },
        { id: 'license_3', name: 'Client Pro 3' },
        { id: 'license_4', name: 'Client Basic 1' },
        { id: 'license_5', name: 'Client Enterprise' },
      ],
    };

    return NextResponse.json({
      stats,
      filters,
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de debug:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}