import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';
import { DebugLogger, createTimer, extractRequestInfo } from '@/lib/debug-logger';

// Exemple d'API avec logging intégré complet

const testSchema = z.object({
  message: z.string().min(1, 'Le message est requis'),
  category: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const timer = createTimer();
  const { ipAddress, userAgent } = extractRequestInfo(request);
  
  try {
    const session = await auth();
    if (!session) {
      await DebugLogger.logError({
        action: 'test_get',
        message: 'Tentative d\'accès non autorisé',
        endpoint: '/api/debug/test',
        requestData: { authenticated: false },
      });
      
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Log du début de la requête
    await DebugLogger.logInfo({
      action: 'test_get',
      message: 'Début de la requête de test',
      requestData: {
        user: session.user?.email,
        params: Object.fromEntries(new URL(request.url).searchParams),
      },
    });

    // Simulation d'une opération
    const testData = {
      timestamp: new Date().toISOString(),
      user: session.user?.email,
      message: 'Test API réussi',
      environment: process.env.NODE_ENV,
    };

    const duration = timer();

    // Log du succès
    await DebugLogger.log({
      category: 'SYSTEM',
      action: 'test_get',
      method: 'GET',
      endpoint: '/api/debug/test',
      status: 'SUCCESS',
      message: 'Requête de test exécutée avec succès',
      responseData: testData,
      duration,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(testData);

  } catch (error) {
    const duration = timer();
    
    // Log de l'erreur
    await DebugLogger.logError({
      action: 'test_get',
      message: 'Erreur lors de l\'exécution de l\'API de test',
      errorDetails: error instanceof Error ? error.stack : String(error),
      endpoint: '/api/debug/test',
    });

    console.error('Erreur API test:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const timer = createTimer();
  const { ipAddress, userAgent } = extractRequestInfo(request);
  
  try {
    const session = await auth();
    if (!session) {
      await DebugLogger.logError({
        action: 'test_post',
        message: 'Tentative de création non autorisée',
        endpoint: '/api/debug/test',
      });
      
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const rawBody = await request.text();
    let body: any;
    
    try {
      body = JSON.parse(rawBody);
    } catch {
      await DebugLogger.logError({
        action: 'test_post',
        message: 'Corps de requête JSON invalide',
        errorDetails: 'JSON parse error',
        requestData: { rawBody: rawBody.substring(0, 200) },
      });
      
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
    }

    // Validation avec Zod
    const validation = testSchema.safeParse(body);
    if (!validation.success) {
      await DebugLogger.logError({
        action: 'test_post',
        message: 'Validation échouée',
        errorDetails: JSON.stringify(validation.error.issues),
        requestData: body,
      });
      
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const validData = validation.data;

    // Log du début du traitement
    await DebugLogger.logInfo({
      action: 'test_post_processing',
      message: 'Début du traitement des données',
      requestData: validData,
    });

    // Simulation d'une opération en base (exemple)
    const result = {
      id: Date.now().toString(),
      ...validData,
      createdAt: new Date().toISOString(),
      createdBy: session.user?.email,
    };

    const duration = timer();

    // Log du succès avec toutes les données
    await DebugLogger.log({
      category: 'SYSTEM',
      action: 'test_post',
      method: 'POST',
      endpoint: '/api/debug/test',
      status: 'SUCCESS',
      message: `Élément de test créé avec succès: ${result.id}`,
      requestData: validData,
      responseData: result,
      duration,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    const duration = timer();
    
    // Log de l'erreur critique
    await DebugLogger.logError({
      action: 'test_post',
      message: 'Erreur critique lors de la création',
      errorDetails: error instanceof Error ? error.stack : String(error),
      endpoint: '/api/debug/test',
    });

    console.error('Erreur création test:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}