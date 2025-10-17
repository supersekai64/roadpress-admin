"use client";

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  clientName: z.string().min(1, 'Le nom du client est requis'),
  startDate: z.date({ message: 'La date de début est requise' }),
  endDate: z.date({ message: 'La date de fin est requise' }),
  siteUrl: z.string().url('URL invalide').optional().or(z.literal('')),
}).refine((data) => data.endDate > data.startDate, {
  message: 'La date de fin doit être après la date de début',
  path: ['endDate'],
});

type FormValues = z.infer<typeof formSchema>;

interface License {
  readonly id: string;
  readonly licenseKey: string;
  readonly clientName: string;
  readonly status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  readonly startDate: string;
  readonly endDate: string;
  readonly siteUrl: string | null;
  readonly isAssociated: boolean;
}

interface EditLicenseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly license: License;
}

export function EditLicenseDialog({ open, onOpenChange, license }: EditLicenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: license.clientName,
      startDate: new Date(license.startDate),
      endDate: new Date(license.endDate),
      siteUrl: license.siteUrl || '',
    },
  });

  // Réinitialiser le formulaire quand la licence change
  useEffect(() => {
    form.reset({
      clientName: license.clientName,
      startDate: new Date(license.startDate),
      endDate: new Date(license.endDate),
      siteUrl: license.siteUrl || '',
    });
  }, [license, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await fetch(`/api/licenses/${license.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: values.clientName,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate.toISOString(),
          siteUrl: values.siteUrl || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la modification');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      toast({
        title: 'Licence modifiée',
        description: 'La licence a été modifiée avec succès.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit = (values: FormValues) => {
    setIsLoading(true);
    updateMutation.mutate(values);
  };

  const copyLicenseKey = async () => {
    try {
      await navigator.clipboard.writeText(license.licenseKey);
      setCopied(true);
      toast({
        title: 'Copié !',
        description: 'La clé de licence a été copiée dans le presse-papier.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier la clé de licence.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier la licence</DialogTitle>
          <DialogDescription>
            Modifiez les informations de la licence. La clé et l{`'`}URL du site
            ne peuvent pas être modifiées (l{`'`}URL est enregistrée automatiquement
            lors de l{`'`}activation).
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground">
            <strong>Clé de licence :</strong>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
              {license.licenseKey}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyLicenseKey}
              title="Copier la clé de licence"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du client</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nom de l'entreprise ou du client"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => {
                  const [isOpen, setIsOpen] = useState(false);
                  
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de début</FormLabel>
                      <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd MMM yyyy', { locale: fr })
                              ) : (
                                <span>Sélectionner</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => {
                  const [isOpen, setIsOpen] = useState(false);
                  
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de fin</FormLabel>
                      <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd MMM yyyy', { locale: fr })
                              ) : (
                                <span>Sélectionner</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Affichage en lecture seule de l'URL du site */}
            <div className="space-y-2">
              <FormLabel>Site web</FormLabel>
              <div className="p-3 bg-muted rounded-md">
                {license.siteUrl ? (
                  <a
                    href={license.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {license.siteUrl}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Non activée - L{`'`}URL sera enregistrée automatiquement lors de
                    l{`'`}activation par le client
                  </p>
                )}
              </div>
              {license.isAssociated && (
                <p className="text-xs text-muted-foreground">
                  ✓ Licence activée et associée à ce site
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Modification...' : 'Modifier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
