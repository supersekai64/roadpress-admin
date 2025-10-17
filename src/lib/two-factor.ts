/**
 * Two-Factor Authentication (2FA) Helper
 * Gère la génération, vérification et gestion des secrets TOTP
 */

import * as speakeasy from '@levminer/speakeasy';
import * as QRCode from 'qrcode';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// Configuration TOTP
const TOTP_CONFIG = {
  name: 'Roadpress Admin',
  issuer: 'Roadpress',
  encoding: 'base32' as const,
  algorithm: 'sha1' as const,
  digits: 6,
  step: 30, // 30 secondes
};

// Clé de chiffrement (DOIT être en variable d'environnement en production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'roadpress-2fa-secret-key-32chars'; // 32 caractères
const ALGORITHM = 'aes-256-cbc';

/**
 * Génère un secret TOTP et un QR code
 */
export interface TwoFactorSetup {
  secret: string; // Secret en base32 (à chiffrer avant stockage)
  qrCodeUrl: string; // Data URL du QR code
  backupCodes: string[]; // 10 codes de backup
}

export async function generateTwoFactorSecretAsync(
  userEmail: string
): Promise<TwoFactorSetup> {
  // Générer le secret TOTP
  const secret = speakeasy.generateSecret({
    name: `${TOTP_CONFIG.name} (${userEmail})`,
    issuer: TOTP_CONFIG.issuer,
    length: 32,
  });

  if (!secret.base32) {
    throw new Error('Failed to generate TOTP secret');
  }

  // Générer le QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

  // Générer 10 codes de backup (8 caractères alphanumériques)
  const backupCodes = Array.from({ length: 10 }, () =>
    randomBytes(4).toString('hex').toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Vérifie un token TOTP
 */
export function verifyTwoFactorToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Accepte ±1 fenêtre de 30s (tolérance 60s)
  });
}

/**
 * Chiffre un secret ou des codes de backup
 */
export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Déchiffre un secret ou des codes de backup
 */
export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift() || '', 'hex');
  const encryptedText = parts.join(':');
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Vérifie un code de backup
 */
export function verifyBackupCode(
  encryptedBackupCodes: string,
  codeToVerify: string
): { valid: boolean; remainingCodes: string[] } {
  try {
    const backupCodesJson = decrypt(encryptedBackupCodes);
    const backupCodes: string[] = JSON.parse(backupCodesJson);
    
    const index = backupCodes.indexOf(codeToVerify.toUpperCase());
    
    if (index === -1) {
      return { valid: false, remainingCodes: backupCodes };
    }
    
    // Supprimer le code utilisé
    backupCodes.splice(index, 1);
    
    return { valid: true, remainingCodes: backupCodes };
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return { valid: false, remainingCodes: [] };
  }
}

/**
 * Génère un nouveau token TOTP (pour tests)
 */
export function generateToken(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
}
