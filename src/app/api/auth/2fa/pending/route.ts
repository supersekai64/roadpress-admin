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
 * Stocke l'ID utilisateur + credentials en attente de vérification 2FA
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email, password } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID requis' },
        { status: 400 }
      );
    }

    // Stocker les données dans un cookie sécurisé temporaire
    // Format: userId|email|password (en production, ça devrait être chiffré)
    const pendingData = `${userId}|${email}|${password}`;
    
    const cookieStore = await cookies();
    cookieStore.set(PENDING_2FA_COOKIE, pendingData, {
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
 * Récupère les données en attente de vérification 2FA
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const pendingData = cookieStore.get(PENDING_2FA_COOKIE)?.value;

    if (!pendingData) {
      return NextResponse.json(
        { error: 'Aucune session 2FA en attente' },
        { status: 404 }
      );
    }

    // Parser les données: userId|email|password
    const [userId, email, password] = pendingData.split('|');

    if (!userId || !email || !password) {
      return NextResponse.json(
        { error: 'Session 2FA invalide' },
        { status: 400 }
      );
    }

    return NextResponse.json({ userId, email, password });
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
