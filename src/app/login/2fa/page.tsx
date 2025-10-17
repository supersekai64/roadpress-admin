import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { TwoFactorVerify } from '@/components/two-factor-verify';

export const metadata: Metadata = {
  title: 'Vérification 2FA - Roadpress Admin',
  description: 'Vérification en deux étapes',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Page : Vérification du code 2FA
 * 
 * Accessible uniquement après validation du mot de passe.
 * Vérifie qu'une session temporaire 2FA existe.
 */
export default async function TwoFactorPage() {
  // Vérifier si une session temporaire 2FA existe
  const cookieStore = await cookies();
  const pendingUserId = cookieStore.get('pending_2fa_user')?.value;

  if (!pendingUserId) {
    // Pas de session temporaire : rediriger vers login
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <TwoFactorVerify />
    </div>
  );
}
