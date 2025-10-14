"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Calendar,
  MoreHorizontal,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugLog {
  readonly id: string;
  readonly category: string;
  readonly action: string;
  readonly method?: string;
  readonly endpoint?: string;
  readonly licenseId?: string;
  readonly clientName?: string;
  readonly status: string;
  readonly message?: string;
  readonly requestData?: any;
  readonly responseData?: any;
  readonly errorDetails?: string;
  readonly duration?: number;
  readonly timestamp: string;
  readonly license?: {
    readonly licenseKey: string;
    readonly clientName: string;
  };
}

interface DebugStats {
  readonly totalLogs: number;
  readonly categoriesStats: ReadonlyArray<{
    readonly category: string;
    readonly count: number;
    readonly lastActivity: string;
  }>;
  readonly statusStats: ReadonlyArray<{
    readonly status: string;
    readonly count: number;
  }>;
  readonly recentActivity: {
    readonly logsLast24h: number;
    readonly logsLast7d: number;
    readonly mostActiveClient: string;
    readonly mostActiveAction: string;
    readonly averageResponseTime: number;
  };
  readonly topClients: ReadonlyArray<{
    readonly clientName: string;
    readonly count: number;
  }>;
  readonly topActions: ReadonlyArray<{
    readonly action: string;
    readonly count: number;
  }>;
}

interface Filters {
  readonly categories: ReadonlyArray<string>;
  readonly statuses: ReadonlyArray<string>;
  readonly recentActions: ReadonlyArray<string>;
  readonly activeClients: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
}

