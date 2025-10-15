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

    // Construire les filtres (même logique que logs/route.ts)
    const where: any = {};
    
    const category = searchParams.get('category');
    if (category && category !== 'ALL') {
      where.category = category;
    }
    
    const status = searchParams.get('status');
    if (status && status !== 'ALL') {
      where.status = status;
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

    // Récupérer tous les logs (pas de limite pour l'export)
    const logs = await prisma.debugLog.findMany({
      where,
      orderBy,
      take: 10000, // Limite raisonnable pour éviter les timeout
    });

    // Créer le CSV
    const headers = [
      'Timestamp',
      'Category',
      'Action',
      'Status',
      'Client Name',
      'Method',
      'Endpoint',
      'Duration (ms)',
      'Message',
      'Error Details',
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map((log) =>
        [
          `"${new Date(log.timestamp).toISOString()}"`,
          `"${log.category}"`,
          `"${log.action}"`,
          `"${log.status}"`,
          `"${log.clientName || ''}"`,
          `"${log.method || ''}"`,
          `"${log.endpoint || ''}"`,
          log.duration || '',
          `"${(log.message || '').replace(/"/g, '""')}"`,
          `"${(log.errorDetails || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];

    // Ajouter le BOM UTF-8 pour la compatibilité Excel et autres logiciels
    const BOM = '\uFEFF';
    const csv = BOM + csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="debug-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
