"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Pencil, Trash2, Search, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton, PageHeaderSkeleton, TableSkeleton, StatCardSkeleton } from '@/components/ui/skeleton';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CreateLicenseDialog } from './create-license-dialog';
import { EditLicenseDialog } from './edit-license-dialog';

interface License {
  readonly id: string;
  readonly licenseKey: string;
  readonly clientName: string;
  readonly status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  readonly startDate: string;
  readonly endDate: string;
  readonly siteUrl: string | null;
  readonly isAssociated: boolean;
  readonly createdAt: string;
  readonly lastUpdate: string;
  readonly _count?: {
    emailStats: number;
    smsStats: number;
    deeplStats: number;
    openaiStats: number;
    pois: number;
  };
}

const STATUS_LABELS = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  EXPIRED: 'Expiré',
};

const STATUS_VARIANTS = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  EXPIRED: 'destructive',
} as const;

export default function LicensesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les licences
  const { data: licenses = [], isLoading } = useQuery<License[]>({
    queryKey: ['licenses', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await fetch(`/api/licenses?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des licences');
      }
      return response.json();
    },
  });

  // Mutation pour supprimer une licence
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/licenses/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      toast({
        title: 'Licence supprimée',
        description: 'La licence a été supprimée avec succès.',
      });
      setDeleteDialogOpen(false);
      setSelectedLicense(null);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        variant: 'destructive',
      });
    },
  });

  // Fonction pour copier la clé de licence
  const copyLicenseKey = async (licenseKey: string) => {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopiedKey(licenseKey);
      toast({
        title: 'Copié !',
        description: 'La clé de licence a été copiée dans le presse-papier.',
      });
      // Réinitialiser après 2 secondes
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier la clé de licence.',
        variant: 'destructive',
      });
    }
  };

  const columns: ColumnDef<License>[] = [
    {
      accessorKey: 'licenseKey',
      header: 'Clé de licence',
      cell: ({ row }) => {
        const licenseKey = row.getValue('licenseKey') as string;
        const isCopied = copiedKey === licenseKey;
        
        return (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {licenseKey}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyLicenseKey(licenseKey)}
              title="Copier la clé de licence"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'clientName',
      header: 'Client',
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const status = row.getValue('status') as License['status'];
        return (
          <Badge variant={STATUS_VARIANTS[status]}>
            {STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'startDate',
      header: 'Date de début',
      cell: ({ row }) => {
        const date = new Date(row.getValue('startDate'));
        return format(date, 'dd MMM yyyy', { locale: fr });
      },
    },
    {
      accessorKey: 'endDate',
      header: 'Date de fin',
      cell: ({ row }) => {
        const date = new Date(row.getValue('endDate'));
        return format(date, 'dd MMM yyyy', { locale: fr });
      },
    },
    {
      accessorKey: 'siteUrl',
      header: 'Site',
      cell: ({ row }) => {
        const url = row.getValue('siteUrl') as string | null;
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            {new URL(url).hostname}
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">Non défini</span>
        );
      },
    },
    {
      accessorKey: 'isAssociated',
      header: 'Associé',
      cell: ({ row }) => {
        const isAssociated = row.getValue('isAssociated') as boolean;
        return (
          <Badge variant={isAssociated ? 'default' : 'outline'}>
            {isAssociated ? 'Oui' : 'Non'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const license = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedLicense(license);
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedLicense(license);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: licenses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Licences</h1>
          <p className="text-muted-foreground">
            Gérez les licences de vos clients
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle licence
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>
            Recherchez et filtrez les licences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par client, clé ou site..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="INACTIVE">Inactif</SelectItem>
                <SelectItem value="EXPIRED">Expiré</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <TableSkeleton rows={10} />
            </div>
          ) : licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">Aucune licence trouvée</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer une licence
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateLicenseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedLicense && (
        <EditLicenseDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          license={selectedLicense}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la licence</DialogTitle>
            <DialogDescription className="pt-4 text-base">
              Êtes-vous sûr de vouloir supprimer cette licence ? Cette action
              est irréversible et supprimera également toutes les statistiques
              associées.
            </DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="py-4">
              <p className="text-md">
                <strong>Client :</strong> {selectedLicense.clientName}
              </p>
              <p className="text-md">
                <strong>Clé :</strong>{' '}
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {selectedLicense.licenseKey}
                </code>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedLicense(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedLicense) {
                  deleteMutation.mutate(selectedLicense.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
