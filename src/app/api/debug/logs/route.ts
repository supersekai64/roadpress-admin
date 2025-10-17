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
    
    // Filtre catégories (multi-sélection)
    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      const categories = categoriesParam.split(',').filter(Boolean);
      if (categories.length > 0) {
        where.category = { in: categories };
      }
    }
    
    const status = searchParams.get('status');
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    // Filtre statuts (multi-sélection)
    const statusesParam = searchParams.get('statuses');
    if (statusesParam) {
      const statuses = statusesParam.split(',').filter(Boolean);
      if (statuses.length > 0) {
        where.status = { in: statuses };
      }
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
