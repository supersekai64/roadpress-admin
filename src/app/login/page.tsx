"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // Vérifier si 2FA est activé AVANT d'appeler signIn
      const checkResponse = await fetch('/api/auth/2fa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const checkData = await checkResponse.json();

      // Si 2FA est requis, créer la session pending et rediriger
      if (checkData.requires2FA) {
        // Stocker les credentials dans un cookie temporaire (5 min)
        const pendingResponse = await fetch('/api/auth/2fa/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: checkData.userId,
            email,
            password 
          }),
        });

        if (!pendingResponse.ok) {
          setError('Erreur lors de la création de la session');
          setIsLoading(false);
          return;
        }
        
        // Attendre un peu pour s'assurer que le cookie est bien défini
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Rediriger vers la page de vérification 2FA
        router.push('/login/2fa');
        return;
      }

      // Si pas de 2FA ou erreur, continuer avec signIn normal
      if (!checkData.success) {
        setError('Email ou mot de passe invalide');
        setIsLoading(false);
        return;
      }

      // Si pas de 2FA requis, connexion normale
      console.log('[LOGIN] No 2FA required, calling signIn...');
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('[LOGIN] SignIn result:', result);

      if (result?.error) {
        setError('Email ou mot de passe invalide');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('[LOGIN ERROR]', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <Image
          src="/images/roadpress-w.svg"
          alt="Roadpress"
          width={200}
          height={60}
          priority
          className="w-full h-12"
        />
        <Card className="w-full">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Interface d&apos;administration</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder au tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder=""
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder=""
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
