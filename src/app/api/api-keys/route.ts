import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/api-keys - Récupérer toutes les clés API
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { service: 'asc' },
    });

    // Masquer partiellement les clés pour la sécurité
    const maskedKeys = apiKeys.map((key: typeof apiKeys[0]) => ({
      ...key,
      key: key.key ? maskApiKey(key.key) : '',
    }));

    return NextResponse.json(maskedKeys);
  } catch (error) {
    console.error('Erreur GET /api/api-keys:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clés API' },
      { status: 500 }
    );
  }
}

// Fonction pour masquer partiellement une clé API
function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  
  const start = key.substring(0, 4);
  const end = key.substring(key.length - 4);
  const middle = '•'.repeat(Math.min(key.length - 8, 20));
  
  return `${start}${middle}${end}`;
}
