/**
 * Security Monitor - Détection de patterns suspects et alertes
 * Envoie des emails via Brevo pour les incidents de sécurité
 */

import { DebugLogger } from './debug-logger';

interface SecurityEvent {
  type: 'FAILED_ACCESS' | 'RATE_LIMIT_VIOLATION' | 'UNUSUAL_HOUR' | 'SUSPICIOUS_PATTERN';
  endpoint: string;
  clientId: string;
  details: string;
  timestamp: Date;
}

// Store temporaire des événements suspects (en mémoire)
const suspiciousEvents = new Map<string, SecurityEvent[]>();

// Nettoyage automatique toutes les 15 minutes
setInterval(() => {
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  for (const [key, events] of suspiciousEvents.entries()) {
    const recentEvents = events.filter(e => e.timestamp.getTime() > fifteenMinutesAgo);
    if (recentEvents.length === 0) {
      suspiciousEvents.delete(key);
    } else {
      suspiciousEvents.set(key, recentEvents);
    }
  }
}, 15 * 60 * 1000);

/**
 * Configuration des seuils de détection
 */
const DETECTION_CONFIG = {
  FAILED_ACCESS_THRESHOLD: 5, // 5 échecs en 5 minutes
  FAILED_ACCESS_WINDOW_MS: 5 * 60 * 1000,
  UNUSUAL_HOURS_START: 0, // 00:00
  UNUSUAL_HOURS_END: 6, // 06:00
  ALERT_EMAIL: 'paul@superbien-works.fr',
} as const;

/**
 * Vérifie si l'heure est inhabituelle (00:00 - 06:00)
 */
function isUnusualHour(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= DETECTION_CONFIG.UNUSUAL_HOURS_START && hour < DETECTION_CONFIG.UNUSUAL_HOURS_END;
}

/**
 * Enregistre un événement suspect
 */
function recordSuspiciousEvent(event: SecurityEvent): void {
  const key = `${event.clientId}-${event.type}`;
  const events = suspiciousEvents.get(key) || [];
  events.push(event);
  suspiciousEvents.set(key, events);
}

/**
 * Compte les événements récents d'un type donné pour un client
 */
function countRecentEvents(
  clientId: string,
  eventType: SecurityEvent['type'],
  windowMs: number
): number {
  const key = `${clientId}-${eventType}`;
  const events = suspiciousEvents.get(key) || [];
  const cutoff = Date.now() - windowMs;
  return events.filter(e => e.timestamp.getTime() > cutoff).length;
}

/**
 * Envoie une alerte email via Brevo
 */
