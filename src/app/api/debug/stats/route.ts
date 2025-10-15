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

    return NextResponse.json({
      totalLogs,
      logsLast24h: 0,
      categories: [],
      statuses: [],
      filters: {
        categories: ['ALL'],
        statuses: ['ALL'],
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
