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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';

export default function TwoFactorSettingsPage() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    backupCodesRemaining: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [disabling, setDisabling] = useState(false);
  
  // États pour les modals
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [disableError, setDisableError] = useState('');

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
    setDisableError('');
    
    if (!disablePassword || !disableToken) {
      setDisableError('Veuillez remplir tous les champs');
      return;
    }

    setDisabling(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, token: disableToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        setDisableError(data.error || 'Erreur lors de la désactivation');
        return;
      }

      // Réinitialiser le formulaire
      setDisablePassword('');
      setDisableToken('');
      setShowDisableDialog(false);
      
      // Afficher modal de succès
      setSuccessMessage('2FA désactivée avec succès !');
      setShowSuccessDialog(true);
      
      await loadStatus();
      setShowSetup(false);
    } catch (error) {
      console.error('Erreur désactivation 2FA:', error);
      setDisableError('Erreur lors de la désactivation');
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
            Authentification à deux facteurs
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
                    2FA activée
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    2FA désactivée
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
                    onClick={() => setShowDisableDialog(true)}
                    disabled={disabling}
                  >
                    Désactiver la 2FA
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
              setSuccessMessage('2FA activée avec succès !');
              setShowSuccessDialog(true);
            }}
          />
        )}

        {/* Modal: Désactiver 2FA */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Désactiver la 2FA</DialogTitle>
              <DialogDescription>
                Pour désactiver l{`'`}authentification à deux facteurs, vous devez confirmer votre identité.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Entrez votre mot de passe"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  disabled={disabling}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="token">Code 2FA ou code de backup</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="000000"
                  value={disableToken}
                  onChange={(e) => setDisableToken(e.target.value)}
                  disabled={disabling}
                  maxLength={6}
                />
              </div>
              
              {disableError && (
                <Alert variant="destructive">
                  <AlertDescription>{disableError}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisableDialog(false);
                  setDisablePassword('');
                  setDisableToken('');
                  setDisableError('');
                }}
                disabled={disabling}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={disabling}
              >
                {disabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Désactivation...
                  </>
                ) : (
                  'Désactiver'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Succès */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Opération réussie
              </DialogTitle>
              <DialogDescription>
                {successMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowSuccessDialog(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
