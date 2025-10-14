import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

interface DebugLogFilters {
  readonly category?: string;
  readonly status?: string;
  readonly action?: string;
  readonly licenseId?: string;
  readonly clientName?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly search?: string;
}

interface SortOptions {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

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

    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Filtres
    const filters: DebugLogFilters = {
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      action: searchParams.get('action') || undefined,
      licenseId: searchParams.get('licenseId') || undefined,
      clientName: searchParams.get('clientName') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Tri
    const sortField = searchParams.get('sortField') || 'timestamp';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

    // Construction de la requête WHERE
    const whereClause: any = {};

    if (filters.category && filters.category !== 'ALL') {
      whereClause.category = filters.category;
    }

    if (filters.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }

    if (filters.action) {
      whereClause.action = {
        contains: filters.action,
        mode: 'insensitive',
      };
    }

    if (filters.licenseId) {
      whereClause.licenseId = filters.licenseId;
    }

    if (filters.clientName) {
      whereClause.clientName = {
        contains: filters.clientName,
        mode: 'insensitive',
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.timestamp = {};
      if (filters.dateFrom) {
        whereClause.timestamp.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        whereClause.timestamp.lte = new Date(filters.dateTo);
      }
    }

    // Recherche globale
    if (filters.search) {
      whereClause.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
        { clientName: { contains: filters.search, mode: 'insensitive' } },
        { endpoint: { contains: filters.search, mode: 'insensitive' } },
        { errorDetails: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Exécution des requêtes en parallèle
    let logs: any[] = [];
    let totalCount = 0;

    try {
      // Utilisation des vraies données depuis la base
      const debugLogModel = (prisma as any).debugLog;
      
      if (debugLogModel) {
        [logs, totalCount] = await Promise.all([
          debugLogModel.findMany({
            where: whereClause,
            orderBy: {
              [sortField]: sortDirection,
            },
            skip: offset,
            take: limit,
            include: {
              license: {
                select: {
                  licenseKey: true,
                  clientName: true,
                },
              },
            },
          }),
          debugLogModel.count({
            where: whereClause,
          }),
        ]);
      } else {
        // Fallback vers des données fictives si le modèle n'existe pas encore
        logs = [
          {
            id: '1',
            category: 'SYNC',
            action: 'sync_statistics',
            method: 'POST',
            endpoint: '/api/statistics/sync',
            licenseId: null,
            clientName: 'Client Test 1',
            status: 'SUCCESS',
            message: 'Synchronisation réussie (données fictives)',
            requestData: { type: 'email_stats' },
            responseData: { synced: 150 },
            duration: 1250,
            timestamp: new Date(),
            license: null
          },
        ];
        totalCount = 1;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des logs:', error);
      // Fallback vers des données fictives en cas d'erreur
      logs = [
        {
          id: 'error_1',
          category: 'ERROR',
          action: 'fetch_logs',
          method: 'GET',
          endpoint: '/api/debug/logs',
          licenseId: null,
          clientName: null,
          status: 'ERROR',
          message: 'Erreur lors de la récupération des logs',
          errorDetails: error instanceof Error ? error.message : 'Erreur inconnue',
          timestamp: new Date(),
          license: null
        },
      ];
      totalCount = 1;
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Pour l'instant, on simule la création
    // const newLog = await prisma.debugLog.create({
    //   data: body,
    // });

    const newLog = {
      id: Date.now().toString(),
      ...body,
      timestamp: new Date(),
    };

    return NextResponse.json(newLog, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création du log:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const category = searchParams.get('category');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const whereClause: any = {
      timestamp: {
        lt: cutoffDate,
      },
    };

    if (category) {
      whereClause.category = category;
    }

    // Pour l'instant, on simule la suppression
    // const deletedCount = await prisma.debugLog.deleteMany({
    //   where: whereClause,
    // });

    const deletedCount = { count: 0 };

    return NextResponse.json({
      message: `${deletedCount.count} logs supprimés`,
      deletedCount: deletedCount.count,
    });

  } catch (error) {
    console.error('Erreur lors de la suppression des logs:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}