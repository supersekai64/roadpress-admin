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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Skeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { fr } from 'date-fns/locale';
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
  readonly recentActivity: {
    readonly averageResponseTime: number;
  };
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
  categories: string[];
  status: string;
  statuses: string[];
  action: string;
  licenseId: string;
  clientName: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  search: string;
}

// Composant helper pour les sélecteurs de date avec fermeture automatique
interface DatePickerFieldProps {
  readonly label: string;
  readonly value: Date | undefined;
  readonly onChange: (date: Date | undefined) => void;
}

function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {value ? (
              format(value, 'dd MMM yyyy', { locale: fr })
            ) : (
              <span>Sélectionner</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setIsOpen(false);
            }}
            initialFocus
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function DebugClient() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres et pagination
  const [currentFilters, setCurrentFilters] = useState<DebugFilters>({
    category: 'ALL',
    categories: [],
    status: 'ALL',
    statuses: [],
    action: '',
    licenseId: '',
    clientName: '',
    dateFrom: undefined,
    dateTo: undefined,
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // État pour le filtre client avec recherche
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
  // État pour le filtre catégories avec recherche
  const [categoriesSearchOpen, setCategoriesSearchOpen] = useState(false);
  const [categoriesSearchQuery, setCategoriesSearchQuery] = useState('');
  
  // État pour le filtre statuts avec recherche
  const [statusesSearchOpen, setStatusesSearchOpen] = useState(false);
  
  // État pour la dialog de détails
  const [selectedLog, setSelectedLog] = useState<DebugLog | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Liste statique de tous les statuts possibles
  const availableStatuses = ['SUCCESS', 'INFO', 'WARNING', 'ERROR'];

  // Chargement des statistiques et filtres disponibles
  const loadStatsAndFilters = useCallback(async () => {
    try {
      const response = await fetch('/api/debug/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorText = `HTTP ${response.status}`;
        
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorText += ` - ${JSON.stringify(errorData)}`;
        } else if (contentType?.includes('text/html')) {
          errorText += ' - Page HTML retournée (probablement 404/401)';
        } else {
          const text = await response.text();
          errorText += ` - ${text.substring(0, 200)}`;
        }
        
        console.error('Erreur API stats:', { status: response.status, contentType, errorText });
        throw new Error(errorText);
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
      // Utiliser refreshing au lieu de loading pour ne pas masquer toute l'interface
      // sauf pour le tout premier chargement initial
      if (initialLoadDone) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortField,
        sortDirection,
      });

      // Ajouter les filtres non vides
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (key === 'dateFrom' || key === 'dateTo') {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          }
        } else if (key === 'categories' && Array.isArray(value) && value.length > 0) {
          // Envoyer les catégories en tant que paramètre séparé par virgule
          params.append(key, value.join(','));
        } else if (key === 'statuses' && Array.isArray(value) && value.length > 0) {
          // Envoyer les statuts en tant que paramètre séparé par virgule
          params.append(key, value.join(','));
        } else if (typeof value === 'string' && value.trim()) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/debug/logs?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorText = `HTTP ${response.status}`;
        
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorText += ` - ${JSON.stringify(errorData)}`;
        } else if (contentType?.includes('text/html')) {
          errorText += ' - Page HTML retournée (probablement 404/401)';
        } else {
          const text = await response.text();
          errorText += ` - ${text.substring(0, 200)}`;
        }
        
        console.error('Erreur API logs:', { status: response.status, contentType, errorText });
        throw new Error(errorText);
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
      setRefreshing(false);
      setInitialLoadDone(true);
    }
  }, [currentPage, itemsPerPage, sortField, sortDirection, currentFilters, initialLoadDone]);

  // Chargement initial
  useEffect(() => {
    loadStatsAndFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger une seule fois au montage

  useEffect(() => {
    loadLogs();
  }, [
    loadLogs, // Fonction stabilisée avec useCallback
    currentPage, 
    itemsPerPage, 
    sortField, 
    sortDirection,
    currentFilters, // Référence à l'objet complet
  ]); // Recharger si une de ces valeurs change

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
  const updateFilter = (key: keyof DebugFilters, value: string | Date | undefined | string[]) => {
    setCurrentFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Fonction d'export
  const [exporting, setExporting] = useState(false);
  const exportLogs = async () => {
    if (exporting) return;
    
    try {
      setExporting(true);
      const params = new URLSearchParams({
        sortField,
        sortDirection,
      });

      // Ajouter les filtres
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (key === 'dateFrom' || key === 'dateTo') {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          }
        } else if (typeof value === 'string' && value.trim()) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/debug/export?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export:', error);
      setError(error instanceof Error ? error.message : 'Erreur export');
    } finally {
      setExporting(false);
    }
  };

  // Fonction de nettoyage
  const [cleaning, setCleaning] = useState(false);
  const cleanLogs = async (days: number) => {
    if (cleaning) return;
    
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer les logs de plus de ${days} jours ?`
    );
    
    if (!confirmed) return;
    
    try {
      setCleaning(true);
      const response = await fetch('/api/debug/clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ ${result.deleted} logs supprimés`);
      
      // Recharger les données
      await Promise.all([loadLogs(), loadStatsAndFilters()]);
    } catch (error) {
      console.error('Erreur nettoyage:', error);
      setError(error instanceof Error ? error.message : 'Erreur nettoyage');
    } finally {
      setCleaning(false);
    }
  };

  const clearFilters = () => {
    setCurrentFilters({
      category: 'ALL',
      categories: [],
      status: 'ALL',
      statuses: [],
      action: '',
      licenseId: '',
      clientName: '',
      dateFrom: undefined,
      dateTo: undefined,
      search: '',
    });
    setCurrentPage(1);
  };

  // Fonction de suppression d'un log individuel
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<DebugLog | null>(null);

  const deleteLog = async () => {
    if (!logToDelete || deleting) return;
    
    try {
      setDeleting(logToDelete.id);
      const response = await fetch(`/api/debug/logs/${logToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✅ Log supprimé`);
      
      // Recharger les logs
      await loadLogs();
      
      // Fermer la modal
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      setError(error instanceof Error ? error.message : 'Erreur suppression');
    } finally {
      setDeleting(null);
    }
  };

  // Fonction pour formater la durée
  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return '-';
    if (ms === 0) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Fonction pour obtenir l'icône et couleur du statut
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { icon: CheckCircle, color: 'text-success', bg: 'bg-green-100' };
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Debug</h1>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <p className="font-semibold">Erreur : {error}</p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => { setError(null); loadLogs(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        
        {/* Filters skeleton */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* Actions skeleton */}
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug</h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">
              Surveillance en temps réel de toutes les activités de l{`'`}application
            </p>
            {stats && stats.recentActivity.averageResponseTime > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Temps de réponse moy. (jour) :</span>
                <span className="font-medium text-xs">{formatDuration(stats.recentActivity.averageResponseTime)}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadLogs}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")} />
            Actualiser
          </Button>
          <Button 
            variant="outline"
            onClick={exportLogs}
            disabled={exporting || totalCount === 0}
          >
            <Download className={cn("h-4 w-4", exporting && "animate-spin")} />
            {exporting ? 'Export...' : 'Exporter'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                disabled={cleaning || totalCount === 0}
              >
                <Trash2 className={cn("h-4 w-4", cleaning && "animate-spin")} />
                {cleaning ? 'Nettoyage...' : 'Nettoyer'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => cleanLogs(7)}>
                Supprimer logs &gt; 7 jours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => cleanLogs(30)}>
                Supprimer logs &gt; 30 jours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => cleanLogs(90)}>
                Supprimer logs &gt; 90 jours
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4">
          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Recherche globale */}
              <div className="mb-4 space-y-2">
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

              {/* Filtres sur la même ligne */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* Catégorie (sélection simple) */}
                <div className="space-y-2">
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
                      {filters?.categories.filter((category) => category !== 'ALL').map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Statut (sélection multiple) */}
                <div className="space-y-2">
                  <Label>
                    Statut {currentFilters.statuses.length > 0 && `(${currentFilters.statuses.length})`}
                  </Label>
                  <Popover open={statusesSearchOpen} onOpenChange={setStatusesSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={statusesSearchOpen}
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {currentFilters.statuses.length === 0
                            ? 'Tous les statuts'
                            : currentFilters.statuses.length === 1
                            ? currentFilters.statuses[0]
                            : `${currentFilters.statuses.length} sélectionnés`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {availableStatuses.map((status) => {
                            const isSelected = currentFilters.statuses.includes(status);
                            return (
                              <div
                                key={status}
                                className={cn(
                                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                  isSelected && 'bg-accent'
                                )}
                                onClick={() => {
                                  const newStatuses = isSelected
                                    ? currentFilters.statuses.filter(s => s !== status)
                                    : [...currentFilters.statuses, status];
                                  updateFilter('statuses', newStatuses);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    isSelected ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {status}
                              </div>
                            );
                          })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Client */}
                <div className="space-y-2">
                  <Label htmlFor="client">Client {currentFilters.clientName && '(1)'}</Label>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientSearchOpen}
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {currentFilters.clientName || 'Tous les clients'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <div className="flex items-center border-b px-3 bg-card">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="Rechercher un client..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-card"
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {filters?.activeClients
                          .filter((client) =>
                            client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
                          )
                          .map((client) => {
                            const isSelected = currentFilters.clientName === client.name;
                            return (
                              <div
                                key={client.id}
                                className={cn(
                                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                  isSelected && 'bg-accent'
                                )}
                                onClick={() => {
                                  // Si déjà sélectionné, décocher (vider le filtre)
                                  // Sinon, sélectionner ce client
                                  updateFilter('clientName', isSelected ? '' : client.name);
                                  setClientSearchOpen(false);
                                  setClientSearchQuery('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    isSelected ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {client.name}
                              </div>
                            );
                          })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date de début */}
                <DatePickerField
                  label="Date de début"
                  value={currentFilters.dateFrom}
                  onChange={(date) => updateFilter('dateFrom', date)}
                />

                {/* Date de fin */}
                <DatePickerField
                  label="Date de fin"
                  value={currentFilters.dateTo}
                  onChange={(date) => updateFilter('dateTo', date)}
                />

                {/* Bouton Effacer les filtres */}
                <div className="space-y-2 flex flex-col justify-end">
                  <Button 
                    variant="outline" 
                    className="w-full h-10"
                    onClick={clearFilters}
                  >
                    Effacer les filtres
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tableau des logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Logs ({totalCount.toLocaleString()})</span>
                {refreshing && (
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
                    {logs.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="h-32 pt-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Activity className="h-8 w-8" />
                            <p>Aucun log pour le moment</p>
                            <p className="text-sm">Les logs des clients apparaîtront ici automatiquement</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => {
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
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  disabled={deleting === log.id}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedLog(log);
                                    setDetailsDialogOpen(true);
                                  }}
                                >
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setLogToDelete(log);
                                    setDeleteDialogOpen(true);
                                  }}
                                  disabled={deleting === log.id}
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {totalCount === 0 ? (
                    'Aucune entrée'
                  ) : (
                    <>Page {currentPage} sur {totalPages} ({totalCount.toLocaleString()} élément{totalCount > 1 ? 's' : ''})</>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading || refreshing || totalCount === 0 || totalPages <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages || loading || refreshing || totalCount === 0 || totalPages <= 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Dialog des détails du log */}
      {selectedLog && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Détails du log
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Horodatage</Label>
                  <p className="font-mono text-sm">
                    {new Date(selectedLog.timestamp).toLocaleString('fr-FR', {
                      dateStyle: 'full',
                      timeStyle: 'long',
                    })}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Catégorie</Label>
                  <div>
                    <Badge className={getCategoryColor(selectedLog.category)}>
                      {selectedLog.category}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Action</Label>
                  <p className="font-mono text-sm">{selectedLog.action}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Statut</Label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const statusInfo = getStatusInfo(selectedLog.status);
                      const StatusIcon = statusInfo.icon;
                      return (
                        <>
                          <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                          <Badge variant="secondary" className={cn("text-xs", statusInfo.color)}>
                            {selectedLog.status}
                          </Badge>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {selectedLog.method && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Méthode HTTP</Label>
                    <p className="font-mono text-sm">{selectedLog.method}</p>
                  </div>
                )}
                
                {selectedLog.endpoint && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Endpoint</Label>
                    <p className="font-mono text-sm">{selectedLog.endpoint}</p>
                  </div>
                )}
                
                {selectedLog.clientName && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Client</Label>
                    <p className="font-mono text-sm">{selectedLog.clientName}</p>
                  </div>
                )}
                
                {selectedLog.licenseId && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">License ID</Label>
                    <p className="font-mono text-sm">{selectedLog.licenseId}</p>
                  </div>
                )}
                
                {selectedLog.duration !== null && selectedLog.duration !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Durée</Label>
                    <p className="font-mono text-sm">{formatDuration(selectedLog.duration)}</p>
                  </div>
                )}
              </div>

              {/* Message */}
              {selectedLog.message && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Message</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedLog.message}</p>
                  </div>
                </div>
              )}

              {/* Request Data */}
              {selectedLog.requestData && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Données de la requête</Label>
                  <div className="p-3 bg-muted rounded-md overflow-x-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedLog.requestData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response Data */}
              {selectedLog.responseData && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Données de la réponse</Label>
                  <div className="p-3 bg-muted rounded-md overflow-x-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedLog.responseData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedLog.errorDetails && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm text-destructive">Détails de l&apos;erreur</Label>
                  <div className="p-3 bg-destructive/10 rounded-md overflow-x-auto border border-destructive/20">
                    <pre className="text-xs font-mono text-destructive whitespace-pre-wrap">
                      {selectedLog.errorDetails}
                    </pre>
                  </div>
                </div>
              )}

              {/* JSON complet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-sm">JSON complet</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                    }}
                  >
                    Copier JSON
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setDetailsDialogOpen(false)}
              >
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le log</DialogTitle>
            <DialogDescription className="pt-4 text-base">
              Êtes-vous sûr de vouloir supprimer ce log ?<br />Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setLogToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={deleteLog}
              disabled={deleting !== null}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}