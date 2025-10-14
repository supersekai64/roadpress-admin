"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, User, Loader2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface License {
  readonly id: string;
  readonly licenseKey: string;
  readonly clientName: string;
  readonly status: string;
}

interface SmsStatsByMonth {
  readonly month: string;
  readonly totalSms: number;
  readonly totalCost: number;
  readonly byCountry: Array<{
    readonly country: string;
    readonly count: number;
    readonly cost: number;
  }>;
}

export default function ReportsPage() {
  const [selectedLicense, setSelectedLicense] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();

  // Récupérer toutes les licences
  const { data: licenses = [], isLoading: licensesLoading } = useQuery<License[]>({
    queryKey: ['licenses'],
    queryFn: async () => {
      const response = await fetch('/api/licenses');
      if (!response.ok) throw new Error('Erreur chargement licences');
      return response.json();
    },
  });

  // Générer les années disponibles (5 dernières années)
  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  // Récupérer les stats SMS pour le client et l'année sélectionnés
  const { data: smsStats, isLoading: statsLoading } = useQuery<SmsStatsByMonth[]>({
    queryKey: ['sms-report', selectedLicense, selectedYear],
    queryFn: async () => {
      if (!selectedLicense || !selectedYear) return [];
      
      const response = await fetch(
        `/api/statistics/sms/report?licenseId=${selectedLicense}&year=${selectedYear}`
      );
      if (!response.ok) throw new Error('Erreur chargement statistiques');
      return response.json();
    },
    enabled: !!selectedLicense && !!selectedYear,
  });

  // Calculer les totaux annuels
  const yearlyTotals = smsStats?.reduce(
    (acc, month) => ({
      totalSms: acc.totalSms + month.totalSms,
      totalCost: acc.totalCost + month.totalCost,
    }),
    { totalSms: 0, totalCost: 0 }
  ) || { totalSms: 0, totalCost: 0 };

  // Fonction pour exporter le rapport en Excel
  const handleExportReport = async () => {
    if (!selectedLicense || !selectedYear || !smsStats) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un client et une année',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const selectedClient = licenses.find(l => l.id === selectedLicense);
      const clientName = selectedClient?.clientName || 'client';
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

      // Créer un nouveau workbook
      const workbook = XLSX.utils.book_new();

      // ======== FEUILLE 1 : RÉSUMÉ ========
      const summaryData = [
        ['RAPPORT SMS'],
        [''],
        ['Client:', clientName],
        ['Année:', selectedYear],
        ['Date d\'export:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })],
        [''],
        ['TOTAUX ANNUELS'],
        ['Total SMS envoyés:', yearlyTotals.totalSms],
        ['Coût total:', `${yearlyTotals.totalCost.toFixed(2)} €`],
        ['Coût moyen par SMS:', `${(yearlyTotals.totalCost / yearlyTotals.totalSms).toFixed(4)} €`],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Largeurs de colonnes pour la feuille résumé
      summarySheet['!cols'] = [
        { wch: 20 },
        { wch: 30 },
      ];

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

      // ======== FEUILLE 2 : DÉTAIL MENSUEL ========
      const monthlyData: (string | number)[][] = [
        ['DÉTAIL MENSUEL'],
        [''],
        ['Mois', 'Nombre de SMS', 'Coût total (€)', 'Coût unitaire (€)'],
      ];

      for (const monthData of smsStats) {
        const avgCost = monthData.totalSms > 0 
          ? (monthData.totalCost / monthData.totalSms).toFixed(4) 
          : '0';
        
        monthlyData.push([
          monthData.month,
          monthData.totalSms,
          monthData.totalCost.toFixed(2),
          avgCost,
        ]);
      }

      const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
      
      // Largeurs de colonnes
      monthlySheet['!cols'] = [
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Détail Mensuel');

      // ======== FEUILLES 3+ : DÉTAIL PAR MOIS ========
      for (const monthData of smsStats) {
        const monthSheetData: (string | number)[][] = [
          [monthData.month.toUpperCase()],
          [''],
          ['Total SMS:', monthData.totalSms],
          ['Coût total:', `${monthData.totalCost.toFixed(2)} €`],
          [''],
          ['DÉTAIL PAR PAYS'],
          ['Pays', 'Nombre de SMS', 'Coût total (€)', 'Coût unitaire (€)', '% du mois'],
        ];

        for (const country of monthData.byCountry) {
          const avgCost = country.count > 0 
            ? (country.cost / country.count).toFixed(4) 
            : '0';
          const percentage = ((country.count / monthData.totalSms) * 100).toFixed(1);
          
          monthSheetData.push([
            country.country,
            country.count,
            country.cost.toFixed(2),
            avgCost,
            `${percentage}%`,
          ]);
        }

        const monthSheet = XLSX.utils.aoa_to_sheet(monthSheetData);
        
        // Largeurs de colonnes
        monthSheet['!cols'] = [
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 12 },
        ];

        // Nom de la feuille (limité à 31 caractères)
        const sheetName = monthData.month.substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, monthSheet, sheetName);
      }

      // ======== FEUILLE DERNIÈRE : RÉCAPITULATIF PAR PAYS ========
      const countryTotals: Record<string, { count: number; cost: number }> = {};
      
      for (const monthData of smsStats) {
        for (const country of monthData.byCountry) {
          if (!countryTotals[country.country]) {
            countryTotals[country.country] = { count: 0, cost: 0 };
          }
          countryTotals[country.country].count += country.count;
          countryTotals[country.country].cost += country.cost;
        }
      }

      const countryData: (string | number)[][] = [
        ['RÉCAPITULATIF PAR PAYS'],
        [''],
        ['Pays', 'Nombre de SMS', 'Coût total (€)', 'Coût unitaire (€)', '% de l\'année'],
      ];

      const sortedCountries = Object.entries(countryTotals).sort(
        ([, a], [, b]) => b.count - a.count
      );

      for (const [country, data] of sortedCountries) {
        const avgCost = data.count > 0 ? (data.cost / data.count).toFixed(4) : '0';
        const percentage = ((data.count / yearlyTotals.totalSms) * 100).toFixed(1);
        
        countryData.push([
          country,
          data.count,
          data.cost.toFixed(2),
          avgCost,
          `${percentage}%`,
        ]);
      }

      const countrySheet = XLSX.utils.aoa_to_sheet(countryData);
      
      // Largeurs de colonnes
      countrySheet['!cols'] = [
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(workbook, countrySheet, 'Récap. par Pays');

      // Générer et télécharger le fichier Excel
      XLSX.writeFile(
        workbook,
        `rapport-sms-${clientName.toLowerCase().replace(/\s+/g, '-')}-${selectedYear}-${timestamp}.xlsx`
      );

      toast({
        title: 'Export réussi',
        description: 'Le rapport Excel a été téléchargé avec succès',
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedClient = licenses.find(l => l.id === selectedLicense);
  const canExport = selectedLicense && selectedYear && smsStats && smsStats.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports SMS</h1>
        <p className="text-muted-foreground">
          Exportez les statistiques SMS détaillées par client
        </p>
      </div>

      {/* Formulaire de sélection */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres du rapport</CardTitle>
          <CardDescription>
            Sélectionnez un client et une année pour générer le rapport
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Client
              </label>
              <Select value={selectedLicense} onValueChange={setSelectedLicense}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client..." />
                </SelectTrigger>
                <SelectContent>
                  {licensesLoading ? (
                    <SelectItem value="loading" disabled>
                      Chargement...
                    </SelectItem>
                  ) : (
                    licenses.map((license) => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.clientName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Année
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleExportReport}
              disabled={!canExport || isExporting}
              className="w-full md:w-auto gap-2"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Exporter le rapport Excel
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
