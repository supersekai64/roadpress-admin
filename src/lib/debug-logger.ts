import prisma from '@/lib/prisma';

// Import des types Prisma générés
type LogCategory = 'SYNC' | 'PUSH_API' | 'LICENSE' | 'API_KEYS' | 'POI' | 'AUTH' | 'SYSTEM' | 'ERROR' | 'SECURITY';
type LogStatus = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

interface LogData {
  readonly category: LogCategory;
  readonly action: string;
  readonly method?: string;
  readonly endpoint?: string;
  readonly licenseId?: string;
  readonly clientName?: string;
  readonly status?: LogStatus;
  readonly label?: string;
  readonly message?: string;
  readonly requestData?: any;
  readonly responseData?: any;
  readonly errorDetails?: string;
  readonly duration?: number;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

/**
 * Logger central pour toutes les actions de l'application
 * Enregistre automatiquement les données en base avec horodatage
 */
export class DebugLogger {
  /**
   * Log une action avec toutes les données associées
   */
  static async log(data: LogData): Promise<void> {
    try {
      // Vérifier que debugLog existe
      if (!('debugLog' in prisma)) {
        console.warn('DebugLog model not available in Prisma client');
        return;
      }

      await (prisma as any).debugLog.create({
        data: {
          category: data.category,
          action: data.action,
          method: data.method,
          endpoint: data.endpoint,
          licenseId: data.licenseId,
          clientName: data.clientName,
          status: data.status || 'SUCCESS',
          label: data.label,
          message: data.message,
          requestData: data.requestData ? JSON.parse(JSON.stringify(data.requestData)) : null,
          responseData: data.responseData ? JSON.parse(JSON.stringify(data.responseData)) : null,
          errorDetails: data.errorDetails,
          duration: data.duration,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Ne pas faire planter l'app si le logging échoue
      console.error('Erreur lors du logging:', error);
    }
  }

  /**
   * Log une synchronisation de données
   */
  static async logSync(data: {
    readonly licenseId?: string;
    readonly clientName?: string;
    readonly action: string;
    readonly requestData?: any;
    readonly responseData?: any;
    readonly status?: LogStatus;
    readonly message?: string;
    readonly duration?: number;
  }): Promise<void> {
    await this.log({
      category: 'SYNC',
      ...data,
    });
  }

  /**
   * Log un push d'API vers un site client
   */
  static async logPushApi(data: {
    readonly licenseId?: string;
    readonly clientName?: string;
    readonly action: string;
    readonly endpoint?: string;
    readonly requestData?: any;
    readonly responseData?: any;
    readonly status?: LogStatus;
    readonly message?: string;
    readonly duration?: number;
  }): Promise<void> {
    await this.log({
      category: 'PUSH_API',
      ...data,
    });
  }

  /**
   * Log une opération sur les licences
   */
  static async logLicense(data: {
    readonly licenseId?: string;
    readonly clientName?: string;
    readonly action: string;
    readonly requestData?: any;
    readonly responseData?: any;
    readonly status?: LogStatus;
    readonly message?: string;
  }): Promise<void> {
    await this.log({
      category: 'LICENSE',
      ...data,
    });
  }

  /**
   * Log une erreur critique
   */
  static async logError(data: {
    readonly action: string;
    readonly message: string;
    readonly errorDetails?: string;
    readonly licenseId?: string;
    readonly clientName?: string;
    readonly endpoint?: string;
    readonly requestData?: any;
  }): Promise<void> {
    await this.log({
      category: 'ERROR',
      status: 'ERROR',
      ...data,
    });
  }

  /**
   * Log une information système
   */
  static async logInfo(data: {
    readonly action: string;
    readonly message: string;
    readonly licenseId?: string;
    readonly clientName?: string;
    readonly requestData?: any;
    readonly responseData?: any;
  }): Promise<void> {
    await this.log({
      category: 'SYSTEM',
      status: 'INFO',
      ...data,
    });
  }

  /**
   * Log un avertissement
   */
  static async logWarning(data: {
    readonly category?: LogCategory;
    readonly action: string;
    readonly message: string;
    readonly licenseId?: string;
    readonly clientName?: string;
    readonly requestData?: any;
    readonly responseData?: any;
  }): Promise<void> {
    await this.log({
      category: data.category || 'SYSTEM',
      status: 'WARNING',
      action: data.action,
      message: data.message,
      licenseId: data.licenseId,
      clientName: data.clientName,
      requestData: data.requestData,
      responseData: data.responseData,
    });
  }

  /**
   * Log un succès
   */
  static async logSuccess(data: {
    readonly category?: LogCategory;
    readonly action: string;
    readonly message: string;
    readonly licenseId?: string;
    readonly clientName?: string;
    readonly requestData?: any;
    readonly responseData?: any;
    readonly duration?: number;
  }): Promise<void> {
    await this.log({
      category: data.category || 'SYSTEM',
      status: 'SUCCESS',
      action: data.action,
      message: data.message,
      licenseId: data.licenseId,
      clientName: data.clientName,
      requestData: data.requestData,
      responseData: data.responseData,
      duration: data.duration,
    });
  }
}

/**
 * Helper pour mesurer la durée d'une opération
 */
export function createTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

/**
 * Helper pour extraire IP et User-Agent de la request
 */
export function extractRequestInfo(request: Request): {
  readonly ipAddress?: string;
  readonly userAgent?: string;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ipAddress = forwarded?.split(',')[0].trim() || realIp || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}