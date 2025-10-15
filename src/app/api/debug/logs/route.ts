import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth.server';import { auth } from '@/lib/auth.server';

import prisma from '@/lib/prisma';import prisma from '@/lib/prisma';



/**// Force rebuild after project rename - 2025-10-15

 * GET /api/debug/logs - Récupère les logs de debug avec pagination et filtres

 * SIMPLIFIÉ - Copie de la structure de /api/licenses qui fonctionneinterface DebugLogFilters {

 */  readonly category?: string;

export async function GET(request: NextRequest) {  readonly status?: string;

  try {  readonly action?: string;

    // Auth (même pattern que /api/licenses)  readonly licenseId?: string;

    const session = await auth();  readonly clientName?: string;

    if (!session) {  readonly dateFrom?: string;

      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });  readonly dateTo?: string;

    }  readonly search?: string;

}

    const { searchParams } = new URL(request.url);

    interface SortOptions {

    // Pagination  readonly field: string;

    const page = parseInt(searchParams.get('page') || '1');  readonly direction: 'asc' | 'desc';

    const limit = parseInt(searchParams.get('limit') || '50');}

    const skip = (page - 1) * limit;

export async function GET(request: NextRequest) {

    // Filtres  try {

    const category = searchParams.get('category');    // Vérifier l'authentification

    const status = searchParams.get('status');    const session = await auth();

    const search = searchParams.get('search');    if (!session) {

          return NextResponse.json(

    // Tri        { error: 'Non autorisé' },

    const sortField = searchParams.get('sortField') || 'timestamp';        { status: 401 }

    const sortDirection = searchParams.get('sortDirection') || 'desc';      );

    }

    // Construction WHERE clause

    const where: any = {};    const { searchParams } = new URL(request.url);

    

    if (category && category !== 'ALL') {    // Pagination

      where.category = category;    const page = parseInt(searchParams.get('page') || '1');

    }    const limit = parseInt(searchParams.get('limit') || '50');

    const offset = (page - 1) * limit;

    if (status && status !== 'ALL') {

      where.status = status;    // Filtres

    }    const filters: DebugLogFilters = {

      category: searchParams.get('category') || undefined,

    if (search) {      status: searchParams.get('status') || undefined,

      where.OR = [      action: searchParams.get('action') || undefined,

        { action: { contains: search, mode: 'insensitive' } },      licenseId: searchParams.get('licenseId') || undefined,

        { message: { contains: search, mode: 'insensitive' } },      clientName: searchParams.get('clientName') || undefined,

        { clientName: { contains: search, mode: 'insensitive' } },      dateFrom: searchParams.get('dateFrom') || undefined,

      ];      dateTo: searchParams.get('dateTo') || undefined,

    }      search: searchParams.get('search') || undefined,

    };

    // Requêtes en parallèle

    const [logs, totalCount] = await Promise.all([    // Tri

      prisma.debugLog.findMany({    const sortField = searchParams.get('sortField') || 'timestamp';

        where,    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

        orderBy: { [sortField]: sortDirection },

        skip,    // Construction de la requête WHERE

        take: limit,    const whereClause: any = {};

        include: {

          license: {    if (filters.category && filters.category !== 'ALL') {

            select: {      whereClause.category = filters.category;

              licenseKey: true,    }

              clientName: true,

            },    if (filters.status && filters.status !== 'ALL') {

          },      whereClause.status = filters.status;

        },    }

      }),

      prisma.debugLog.count({ where }),    if (filters.action) {

    ]);      whereClause.action = {

        contains: filters.action,

    const totalPages = Math.ceil(totalCount / limit);        mode: 'insensitive',

      };

    return NextResponse.json({    }

      logs,

      pagination: {    if (filters.licenseId) {

        currentPage: page,      whereClause.licenseId = filters.licenseId;

        totalPages,    }

        totalCount,

        limit,    if (filters.clientName) {

        hasNextPage: page < totalPages,      whereClause.clientName = {

        hasPrevPage: page > 1,        contains: filters.clientName,

      },        mode: 'insensitive',

    });      };

    }

  } catch (error) {

    console.error('Erreur GET /api/debug/logs:', error);    if (filters.dateFrom || filters.dateTo) {

    return NextResponse.json(      whereClause.timestamp = {};

      { error: 'Erreur serveur' },      if (filters.dateFrom) {

      { status: 500 }        whereClause.timestamp.gte = new Date(filters.dateFrom);

    );      }

  }      if (filters.dateTo) {

}        whereClause.timestamp.lte = new Date(filters.dateTo);

      }

/**    }

 * DELETE /api/debug/logs - Supprime des logs

 */    // Recherche globale

export async function DELETE(request: NextRequest) {    if (filters.search) {

  try {      whereClause.OR = [

    const session = await auth();        { action: { contains: filters.search, mode: 'insensitive' } },

    if (!session) {        { message: { contains: filters.search, mode: 'insensitive' } },

      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });        { clientName: { contains: filters.search, mode: 'insensitive' } },

    }        { endpoint: { contains: filters.search, mode: 'insensitive' } },

        { errorDetails: { contains: filters.search, mode: 'insensitive' } },

    const { searchParams } = new URL(request.url);      ];

    const id = searchParams.get('id');    }



    if (id) {    // Exécution des requêtes en parallèle

      // Supprimer un log spécifique    let logs: any[] = [];

      await prisma.debugLog.delete({    let totalCount = 0;

        where: { id },

      });    try {

      return NextResponse.json({ success: true });      // Utilisation des vraies données depuis la base

    }      const debugLogModel = (prisma as any).debugLog;

      

    // Supprimer tous les logs      if (debugLogModel) {

    await prisma.debugLog.deleteMany({});        [logs, totalCount] = await Promise.all([

    return NextResponse.json({ success: true });          debugLogModel.findMany({

            where: whereClause,

  } catch (error) {            orderBy: {

    console.error('Erreur DELETE /api/debug/logs:', error);              [sortField]: sortDirection,

    return NextResponse.json(            },

      { error: 'Erreur serveur' },            skip: offset,

      { status: 500 }            take: limit,

    );            include: {

  }              license: {

}                select: {

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