/**
 * Utilitaires pour gérer les appareils de confiance (Remember Device)
 * 
 * Permet de mémoriser un appareil pendant 30 jours et de skip la vérification 2FA
 */

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

const TRUSTED_DEVICE_COOKIE = 'trusted_device_token';
const DEVICE_EXPIRY_DAYS = 30;

interface DeviceInfo {
  readonly deviceName?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

/**
 * Créer un nouveau trusted device
 */
export async function createTrustedDevice(
  userId: string,
  deviceInfo: DeviceInfo
): Promise<string> {
  const deviceToken = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEVICE_EXPIRY_DAYS);

  await prisma.trustedDevice.create({
    data: {
      userId,
      deviceToken,
      deviceName: deviceInfo.deviceName,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt,
    },
  });

  return deviceToken;
}

/**
 * Vérifier si un appareil est de confiance
 */
export async function isTrustedDevice(deviceToken: string): Promise<{
  trusted: boolean;
  userId?: string;
}> {
  const device = await prisma.trustedDevice.findUnique({
    where: { deviceToken },
    select: {
      userId: true,
      expiresAt: true,
    },
  });

  if (!device) {
    return { trusted: false };
  }

  // Vérifier si pas expiré
  if (new Date() > device.expiresAt) {
    // Supprimer l'appareil expiré
    await prisma.trustedDevice.delete({
      where: { deviceToken },
    });
    return { trusted: false };
  }

  // Mettre à jour lastUsed
  await prisma.trustedDevice.update({
    where: { deviceToken },
    data: { lastUsed: new Date() },
  });

  return {
    trusted: true,
    userId: device.userId,
  };
}

/**
 * Définir le cookie de trusted device
 */
export async function setTrustedDeviceCookie(deviceToken: string): Promise<void> {
  const cookieStore = await cookies();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + DEVICE_EXPIRY_DAYS);

  cookieStore.set(TRUSTED_DEVICE_COOKIE, deviceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiryDate,
    path: '/',
  });
}

/**
 * Récupérer le cookie de trusted device
 */
export async function getTrustedDeviceCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;
}

/**
 * Supprimer le cookie de trusted device
 */
export async function removeTrustedDeviceCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TRUSTED_DEVICE_COOKIE);
}

/**
 * Récupérer tous les appareils de confiance d'un utilisateur
 */
export async function getUserTrustedDevices(userId: string) {
  return await prisma.trustedDevice.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() }, // Seulement les non-expirés
    },
    orderBy: { lastUsed: 'desc' },
    select: {
      id: true,
      deviceName: true,
      ipAddress: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

/**
 * Supprimer un trusted device
 */
export async function removeTrustedDevice(deviceId: string, userId: string): Promise<boolean> {
  try {
    await prisma.trustedDevice.delete({
      where: {
        id: deviceId,
        userId, // Sécurité : vérifier que l'appareil appartient à l'utilisateur
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Nettoyer les appareils expirés (à exécuter périodiquement)
 */
export async function cleanupExpiredDevices(): Promise<number> {
  const result = await prisma.trustedDevice.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

/**
 * Extraire les infos de l'appareil depuis les headers
 */
export function extractDeviceInfo(request: Request): DeviceInfo {
  const userAgent = request.headers.get('user-agent') || undefined;
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    undefined;

  // Parser user-agent pour nom lisible
  let deviceName: string | undefined;
  if (userAgent) {
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[1];
    const os = userAgent.match(/(Windows|Mac OS|Linux|Android|iOS)/)?.[1];
    if (browser && os) {
      deviceName = `${browser} on ${os}`;
    }
  }

  return {
    deviceName,
    ipAddress,
    userAgent,
  };
}
