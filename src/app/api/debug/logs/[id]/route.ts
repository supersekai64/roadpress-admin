import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

interface RouteParams {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    // Supprimer le log
    await prisma.debugLog.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Log supprimé avec succès' 
    });
  } catch (error) {
    console.error('Erreur suppression log:', error);
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Log introuvable' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
