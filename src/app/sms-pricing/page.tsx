"use client";

import { useState, useEffect } from 'react';
import { SmsPricingService, getAllSmsPricing } from '@/lib/sms-pricing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PricingData {
  pricing: Record<string, number>;
  stats: {
    totalCountries: number;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    priceRanges: Record<string, number>;
  };
  version: string;
}

export default function SmsPricingAdmin() {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState<string>('all');
  const [testCountry, setTestCountry] = useState('France');
  const [testSmsCount, setTestSmsCount] = useState(10);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    // Charger les données de pricing
    const data = getAllSmsPricing();
    setPricingData(data);
  }, []);

  const handleTestCalculation = () => {
    if (testCountry && testSmsCount > 0) {
      const result = SmsPricingService.calculateSMSCost(testCountry, testSmsCount);
      setTestResult(result);
    }
  };

  const filteredCountries = pricingData ? 
    Object.entries(pricingData.pricing)
      .filter(([country, price]) => {
        const matchesSearch = country.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (selectedRange === 'all') return matchesSearch;
        
        const ranges: Record<string, [number, number]> = {
          'cheap': [0, 0.05],
          'medium': [0.05, 0.10],
          'expensive': [0.10, 0.15],
          'very-expensive': [0.15, 1],
        };
        
        const [min, max] = ranges[selectedRange];
        return matchesSearch && price >= min && price < max;
      })
      .sort(([, a], [, b]) => a - b)
    : [];

  if (!pricingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Chargement des données de tarification SMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Tarifs SMS</h1>
          <p className="text-muted-foreground">
            Système de versioning avec {pricingData.stats.totalCountries} pays - Version {pricingData.version}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="countries">Liste des pays</TabsTrigger>
          <TabsTrigger value="calculator">Calculateur</TabsTrigger>
          <TabsTrigger value="versioning">Versioning</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pricingData.stats.totalCountries}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prix Minimum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pricingData.stats.minPrice.toFixed(4)}€</div>
                <p className="text-xs text-muted-foreground">United States</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prix Maximum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pricingData.stats.maxPrice.toFixed(4)}€</div>
                <p className="text-xs text-muted-foreground">Afghanistan, Ethiopia, Madagascar</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prix Moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pricingData.stats.avgPrice.toFixed(4)}€</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par Tranches de Prix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(pricingData.stats.priceRanges).map(([range, count]) => {
                  const percentage = ((count / pricingData.stats.totalCountries) * 100).toFixed(1);
                  return (
                    <div key={range} className="text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">{range}</div>
                      <Badge variant="outline">{percentage}%</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Pays et Tarifs</CardTitle>
              <CardDescription>
                Recherchez et filtrez les {pricingData.stats.totalCountries} pays configurés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Rechercher un pays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <select 
                  value={selectedRange} 
                  onChange={(e) => setSelectedRange(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">Tous les prix</option>
                  <option value="cheap">0-0.05€ (Économique)</option>
                  <option value="medium">0.05-0.10€ (Moyen)</option>
                  <option value="expensive">0.10-0.15€ (Cher)</option>
                  <option value="very-expensive">0.15€+ (Très cher)</option>
                </select>
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredCountries.length} pays affichés sur {pricingData.stats.totalCountries}
              </div>

              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {filteredCountries.map(([country, price]) => {
                  let priceColor = 'text-green-600';
                  if (price >= 0.15) priceColor = 'text-red-600';
                  else if (price >= 0.10) priceColor = 'text-orange-600';
                  else if (price >= 0.05) priceColor = 'text-yellow-600';

                  return (
                    <div key={country} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{country}</span>
                      <span className={`font-mono ${priceColor}`}>{price.toFixed(4)}€</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculateur de Coût SMS</CardTitle>
              <CardDescription>
                Testez les calculs de coût pour différents pays et volumes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Pays</label>
                  <Input
                    value={testCountry}
                    onChange={(e) => setTestCountry(e.target.value)}
                    placeholder="Ex: France"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nombre de SMS</label>
                  <Input
                    type="number"
                    value={testSmsCount}
                    onChange={(e) => setTestSmsCount(Number(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              <Button onClick={handleTestCalculation}>
                Calculer le coût
              </Button>

              {testResult && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span>Pays:</span>
                        <span className="font-medium">{testCountry}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nombre de SMS:</span>
                        <span className="font-medium">{testSmsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prix unitaire:</span>
                        <span className="font-mono">{testResult.unitPrice.toFixed(4)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Coût total:</span>
                        <span className="font-mono text-lg font-bold">{testResult.cost.toFixed(4)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <Badge variant={testResult.source === 'real_tariff' ? 'default' : 'secondary'}>
                          {testResult.source === 'real_tariff' ? 'Tarif réel' : 'Tarif par défaut'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versioning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Système de Versioning</CardTitle>
              <CardDescription>
                Gestion des versions de tarification pour préserver l&apos;historique
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-950">
                <h4 className="font-medium">Version Actuelle: {pricingData.version}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Tarifs extraits du fichier HTML fourni - {pricingData.stats.totalCountries} pays configurés
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Fonctionnalités à venir:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Création de nouvelles versions de tarification</li>
                  <li>• Historique des modifications avec dates d&apos;effet</li>
                  <li>• Calculs automatiques basés sur la date des SMS</li>
                  <li>• Interface d&apos;import de nouveaux tarifs</li>
                  <li>• Comparaison entre versions</li>
                </ul>
              </div>

              <div className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-950">
                <p className="text-sm">
                  <strong>Note:</strong> Le système de versioning complet sera activé une fois les tables Prisma disponibles.
                  Les tarifs actuels garantissent déjà la précision des calculs.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}