'use client';

import { useState, useEffect } from 'react';
import { TwoFactorSetup } from '@/components/two-factor-setup';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

export default function TwoFactorSettingsPage() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    backupCodesRemaining: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Charger le statut 2FA
  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Erreur chargement statut 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Désactiver le 2FA
  const handleDisable = async () => {
    const password = prompt(
      'Entrez votre mot de passe pour désactiver la 2FA :'
    );
    if (!password) return;

    const token = prompt(
      'Entrez votre code 2FA actuel (ou un code de backup) :'
    );
    if (!token) return;

    setDisabling(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, token }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la désactivation');
        return;
      }

      alert('2FA désactivée avec succès');
      await loadStatus();
      setShowSetup(false);
    } catch (error) {
      console.error('Erreur désactivation 2FA:', error);
      alert('Erreur lors de la désactivation');
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            Authentification à Deux Facteurs
          </h1>
          <p className="text-muted-foreground mt-2">
            Renforcez la sécurité de votre compte avec la 2FA
          </p>
        </div>

        {/* Statut actuel */}
        {status && !showSetup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status.enabled ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    2FA Activée
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    2FA Désactivée
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {status.enabled
                  ? `La double authentification est active sur votre compte. ${status.backupCodesRemaining} code(s) de backup restant(s).`
                  : 'Votre compte n\'est protégé que par un mot de passe.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.enabled ? (
                <>
                  {status.backupCodesRemaining === 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        ⚠️ Vous n{`'`}avez plus de codes de backup ! Si vous perdez
                        votre téléphone, vous ne pourrez plus accéder à votre
                        compte.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    variant="destructive"
                    onClick={handleDisable}
                    disabled={disabling}
                  >
                    {disabling ? 'Désactivation...' : 'Désactiver la 2FA'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShowSetup(true)}>
                  Activer la 2FA
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Setup 2FA */}
        {showSetup && !status?.enabled && (
          <TwoFactorSetup
            onComplete={async () => {
              await loadStatus();
              setShowSetup(false);
              alert('2FA activée avec succès !');
            }}
          />
        )}

        {/* Informations */}
        <Card>
          <CardHeader>
            <CardTitle>À propos de la 2FA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Qu{`'`}est-ce que la 2FA ?
              </h4>
              <p>
                L{`'`}authentification à deux facteurs (2FA) ajoute une couche de
                sécurité supplémentaire à votre compte. En plus de votre mot de
                passe, vous devrez entrer un code temporaire généré par une
                application d{`'`}authentification.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Applications recommandées
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Google Authenticator (iOS, Android)</li>
                <li>Microsoft Authenticator (iOS, Android)</li>
                <li>Authy (iOS, Android, Desktop)</li>
                <li>1Password (toutes plateformes)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Codes de backup
              </h4>
              <p>
                Les codes de backup sont des codes à usage unique qui vous
                permettent d{`'`}accéder à votre compte si vous perdez votre
                téléphone. Conservez-les en lieu sûr (gestionnaire de mots de
                passe, coffre-fort physique, etc.).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
