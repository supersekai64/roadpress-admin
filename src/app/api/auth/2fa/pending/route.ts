/**
 * API Route : Gestion de la session temporaire 2FA
 * 
 * Cette route stocke temporairement l'ID utilisateur après validation du mot de passe,
 * en attendant la vérification du code 2FA.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PENDING_2FA_COOKIE = 'pending_2fa_user';
const COOKIE_MAX_AGE = 5 * 60; // 5 minutes

/**
 * POST /api/auth/2fa/pending
 * Stocke l'ID utilisateur en attente de vérification 2FA
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID requis' },
        { status: 400 }
      );
    }

    // Stocker l'ID utilisateur dans un cookie sécurisé temporaire
    const cookieStore = await cookies();
    cookieStore.set(PENDING_2FA_COOKIE, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[2FA PENDING ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/2fa/pending
 * Récupère l'ID utilisateur en attente de vérification 2FA
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(PENDING_2FA_COOKIE)?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Aucune session 2FA en attente' },
        { status: 404 }
      );
    }

    return NextResponse.json({ userId });
  } catch (error) {
    console.error('[2FA PENDING ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/2fa/pending
 * Supprime la session temporaire 2FA
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(PENDING_2FA_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[2FA PENDING ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
