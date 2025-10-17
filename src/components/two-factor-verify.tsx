"use client";

/**
 * Composant : Vérification du code 2FA à la connexion
 * 
 * Affiche un formulaire pour entrer le code TOTP à 6 chiffres
 * avec possibilité d'utiliser un backup code.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Key } from 'lucide-react';

export function TwoFactorVerify() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Vérifier qu'il y a une session pending au montage et récupérer les credentials
  useEffect(() => {
    async function checkPendingSession() {
      try {
        const response = await fetch('/api/auth/2fa/pending');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (!data.userId || !data.email || !data.password) {
          router.push('/login');
          return;
        }
        setPendingUserId(data.userId);
        setEmail(data.email);
        setPassword(data.password);
      } catch (error) {
        router.push('/login');
      }
    }

    checkPendingSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Vérifier le code 2FA
      const response = await fetch('/api/auth/2fa/complete-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          isBackupCode,
          rememberDevice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Code invalide');
      }

      // Code valide : le serveur a défini le cookie "2fa_verified"
      // Maintenant on peut se reconnecter avec les mêmes credentials
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error('Erreur lors de la reconnexion');
      }

      // Connexion réussie : rediriger vers le dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de vérification');
      setLoading(false);
      setToken('');
    }
  };

  const handleCancel = async () => {
    // Supprimer la session temporaire
    await fetch('/api/auth/2fa/pending', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          Vérification en deux étapes
        </CardTitle>
        <CardDescription className="text-center">
          {isBackupCode
            ? 'Entrez un de vos codes de secours'
            : 'Entrez le code à 6 chiffres depuis votre application d\'authentification'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="text-center">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Input
              type="text"
              placeholder={isBackupCode ? 'XXXX-XXXX-XXXX' : '000000'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              maxLength={isBackupCode ? 14 : 6}
              required
              disabled={loading}
              className="text-center text-2xl tracking-wider font-mono"
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Remember Device Checkbox */}
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
            <Checkbox
              id="remember-device"
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
              disabled={loading}
            />
            <Label
              htmlFor="remember-device"
              className="text-sm cursor-pointer select-none"
            >
              Mémoriser cet appareil pendant 30 jours
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || token.length < (isBackupCode ? 12 : 6)}
              className="flex-1"
            >
              {loading ? 'Vérification...' : 'Vérifier'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Annuler
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setToken('');
                setError(null);
              }}
              disabled={loading}
              className="w-full text-sm"
            >
              <Key className="w-4 h-4 mr-2" />
              {isBackupCode
                ? 'Utiliser l\'application d\'authentification'
                : 'Utiliser un code de secours'}
            </Button>
          </div>
        </form>

        <div className="mt-6 px-4 py-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            Si vous avez perdu accès à votre application
            d{`'`}authentification, utilisez un de vos codes de secours. Chaque code
            ne peut être utilisé qu{`'`}une seule fois.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
