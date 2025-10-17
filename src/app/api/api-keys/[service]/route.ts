import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';
import { DebugLogger } from '@/lib/debug-logger';

const updateKeySchema = z.object({
  key: z.string().min(1, 'La clé API est requise'),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  readonly params: Promise<{
    service: string;
  }>;
}

// GET /api/api-keys/[service] - Récupérer une clé API spécifique
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { service } = await params;

    const apiKey = await prisma.apiKey.findUnique({
      where: { service },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API non trouvée' },
        { status: 404 }
      );
    }

    // Masquer partiellement la clé
    const maskedKey = {
      ...apiKey,
      key: apiKey.key ? maskApiKey(apiKey.key) : '',
    };

    return NextResponse.json(maskedKey);
  } catch (error) {
    console.error('Erreur GET /api/api-keys/[service]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la clé' },
      { status: 500 }
    );
  }
}

// PUT /api/api-keys/[service] - Modifier une clé API
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { service } = await params;
    const body = await request.json();
    const validatedData = updateKeySchema.parse(body);

    // Récupérer l'ancienne clé avant modification (pour logging)
    const existingKey = await prisma.apiKey.findUnique({
      where: { service },
    });

    // Utiliser upsert pour créer ou mettre à jour la clé
    const apiKey = await prisma.apiKey.upsert({
      where: { service },
      create: {
        service,
        key: validatedData.key,
        isActive: validatedData.isActive ?? true,
        lastPush: new Date(),
      },
      update: {
        key: validatedData.key,
        isActive: validatedData.isActive ?? true,
        lastPush: new Date(),
      },
    });

    // LOG : Tracer la modification de clé API
    await DebugLogger.log({
      category: 'API_KEYS',
      action: 'UPDATE_API_KEY',
      method: 'PUT',
      endpoint: `/api/api-keys/${service}`,
      status: 'SUCCESS',
      label: 'CLÉS API',
      message: `Clé API modifiée : ${service}`,
      requestData: {
        service,
        user: session.user?.email || session.user?.name || 'unknown',
        userId: session.user?.id || 'unknown',
        wasActive: existingKey?.isActive ?? false,
        nowActive: apiKey.isActive,
        isNewKey: !existingKey,
        oldKeyMasked: existingKey ? maskApiKey(existingKey.key) : 'N/A',
        newKeyMasked: maskApiKey(validatedData.key),
        timestamp: new Date().toISOString(),
      },
            duration: Date.now() - startTime,
    });

    // Masquer la clé dans la réponse
    const maskedKey = {
      ...apiKey,
      key: maskApiKey(apiKey.key),
    };

    return NextResponse.json(maskedKey);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur PUT /api/api-keys/[service]:', error);

    // LOG : Erreur lors de la modification
    const { service } = await params;
    const session = await auth();
    await DebugLogger.log({
      category: 'API_KEYS',
      action: 'UPDATE_API_KEY',
      method: 'PUT',
      endpoint: `/api/api-keys/${service}`,
      status: 'ERROR',
      label: 'CLÉS API',
      message: `Échec modification clé API : ${service}`,
      requestData: {
        service,
        user: session?.user?.email || 'unknown',
      },
      errorDetails: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: 'Erreur lors de la modification de la clé' },
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