async function sendSecurityAlert(event: SecurityEvent, context: string): Promise<void> {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      console.error('[SECURITY MONITOR] BREVO_API_KEY manquante, impossible d\'envoyer l\'alerte');
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Roadpress - Security Monitor',
          email: 'noreply@superbien-works.fr',
        },
        to: [
          {
            email: DETECTION_CONFIG.ALERT_EMAIL,
            name: 'Administrateur Roadpress',
          },
        ],
        subject: `🚨 Alerte de sécurité - ${event.type}`,
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc2626; border-radius: 8px;">
                <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
                  🚨 Alerte Sécurité Détectée
                </h1>
                
                <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #991b1b; margin-top: 0;">Type d'incident</h2>
                  <p style="font-size: 18px; font-weight: bold; color: #dc2626;">${event.type}</p>
                </div>

                <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="color: #374151;">Détails de l'événement</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li><strong>Endpoint :</strong> ${event.endpoint}</li>
                    <li><strong>Client ID :</strong> ${event.clientId}</li>
                    <li><strong>Date/Heure :</strong> ${event.timestamp.toLocaleString('fr-FR')}</li>
                    <li><strong>Détails :</strong> ${event.details}</li>
                  </ul>
                </div>

                <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <h3 style="color: #92400e;">Contexte</h3>
                  <p>${context}</p>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 12px; color: #6b7280;">
                    Cet email a été envoyé automatiquement par le système de monitoring de sécurité Roadpress.<br>
                    Pour consulter les logs détaillés, rendez-vous sur le dashboard admin.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        textContent: `
ALERTE SÉCURITÉ ROADPRESS

Type: ${event.type}
Endpoint: ${event.endpoint}
Client ID: ${event.clientId}
Date/Heure: ${event.timestamp.toLocaleString('fr-FR')}
Détails: ${event.details}

Contexte:
${context}

---
Cet email a été envoyé automatiquement par le système de monitoring de sécurité Roadpress.
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Brevo API: ${response.status} - ${errorText}`);
    }

    // Log succès envoi email
    await DebugLogger.log({
      category: 'API_KEYS',
      action: 'SEND_SECURITY_ALERT',
      method: 'POST',
      endpoint: 'Brevo API',
      status: 'SUCCESS',
      message: `Alerte sécurité envoyée: ${event.type}`,
      requestData: {
        eventType: event.type,
        endpoint: event.endpoint,
        clientId: event.clientId,
      },
    });
  } catch (error) {
    console.error('[SECURITY MONITOR] Erreur envoi alerte Brevo:', error);
    
    // Log échec envoi email
    await DebugLogger.log({
      category: 'API_KEYS',
      action: 'SEND_SECURITY_ALERT',
      method: 'POST',
      endpoint: 'Brevo API',
      status: 'ERROR',
      message: `Échec envoi alerte sécurité: ${event.type}`,
      errorDetails: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Détecte et alerte sur les tentatives d'accès échouées répétées
 */
export async function detectFailedAccess(
  clientId: string,
  endpoint: string,
  details: string
): Promise<void> {
  const event: SecurityEvent = {
    type: 'FAILED_ACCESS',
    endpoint,
    clientId,
    details,
    timestamp: new Date(),
  };

  recordSuspiciousEvent(event);

  const recentFailures = countRecentEvents(
    clientId,
    'FAILED_ACCESS',
    DETECTION_CONFIG.FAILED_ACCESS_WINDOW_MS
  );

  // Alerte si seuil dépassé
  if (recentFailures >= DETECTION_CONFIG.FAILED_ACCESS_THRESHOLD) {
    await sendSecurityAlert(
      event,
      `${recentFailures} tentatives d'accès échouées détectées en 5 minutes depuis le client ${clientId}. Cela pourrait indiquer une tentative de force brute ou d'exploitation.`
    );
  }
}

/**
 * Détecte et alerte sur les violations de rate limit
 */
export async function detectRateLimitViolation(
  clientId: string,
  endpoint: string,
  details: string
): Promise<void> {
  const event: SecurityEvent = {
    type: 'RATE_LIMIT_VIOLATION',
    endpoint,
    clientId,
    details,
    timestamp: new Date(),
  };

  recordSuspiciousEvent(event);

  // Vérifier si pattern répété (>3 violations en 10 minutes)
  const recentViolations = countRecentEvents(clientId, 'RATE_LIMIT_VIOLATION', 10 * 60 * 1000);

  if (recentViolations >= 3) {
    await sendSecurityAlert(
      event,
      `${recentViolations} violations de rate limit détectées en 10 minutes depuis le client ${clientId}. Cela pourrait indiquer un comportement abusif ou une attaque automatisée.`
    );
  }
}

/**
 * Détecte et alerte sur les accès à heures inhabituelles
 */
export async function detectUnusualHourAccess(
  clientId: string,
  endpoint: string,
  details: string
): Promise<void> {
  if (!isUnusualHour()) {
    return; // Pas d'alerte si heure normale
  }

  const event: SecurityEvent = {
    type: 'UNUSUAL_HOUR',
    endpoint,
    clientId,
    details,
    timestamp: new Date(),
  };

  recordSuspiciousEvent(event);

  // Vérifier si pattern répété (>2 accès en heures inhabituelles en 24h)
  const recentUnusualAccess = countRecentEvents(clientId, 'UNUSUAL_HOUR', 24 * 60 * 60 * 1000);

  if (recentUnusualAccess >= 2) {
    await sendSecurityAlert(
      event,
      `${recentUnusualAccess} accès détectés pendant des heures inhabituelles (00:00-06:00) depuis le client ${clientId} dans les dernières 24h. Cela pourrait indiquer un accès non autorisé.`
    );
  }
}

/**
 * Analyse globale des patterns suspects
 */
export async function analyzeSecurityPatterns(): Promise<void> {
  // Cette fonction peut être appelée périodiquement (ex: cron job)
  // pour analyser les patterns globaux et envoyer des rapports
  
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  let totalFailures = 0;
  let totalViolations = 0;
  let totalUnusualAccess = 0;

  for (const [key, events] of suspiciousEvents.entries()) {
    const recentEvents = events.filter(e => e.timestamp.getTime() > oneHourAgo);
    
    for (const event of recentEvents) {
      if (event.type === 'FAILED_ACCESS') totalFailures++;
      if (event.type === 'RATE_LIMIT_VIOLATION') totalViolations++;
      if (event.type === 'UNUSUAL_HOUR') totalUnusualAccess++;
    }
  }

  // Log statistiques
  await DebugLogger.log({
    category: 'API_KEYS',
    action: 'SECURITY_ANALYSIS',
    method: 'GET',
    endpoint: 'Security Monitor',
    status: 'SUCCESS',
    message: 'Analyse sécurité périodique',
    requestData: {
      period: 'last_hour',
      totalFailures,
      totalViolations,
      totalUnusualAccess,
      timestamp: new Date().toISOString(),
    },
  });
}
