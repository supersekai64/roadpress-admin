/**
 * Utilitaires pour logger les événements 2FA
 */

import prisma from '@/lib/prisma';
import type { TwoFactorAction, TwoFactorMethod } from '@prisma/client';

interface LogTwoFactorParams {
  readonly userId: string;
  readonly action: TwoFactorAction;
  readonly method?: TwoFactorMethod;
  readonly success: boolean;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly errorMessage?: string;
}

/**
 * Logger un événement 2FA
 */
export async function logTwoFactorEvent(params: LogTwoFactorParams): Promise<void> {
  try {
    await prisma.twoFactorLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        method: params.method,
        success: params.success,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        errorMessage: params.errorMessage,
      },
    });
  } catch (error) {
    console.error('[2FA LOG ERROR]', error);
    // Ne pas bloquer le flux si le log échoue
  }
}

/**
 * Récupérer l'historique 2FA d'un utilisateur
 */
export async function getUserTwoFactorLogs(userId: string, limit: number = 50) {
  return await prisma.twoFactorLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      method: true,
      success: true,
      ipAddress: true,
      userAgent: true,
      errorMessage: true,
      createdAt: true,
    },
  });
}

/**
 * Récupérer tous les logs 2FA (admin)
 */
export async function getAllTwoFactorLogs(limit: number = 100) {
  return await prisma.twoFactorLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Statistiques 2FA
 */
export async function getTwoFactorStats(userId?: string) {
  const where = userId ? { userId } : {};

  const [total, successful, failed, byAction, byMethod] = await Promise.all([
    // Total logs
    prisma.twoFactorLog.count({ where }),

    // Successful
    prisma.twoFactorLog.count({
      where: { ...where, success: true },
    }),

    // Failed
    prisma.twoFactorLog.count({
      where: { ...where, success: false },
    }),

    // By action
    prisma.twoFactorLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    }),

    // By method
    prisma.twoFactorLog.groupBy({
      by: ['method'],
      where: { ...where, method: { not: null } },
      _count: true,
    }),
  ]);

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    byAction: byAction.map(({ action, _count }) => ({
      action,
      count: _count,
    })),
    byMethod: byMethod.map(({ method, _count }) => ({
      method,
      count: _count,
    })),
  };
}

/**
 * Nettoyer les logs anciens (> 90 jours)
 */
export async function cleanupOldTwoFactorLogs(): Promise<number> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await prisma.twoFactorLog.deleteMany({
    where: {
      createdAt: { lt: ninetyDaysAgo },
    },
  });

  return result.count;
}

/**
 * Détecter activité suspecte
 */
export async function detectSuspiciousActivity(userId: string): Promise<{
  suspicious: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];
  const lastHour = new Date();
  lastHour.setHours(lastHour.getHours() - 1);

  // Vérifier tentatives échouées récentes
  const recentFailures = await prisma.twoFactorLog.count({
    where: {
      userId,
      success: false,
      createdAt: { gte: lastHour },
    },
  });

  if (recentFailures >= 5) {
    reasons.push(`${recentFailures} tentatives échouées dans la dernière heure`);
  }

  // Vérifier changements d'IP rapides
  const recentLogs = await prisma.twoFactorLog.findMany({
    where: {
      userId,
      createdAt: { gte: lastHour },
      ipAddress: { not: null },
    },
    select: { ipAddress: true },
    distinct: ['ipAddress'],
  });

  if (recentLogs.length >= 3) {
    reasons.push(`${recentLogs.length} adresses IP différentes dans la dernière heure`);
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