interface DebugFilters {
  category: string;
  status: string;
  action: string;
  licenseId: string;
  clientName: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export default function DebugClient() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres et pagination
  const [currentFilters, setCurrentFilters] = useState<DebugFilters>({
    category: 'ALL',
    status: 'ALL',
    action: '',
    licenseId: '',
    clientName: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Chargement des statistiques et filtres disponibles
  const loadStatsAndFilters = useCallback(async () => {
    try {
      const response = await fetch('/api/debug/stats');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setStats(data.stats);
      setFilters(data.filters);
    } catch (err) {
      console.error('Erreur chargement stats :', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, []);

  // Chargement des logs
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortField,
        sortDirection,
      });

      // Ajouter les filtres non vides
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/debug/logs?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);

    } catch (err) {
      console.error('Erreur chargement logs :', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortDirection, currentFilters]);

  // Chargement initial
  useEffect(() => {
    loadStatsAndFilters();
  }, [loadStatsAndFilters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Gestion du tri
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Gestion des filtres
  const updateFilter = (key: keyof DebugFilters, value: string) => {
    setCurrentFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setCurrentFilters({
      category: 'ALL',
      status: 'ALL',
      action: '',
      licenseId: '',
      clientName: '',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
    setCurrentPage(1);
  };

  // Fonction pour formater la durée
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Fonction pour obtenir l'icône et couleur du statut
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'INFO':
        return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'WARNING':
        return { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'ERROR':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // Fonction pour obtenir la couleur de la catégorie
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      SYNC: 'bg-blue-100 text-blue-800',
      PUSH_API: 'bg-purple-100 text-purple-800',
      LICENSE: 'bg-green-100 text-green-800',
      API_USAGE: 'bg-orange-100 text-orange-800',
      POI: 'bg-cyan-100 text-cyan-800',
      AUTH: 'bg-indigo-100 text-indigo-800',
      PRICING: 'bg-pink-100 text-pink-800',
      SYSTEM: 'bg-gray-100 text-gray-800',
      ERROR: 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Fonction pour créer des logs de test
  const [creatingLogs, setCreatingLogs] = useState(false);
  const createTestLogs = async () => {
    if (creatingLogs) return;
    
    try {
      setCreatingLogs(true);
      const response = await fetch('/api/debug/test-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 20 }), // Créer 20 logs de test
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Logs de test créés:', result);
      
      // Recharger les données
      await Promise.all([loadLogs(), loadStatsAndFilters()]);
      
    } catch (error) {
      console.error('❌ Erreur création logs test:', error);
      setError(error instanceof Error ? error.message : 'Erreur création logs test');
    } finally {
      setCreatingLogs(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Debug</h1>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <p>Erreur : {error}</p>
            </div>
            <Button onClick={() => loadLogs()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug</h1>
          <p className="text-muted-foreground">
            Surveillance en temps réel de toutes les activités de l{`'`}application
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button 
            variant="outline" 
            onClick={createTestLogs}
            disabled={creatingLogs}
          >
            <Activity className={cn("h-4 w-4 mr-2", creatingLogs && "animate-spin")} />
            {creatingLogs ? 'Création...' : 'Logs test'}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Nettoyer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                Supprimer logs &gt; 7 jours
              </DropdownMenuItem>
              <DropdownMenuItem>
                Supprimer logs &gt; 30 jours
              </DropdownMenuItem>
              <DropdownMenuItem>
                Supprimer logs &gt; 90 jours
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logs total</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">
                {stats.recentActivity.logsLast24h} dernières 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Client actif</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {stats.recentActivity.mostActiveClient}
              </div>
              <p className="text-sm text-muted-foreground">
                Plus actif cette semaine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(stats.recentActivity.averageResponseTime)}
              </div>
              <p className="text-sm text-muted-foreground">
                Temps de réponse moyen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action fréquente</CardTitle>
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {stats.recentActivity.mostActiveAction}
              </div>
              <p className="text-sm text-muted-foreground">
                Action la plus fréquente
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Logs en temps réel</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Recherche globale */}
                <div className="col-span-full">
                  <Label htmlFor="search">Recherche globale</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Rechercher dans tous les champs..."
                      value={currentFilters.search}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Catégorie */}
                <div>
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={currentFilters.category}
                    onValueChange={(value) => updateFilter('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Toutes</SelectItem>
                      {filters?.categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Statut */}
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={currentFilters.status}
                    onValueChange={(value) => updateFilter('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      {filters?.statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date de début */}
                <div>
                  <Label htmlFor="dateFrom">Date de début</Label>
                  <Input
                    id="dateFrom"
                    type="datetime-local"
                    value={currentFilters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  />
                </div>

                {/* Date de fin */}
                <div>
                  <Label htmlFor="dateTo">Date de fin</Label>
                  <Input
                    id="dateTo"
                    type="datetime-local"
                    value={currentFilters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Effacer les filtres
                </Button>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="itemsPerPage">Éléments par page :</Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tableau des logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Logs de debug ({totalCount.toLocaleString()})</span>
                {loading && (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center gap-1">
                          Horodatage
                          {sortField === 'timestamp' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          Catégorie
                          {sortField === 'category' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('action')}
                      >
                        <div className="flex items-center gap-1">
                          Action
                          {sortField === 'action' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Statut
                          {sortField === 'status' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const statusInfo = getStatusInfo(log.status);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getCategoryColor(log.category)}>
                              {log.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.action}
                            {log.method && (
                              <span className="text-muted-foreground ml-1">
                                [{log.method}]
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.clientName || log.license?.clientName || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                              <Badge variant="secondary" className={cn("text-xs", statusInfo.color)}>
                                {log.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDuration(log.duration)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.message || log.errorDetails || '-'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    // Ouvrir un modal avec les détails complets
                                    console.log('Détails du log :', log);
                                  }}
                                >
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                  }}
                                >
                                  Copier JSON
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages} ({totalCount.toLocaleString()} éléments)
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analyses et graphiques */}
          {stats && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Catégories */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.categoriesStats.map((cat, index) => (
                      <div key={cat.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(cat.category)}>
                            {cat.category}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{cat.count.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(cat.lastActivity).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Clients */}
              <Card>
                <CardHeader>
                  <CardTitle>Clients les plus actifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topClients.map((client, index) => (
                      <div key={client.clientName} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          <span className="truncate">{client.clientName}</span>
                        </div>
                        <Badge variant="secondary">{client.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions les plus fréquentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topActions.map((action, index) => (
                      <div key={action.action} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          <span className="font-mono text-sm truncate">{action.action}</span>
                        </div>
                        <Badge variant="outline">{action.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Répartition par Statut */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.statusStats.map((stat) => {
                      const statusInfo = getStatusInfo(stat.status);
                      const StatusIcon = statusInfo.icon;
                      const percentage = ((stat.count / stats.totalLogs) * 100).toFixed(1);

                      return (
                        <div key={stat.status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                            <span>{stat.status}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{stat.count.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}