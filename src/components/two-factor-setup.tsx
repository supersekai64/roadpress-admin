'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Copy, Check, AlertTriangle, Smartphone } from 'lucide-react';
import Image from 'next/image';

interface TwoFactorSetupProps {
  onComplete: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Étape 1 : Générer le QR code
  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du setup');
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Vérifier le token et activer 2FA
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verificationToken,
          isSetup: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Code invalide');
      }

      // Succès !
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Copier les codes de backup
  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  if (step === 'qr' && !qrCodeUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Activer l{`'`}Authentification à Deux Facteurs
          </CardTitle>
          <CardDescription>
            Renforcez la sécurité de votre compte en activant la 2FA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              Vous aurez besoin d{`'`}une application d{`'`}authentification comme{' '}
              <strong>Google Authenticator</strong>, <strong>Authy</strong> ou{' '}
              <strong>Microsoft Authenticator</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold">Comment ça fonctionne ?</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Scannez le QR code avec votre application</li>
              <li>Entrez le code à 6 chiffres affiché</li>
              <li>Sauvegardez vos codes de récupération</li>
              <li>La 2FA sera activée sur votre compte</li>
            </ol>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSetup} disabled={loading} className="w-full">
            {loading ? 'Génération...' : 'Commencer la configuration'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle>Scannez le QR Code</CardTitle>
            <CardDescription>
              Utilisez votre application d{`'`}authentification pour scanner ce code
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {qrCodeUrl && (
              <Image
                src={qrCodeUrl}
                alt="QR Code 2FA"
                width={256}
                height={256}
                className="border rounded-lg"
              />
            )}
          </CardContent>
        </Card>

        {/* Codes de backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Codes de Récupération
            </CardTitle>
            <CardDescription>
              Sauvegardez ces codes en lieu sûr. Ils vous permettront d{`'`}accéder à
              votre compte si vous perdez votre téléphone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-4 rounded-lg">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span>{code}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleCopyBackupCodes}
              className="w-full"
            >
              {copiedCodes ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier les codes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Vérification */}
        <Card>
          <CardHeader>
            <CardTitle>Vérifier le Code</CardTitle>
            <CardDescription>
              Entrez le code à 6 chiffres affiché dans votre application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Code de vérification</Label>
                <Input
                  id="token"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                  required
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Vérification...' : 'Activer la 2FA'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
