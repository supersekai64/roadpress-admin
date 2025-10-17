"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Mail, MessageSquare, Languages, Sparkles, TrendingUp, TrendingDown, DollarSign, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/date-range-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleChart, MixedChart } from '@/components/simple-chart';

// Tarifs pour calcul des coûts
const PRICING = {
  DEEPL_PER_CHAR: 0.00002, // 0.00002€ par caractère
  OPENAI_PER_TOKEN: 0.000000775, // $0.000000775 par token
  SMS_BASE: 0.05, // Coût unitaire SMS (sera plus précis avec les tarifs par pays)
};

const PERIOD_PRESETS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: 'Ce mois-ci' },
  { value: 'custom', label: 'Période personnalisée' },
];

interface License {
  readonly id: string;
  readonly clientName: string;
}

interface StatCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly icon: React.ReactNode;
  readonly trend?: string;
  readonly trendUp?: boolean;
  readonly subtitle?: string;
  readonly tooltipContent?: string;
}

function StatCard({ title, value, icon, trend, trendUp, subtitle, tooltipContent }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <div className="flex items-center gap-1 mt-1">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            {tooltipContent && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 ml-1 mt-[1px] text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltipContent}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        {trend && (
          <p className={`text-sm flex items-center gap-1 mt-1 ${
            trendUp ? 'text-green-600' : 'text-red-600'
          }`}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function StatisticsPage() {
  const [selectedLicense, setSelectedLicense] = useState<string>('all');
  const [periodPreset, setPeriodPreset] = useState('week');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: subDays(new Date(), 1),
  });

  // Récupérer toutes les licences pour le filtre
  const { data: licenses = [] } = useQuery<License[]>({
    queryKey: ['licenses'],
    queryFn: async () => {
      const response = await fetch('/api/licenses');
      if (!response.ok) throw new Error('Erreur chargement licences');
      return response.json();
    },
  });

  // Construire les paramètres de requête
  const getQueryParams = () => {
    const params = new URLSearchParams();
    
    if (selectedLicense !== 'all') {
      params.append('licenseId', selectedLicense);
    }

    if (periodPreset === 'custom' && dateRange?.from) {
      params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange.to) {
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      }
    } else {
      // Utiliser les presets
      switch (periodPreset) {
        case 'today':
          params.append('startDate', format(new Date(), 'yyyy-MM-dd'));
          params.append('endDate', format(new Date(), 'yyyy-MM-dd'));
          break;
        case 'week':
          // 7 derniers jours SANS le jour en cours
          params.append('startDate', format(subDays(new Date(), 7), 'yyyy-MM-dd'));
          params.append('endDate', format(subDays(new Date(), 1), 'yyyy-MM-dd'));
          break;
        case 'month':
          params.append('startDate', format(startOfMonth(new Date()), 'yyyy-MM-dd'));
          params.append('endDate', format(endOfMonth(new Date()), 'yyyy-MM-dd'));
          break;
      }
    }

    return params.toString();
  };

  const queryParams = getQueryParams();

  // Récupérer les stats Email
  const { data: emailData } = useQuery({
    queryKey: ['statistics', 'email', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/email?${queryParams}`);
      if (!response.ok) throw new Error('Erreur chargement stats email');
      return response.json();
    },
  });

  // Récupérer les stats SMS
  const { data: smsData } = useQuery({
    queryKey: ['statistics', 'sms', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/sms?${queryParams}`);
      if (!response.ok) throw new Error('Erreur chargement stats SMS');
      return response.json();
    },
  });

  // Récupérer les stats SMS par pays
  const { data: smsByCountryData } = useQuery({
    queryKey: ['statistics', 'sms', 'by-country', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/sms/by-country?${queryParams}`);
      if (!response.ok) throw new Error('Erreur chargement stats SMS par pays');
      return response.json();
    },
  });

  // État pour le filtrage du tableau par pays
  const [countryFilter, setCountryFilter] = useState('');

  // Récupérer les stats DeepL
  const { data: deeplData } = useQuery({
    queryKey: ['statistics', 'deepl', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/deepl?${queryParams}`);
      if (!response.ok) throw new Error('Erreur chargement stats DeepL');
      return response.json();
    },
  });

  // Récupérer les stats OpenAI
  const { data: openaiData } = useQuery({
    queryKey: ['statistics', 'openai', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/openai?${queryParams}`);
      if (!response.ok) throw new Error('Erreur chargement stats OpenAI');
      return response.json();
    },
  });

  // Calculer les coûts estimés
  const smsCost = smsData?.totals?.totalSent ? smsData.totals.totalSent * PRICING.SMS_BASE : 0;
  const deeplCost = deeplData?.totals?.totalCharacters ? deeplData.totals.totalCharacters * PRICING.DEEPL_PER_CHAR : 0;
  const openaiCost = openaiData?.totals?.totalTokens ? openaiData.totals.totalTokens * PRICING.OPENAI_PER_TOKEN : 0;

  // Préparer les données pour les graphiques Email
  const emailChartData = emailData?.stats.map((stat: { createdAt: string; emailsSent: number }) => ({
    date: format(new Date(stat.createdAt), 'dd/MM', { locale: fr }),
    Envoyé: stat.emailsSent,
  })) || [];

  // Préparer les données pour les graphiques SMS
  const smsChartData = smsData?.stats.map((stat: { createdAt: string; smsSent: number }) => ({
    date: format(new Date(stat.createdAt), 'dd/MM', { locale: fr }),
    Envoyé: stat.smsSent,
  })) || [];

  // Préparer les données pour DeepL
  const deeplChartData = deeplData?.stats.map((stat: { createdAt: string; translationsCount: number; charactersTranslated: number }) => ({
    date: format(new Date(stat.createdAt), 'dd/MM', { locale: fr }),
    'Caractère traduit': stat.charactersTranslated,
  })) || [];

  // Préparer les données pour OpenAI
  const openaiChartData = openaiData?.stats.map((stat: { createdAt: string; requestsCount: number; totalTokens: number }) => ({
    date: format(new Date(stat.createdAt), 'dd/MM', { locale: fr }),
    Requête: stat.requestsCount,
    'Token (x1000)': Math.round(stat.totalTokens / 1000),
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
        <p className="text-muted-foreground">
          Visualisez l{`'`}utilisation de vos APIs
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedLicense} onValueChange={setSelectedLicense}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filtrer par client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {licenses.map((license) => (
              <SelectItem key={license.id} value={license.id}>
                {license.clientName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodPreset} onValueChange={setPeriodPreset}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {periodPreset === 'custom' && (
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-full sm:w-auto"
          />
        )}
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="deepl" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            DeepL
          </TabsTrigger>
          <TabsTrigger value="openai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            OpenAI
          </TabsTrigger>
        </TabsList>

        {/* Onglet Email */}
        <TabsContent value="email" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <StatCard
              title="Emails envoyés"
              value={emailData?.totals.totalSent || 0}
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Emails envoyés</CardTitle>
              <CardDescription>
                Volume d{`'`}emails envoyés par jour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={emailChartData} dataKeys={['Envoyé']} type="bar" height={350} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet SMS */}
        <TabsContent value="sms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="SMS envoyés"
              value={smsData?.totals.totalSent || 0}
              icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Coût total"
              value={`${(smsData?.totals.totalCost || 0)} €`}
              subtitle="Coût réel basé sur les tarifs par pays"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SMS envoyés</CardTitle>
              <CardDescription>
                Volume de SMS envoyés par jour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={smsChartData} dataKeys={['Envoyé']} type="bar" height={350} />
            </CardContent>
          </Card>

          {/* Tableau des SMS par pays */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Détail par pays</CardTitle>
                  <CardDescription>
                    Répartition des SMS et coûts par pays de destination
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrer par pays..."
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pays</TableHead>
                    <TableHead className="text-right">Nombre de SMS</TableHead>
                    <TableHead className="text-right">Coût total</TableHead>
                    <TableHead className="text-right">Coût unitaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smsByCountryData
                    ?.filter((stat: { country: string }) =>
                      stat.country.toLowerCase().includes(countryFilter.toLowerCase())
                    )
                    .map((stat: { country: string; count: number; totalCost: number; averageCost: number }) => (
                      <TableRow key={stat.country}>
                        <TableCell className="font-medium">{stat.country}</TableCell>
                        <TableCell className="text-right">{stat.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{stat.totalCost.toFixed(4)} €</TableCell>
                        <TableCell className="text-right">{stat.averageCost.toFixed(4)} €</TableCell>
                      </TableRow>
                    ))}
                  {(!smsByCountryData || smsByCountryData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Aucune donnée disponible
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet DeepL */}
        <TabsContent value="deepl" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="Caractères traduits"
              value={deeplData?.totals.totalCharacters?.toLocaleString() || 0}
              icon={<Languages className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Coût estimé"
              value={`${deeplCost.toFixed(3)} $`}
              subtitle={`20 $ pour 1.000.000 tokens`}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Utilisation DeepL</CardTitle>
              <CardDescription>
                Volume de caractères traduits par jour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={deeplChartData} dataKeys={['Caractère traduit']} type="bar" height={350} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet OpenAI */}
        <TabsContent value="openai" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Requêtes"
              value={openaiData?.totals.totalRequests || 0}
              icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Tokens prompt"
              value={openaiData?.totals.totalPromptTokens.toLocaleString() || 0}
              icon={<span className="text-muted-foreground">→</span>}
            />
            <StatCard
              title="Tokens réponse"
              value={openaiData?.totals.totalCompletionTokens.toLocaleString() || 0}
              icon={<span className="text-muted-foreground">←</span>}
            />
            <StatCard
              title="Tokens totaux"
              value={openaiData?.totals.totalTokens.toLocaleString() || 0}
              icon={<span className="text-muted-foreground">Σ</span>}
            />
            <StatCard
              title="Coût estimé"
              value={`${openaiCost.toFixed(3)} $`}
              subtitle={`≈ 0,775 $ pour 1.000.000 tokens`}
              tooltipContent="Hypothèse moyenne pour 70% input et 30% output"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Utilisation OpenAI</CardTitle>
              <CardDescription>
                Requêtes et tokens consommés par jour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MixedChart data={openaiChartData} barKeys={['Token (x1000)']} lineKeys={['Requête']} height={350} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
