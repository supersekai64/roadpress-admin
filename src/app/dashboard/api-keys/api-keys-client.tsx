"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Check, X, Edit2, Eye, EyeOff, Send } from 'lucide-react';
import { DeepLLogo, OpenAILogo, BrevoLogo, MapboxLogo } from '@/components/service-logos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton, PageHeaderSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ApiKey {
  readonly id: string;
  readonly service: string;
  readonly key: string;
  readonly isActive: boolean;
  readonly lastPush: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const SERVICE_INFO = {
  deepl: {
    name: 'DeepL',
    description: 'Service de traduction automatique',
    logo: DeepLLogo,
  },
  openai: {
    name: 'OpenAI',
    description: 'Intelligence artificielle GPT',
    logo: OpenAILogo,
  },
  brevo: {
    name: 'Brevo',
    description: "Service d'envoi d'emails et SMS",
    logo: BrevoLogo,
  },
  mapbox: {
    name: 'Mapbox',
    description: 'Cartes et géolocalisation',
    logo: MapboxLogo,
  },
};

export default function ApiKeysPage() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer toutes les clés API
  const { data: apiKeys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await fetch('/api/api-keys');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des clés');
      }
      return response.json();
    },
  });

  // Mutation pour modifier une clé
  const updateMutation = useMutation({
    mutationFn: async ({ service, key, isActive }: { service: string; key: string; isActive: boolean }) => {
      const response = await fetch(`/api/api-keys/${service}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, isActive }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la modification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'Clé modifiée',
        description: 'La clé API a été mise à jour avec succès.',
      });
      setEditDialogOpen(false);
      setSelectedService(null);
      setNewKey('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle actif/inactif
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ service, isActive }: { service: string; isActive: boolean }) => {
      const apiKey = apiKeys.find((k) => k.service === service);
      if (!apiKey || !apiKey.key) {
        throw new Error("Veuillez d'abord configurer une clé API");
      }

      const response = await fetch(`/api/api-keys/${service}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey.key, isActive }),
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la modification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'Statut modifié',
        description: 'Le statut de la clé a été mis à jour.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Push les clés vers tous les clients
  const pushKeysMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/api-keys/push', {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la distribution');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      
      // Afficher les détails des échecs si présents
      const hasFailures = data.failed > 0;
      const failureDetails = data.details?.failed?.map((f: { site: string; error: string }) => 
        `${f.site}: ${f.error}`
      ).join('\n') || '';

      toast({
        title: hasFailures ? 'Distribution partiellement réussie' : 'Distribution réussie',
        description: hasFailures 
          ? `${data.success} site(s) mis à jour, ${data.failed} échec(s)\n\nÉchecs:\n${failureDetails}`
          : `${data.success} site(s) mis à jour avec succès`,
        variant: hasFailures ? 'destructive' : 'default',
      });

      // Log des détails en console pour debug
      if (hasFailures) {
        console.log('Détails des échecs de distribution:', data.details);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (service: string) => {
    setSelectedService(service);
    setNewKey('');
    setShowKey(false);
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedService || !newKey) return;

    const apiKey = apiKeys.find((k) => k.service === selectedService);
    updateMutation.mutate({
      service: selectedService,
      key: newKey,
      isActive: apiKey?.isActive ?? true,
    });
  };

  const handleToggle = (service: string, checked: boolean) => {
    toggleActiveMutation.mutate({ service, isActive: checked });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        
        {/* Action button skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const activeKeysCount = apiKeys.filter(k => k.isActive && k.key).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clés API</h1>
          <p className="text-muted-foreground">
            Configurez les clés d&apos;API pour les services externes
          </p>
        </div>
        <Button
          onClick={() => pushKeysMutation.mutate()}
          disabled={pushKeysMutation.isPending || activeKeysCount === 0}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {pushKeysMutation.isPending ? 'Distribution...' : 'Distribuer aux clients'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
        {Object.entries(SERVICE_INFO).map(([service, info]) => {
          const apiKey = apiKeys.find((k) => k.service === service);
          const hasKey = apiKey?.key && apiKey.key !== '';
          const isActive = apiKey?.isActive ?? false;

          return (
            <Card key={service} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <info.logo className="w-10 h-10 p-1.5 rounded-md" />
                    <div>
                      <CardTitle>{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>
                  {hasKey && (
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Actif
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Inactif
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className={cn("space-y-4", !hasKey && "flex-1 flex flex-col")}>
                {hasKey ? (
                  <>
                    <div>
                      <Label className="text-sm text-muted-foreground">Clé API</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                          {apiKey?.key}
                        </code>
                      </div>
                    </div>

                    {apiKey?.lastPush && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Dernière mise à jour
                        </Label>
                        <p className="text-sm mt-1">
                          {new Date(apiKey.lastPush).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => handleToggle(service, checked)}
                        />
                        <Label className="text-sm">
                          {isActive ? 'Service actif' : 'Service inactif'}
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(service)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Aucune clé configurée
                    </p>
                    <Button onClick={() => handleEdit(service)}>
                      <Key className="w-4 h-4 mr-2" />
                      Configurer la clé
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog pour modifier une clé */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Modifier la clé{' '}
              {selectedService && SERVICE_INFO[selectedService as keyof typeof SERVICE_INFO]?.name}
            </DialogTitle>
            <DialogDescription>
              Entrez votre nouvelle clé API. Elle sera masquée pour la sécurité.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Clé API</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Entrez votre clé API..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedService(null);
                setNewKey('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!newKey || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
