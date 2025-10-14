import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import prisma from '@/lib/prisma';
import { FileKey, Users, TrendingUp, MapPin } from 'lucide-react';
import { DeepLLogo, OpenAILogo, BrevoLogo } from '@/components/service-logos';

async function getDashboardStats() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const [
    totalLicenses,
    activeLicenses,
    expiredLicenses,
    totalPois,
    deeplStats,
    openaiStats,
    smsStats,
    emailStats,
  ] = await Promise.all([
    prisma.license.count(),
    prisma.license.count({ where: { status: 'ACTIVE' } }),
    prisma.license.count({ where: { status: 'EXPIRED' } }),
    prisma.poi.count(),
    // Stats DeepL depuis début de l'année
    prisma.deeplStats.aggregate({
      where: { createdAt: { gte: startOfYear } },
      _sum: { charactersTranslated: true },
    }),
    // Stats OpenAI depuis début de l'année
    prisma.openaiStats.aggregate({
      where: { createdAt: { gte: startOfYear } },
      _sum: { totalTokens: true },
    }),
    // Stats SMS depuis début de l'année
    prisma.smsStats.aggregate({
      where: { createdAt: { gte: startOfYear } },
      _sum: { smsSent: true, totalCost: true },
    }),
    // Stats Email depuis début de l'année
    prisma.emailStats.aggregate({
      where: { createdAt: { gte: startOfYear } },
      _sum: { emailsSent: true },
    }),
  ]);

  // Calcul des coûts
  const deeplCharacters = deeplStats._sum.charactersTranslated || 0;
  const deeplCost = deeplCharacters * 0.00002; // 0.00002€ par caractère

  const openaiTokens = openaiStats._sum.totalTokens || 0;
  const openaiCost = openaiTokens * 0.0000016; // 0.0000016€ par token

  const smsSent = smsStats._sum.smsSent || 0;
  const smsCost = Number(smsStats._sum.totalCost || 0);

  const emailsSent = emailStats._sum.emailsSent || 0;

  return {
    totalLicenses,
    activeLicenses,
    expiredLicenses,
    totalPois,
    yearStats: {
      deepl: {
        characters: deeplCharacters,
        cost: deeplCost,
      },
      openai: {
        tokens: openaiTokens,
        cost: openaiCost,
      },
      sms: {
        sent: smsSent,
        cost: smsCost,
      },
      email: {
        sent: emailsSent,
      },
    },
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Vue d{`'`}ensemble de votre plateforme Roadpress
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Licences total 
            </CardTitle>
            <FileKey className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLicenses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Licences actives
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.activeLicenses}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Licences expirées
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.expiredLicenses}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Points d{`'`}intérêt
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPois}</div>
          </CardContent>
        </Card>
      </div>

      {/* Coûts globaux depuis le début de l'année */}
      <div className="pt-4">
        <h3 className="text-xl font-bold mb-4">Coûts globaux {new Date().getFullYear()}</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DeepL</CardTitle>
              <DeepLLogo className="h-5 w-5 rounded" withBackground />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.yearStats.deepl.characters.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-2">caractères traduits</p>
              <div className="text-lg font-semibold text-primary text-right">
                {stats.yearStats.deepl.cost.toFixed(2)} €
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OpenAI</CardTitle>
              <OpenAILogo className="h-5 w-5 rounded" withBackground />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.yearStats.openai.tokens.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-2">tokens consommés</p>
              <div className="text-lg font-semibold text-primary text-right">
                {stats.yearStats.openai.cost.toFixed(2)} €
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Brevo (SMS)</CardTitle>
              <BrevoLogo className="h-5 w-5 rounded" withBackground />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.yearStats.sms.sent.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-2">SMS envoyés</p>
              <div className="text-lg font-semibold text-primary text-right">
                {stats.yearStats.sms.cost.toFixed(2)} €
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Brevo (E-mail)</CardTitle>
              <BrevoLogo className="h-5 w-5 rounded" withBackground />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.yearStats.email.sent.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-2">E-mails envoyés</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
