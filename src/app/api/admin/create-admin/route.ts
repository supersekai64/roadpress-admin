import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Endpoint pour créer un utilisateur admin
 * POST /api/admin/create-admin
 * Body: { secret: "votre-secret-de-creation-admin" }
 * 
 * ⚠️ ATTENTION : Cet endpoint est protégé par un secret
 * Utilisez-le uniquement pour initialiser la base de données
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    // Vérifier le secret (à définir dans les variables d'environnement)
    const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET || 'roadpress-create-admin-2025';
    
    if (secret !== ADMIN_CREATION_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Secret invalide' },
        { status: 403 }
      );
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Créer ou mettre à jour l'utilisateur admin
    const admin = await prisma.user.upsert({
      where: { email: 'admin@roadpress.com' },
      update: {
        password: hashedPassword,
        name: 'Administrateur',
        role: 'admin',
      },
      create: {
        email: 'admin@roadpress.com',
        password: hashedPassword,
        name: 'Administrateur',
        role: 'admin',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Utilisateur admin créé avec succès',
      admin: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      credentials: {
        email: 'admin@roadpress.com',
        password: 'admin123',
      },
    });
  } catch (error) {
    console.error('Erreur création admin:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur', error: String(error) },
      { status: 500 }
    );
  }
}
