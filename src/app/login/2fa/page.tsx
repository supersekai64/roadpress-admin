'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TwoFactorVerify } from '@/components/two-factor-verify';
import { Loader2 } from 'lucide-react';

/**
 * Page : Vérification du code 2FA
 * 
 * Accessible uniquement après validation du mot de passe.
 * Vérifie qu'une session temporaire 2FA existe.
 */
export default function TwoFactorPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Empêcher les appels multiples
    if (hasChecked) return;

    // Vérifier si une session temporaire 2FA existe
    async function checkPendingSession() {
      try {
        const response = await fetch('/api/auth/2fa/pending');
        
        if (!response.ok) {
          // Pas de session temporaire : rediriger vers login
          router.push('/login');
          return;
        }

        const data = await response.json();
        
        if (!data.userId) {
          router.push('/login');
          return;
        }

        setIsChecking(false);
        setHasChecked(true);
      } catch (error) {
        router.push('/login');
      }
    }

    checkPendingSession();
  }, [router, hasChecked]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <TwoFactorVerify />
    </div>
  );
}
