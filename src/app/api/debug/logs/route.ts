import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Construire les filtres
    const where: any = {};
    
    const category = searchParams.get('category');
    if (category && category !== 'ALL') {
      where.category = category;
    }
    
    const status = searchParams.get('status');
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    const licenseId = searchParams.get('licenseId');
    if (licenseId) {
      where.licenseId = licenseId;
    }
    
    const clientName = searchParams.get('clientName');
    if (clientName) {
      where.clientName = clientName;
    }
    
    const action = searchParams.get('action');
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    
    const search = searchParams.get('search');
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { errorDetails: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) {
      where.timestamp = { ...where.timestamp, gte: new Date(dateFrom) };
    }
    
    const dateTo = searchParams.get('dateTo');
    if (dateTo) {
      where.timestamp = { ...where.timestamp, lte: new Date(dateTo) };
    }

    // Filtrage par labels
    const labelsParam = searchParams.get('labels');
    if (labelsParam) {
      const labels = labelsParam.split(',').filter(Boolean);
      if (labels.length > 0) {
        // Mapper les labels vers les préfixes d'actions
        const actionPrefixes: string[] = [];
        labels.forEach(label => {
          switch (label) {
            case 'API KEY':
              actionPrefixes.push('PUSH_API_');
              break;
            case 'LICENCE':
              actionPrefixes.push('LICENSE_');
              break;
            case 'POI':
              actionPrefixes.push('POI_');
              break;
            case 'SYNCHRONISATION':
              actionPrefixes.push('SYNC_');
              break;
            case 'AUTHENTIFICATION':
              actionPrefixes.push('AUTH_');
              break;
            case 'USAGE API':
              actionPrefixes.push('API_USAGE_');
              break;
            case 'TARIFICATION':
              actionPrefixes.push('PRICING_');
              break;
            case 'SYSTÈME':
              actionPrefixes.push('SYSTEM_');
              break;
            case 'ERREUR':
              actionPrefixes.push('ERROR_');
              break;
            default:
              // Pour les labels qui ne matchent pas, chercher les actions qui commencent par ce label
              actionPrefixes.push(`${label}_`);
              break;
          }
        });

        // Construire le filtre OR pour toutes les actions correspondantes
        if (actionPrefixes.length > 0) {
          const actionFilters = actionPrefixes.map(prefix => ({
            action: { startsWith: prefix }
          }));
          
          // Si where.OR existe déjà (recherche globale), combiner avec AND
          if (where.OR) {
            where.AND = [
              { OR: where.OR },
              { OR: actionFilters }
            ];
            delete where.OR;
          } else {
            where.OR = actionFilters;
          }
        }
      }
    }

    // Tri
    const sortField = searchParams.get('sortField') || 'timestamp';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    const orderBy: any = { [sortField]: sortDirection };

    const totalCount = await prisma.debugLog.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    
    // Si pas d'entrées ou page invalide, retourner des données vides
    if (totalCount === 0 || page > totalPages) {
      return NextResponse.json({
        logs: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          limit,
        },
      });
    }

    const logs = await prisma.debugLog.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    return NextResponse.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
