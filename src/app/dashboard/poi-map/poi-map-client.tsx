"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Map, { Marker, NavigationControl, FullscreenControl, Popup, Source, Layer } from "react-map-gl";
import type { MapRef, LayerProps } from "react-map-gl";
import { MapPin, Users, Eye, Calendar, X, Navigation2, Download, Filter, Flame, Search, ChevronsUpDown, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Supercluster from "supercluster";
import type { BBox, GeoJsonProperties } from "geojson";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

interface PoiVisit {
  readonly id: string;
  readonly season: string | null;
  readonly visitorProfile: string | null;
  readonly travelReason: string | null;
  readonly stayDuration: string | null;
  readonly visitDate: string;
}

interface Poi {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly visitCount: number;
  readonly seasonData: Record<string, unknown>;
  readonly createdAt: string;
  readonly license: {
    readonly id: string;
    readonly licenseKey: string;
    readonly clientName: string;
  };
  readonly visits?: readonly PoiVisit[];
}

interface License {
  readonly id: string;
  readonly licenseKey: string;
  readonly clientName: string;
}

type PointFeature = GeoJSON.Feature<GeoJSON.Point, GeoJsonProperties & { poi: Poi }>;

const MAPBOX_ADMIN_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Mappings pour les labels français
const SEASON_LABELS: Record<string, string> = {
  WINTER: 'Hiver',
  SPRING: 'Printemps',
  SUMMER: 'Été',
  FALL: 'Automne',
};

const PROFILE_LABELS: Record<string, string> = {
  SOLO: 'Solo',
  COUPLE: 'Couple',
  FAMILY: 'Famille',
  FRIENDS: "Groupe d'amis",
  ORGANIZED_GROUP: 'Groupe organisé',
};

const TRAVEL_REASON_LABELS: Record<string, string> = {
  LEISURE: 'Loisirs',
  BUSINESS: 'Affaires',
  FAMILY_VISIT: 'Visite familiale',
  EVENT: 'Événement',
  HEALTH: 'Santé',
  EDUCATION: 'Éducation',
  OTHER: 'Autre',
};

const STAY_DURATION_LABELS: Record<string, string> = {
  DAY_TRIP: 'Excursion à la journée',
  ONE_NIGHT: '1 nuit',
  TWO_TO_THREE: '2-3 nuits',
  FOUR_TO_SEVEN: '4-7 nuits',
  MORE_THAN_WEEK: "Plus d'une semaine",
};

export default function PoiMapClient() {
  const [selectedLicense, setSelectedLicense] = useState<string>("all");
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [hoveredPoi, setHoveredPoi] = useState<Poi | null>(null);
  const [excludeRoadpress, setExcludeRoadpress] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true); // Par défaut visible
  const [showMarkers, setShowMarkers] = useState<boolean>(false); // Par défaut caché
  
  // Filtres avec sélection multiple
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedTravelReasons, setSelectedTravelReasons] = useState<string[]>([]);
  const [selectedStayDuration, setSelectedStayDuration] = useState<string>("all");
  
  // États pour les popovers de recherche
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [seasonsSearchOpen, setSeasonsSearchOpen] = useState(false);
  const [seasonsSearchQuery, setSeasonsSearchQuery] = useState('');
  const [profilesSearchOpen, setProfilesSearchOpen] = useState(false);
  const [profilesSearchQuery, setProfilesSearchQuery] = useState('');
  const [reasonsSearchOpen, setReasonsSearchOpen] = useState(false);
  const [reasonsSearchQuery, setReasonsSearchQuery] = useState('');
  
  const [viewState, setViewState] = useState({
    latitude: 46.603354,
    longitude: 1.888334,
    zoom: 5,
    pitch: 45, // Inclinaison pour voir les bâtiments en 3D
    bearing: 0,
  });
  const mapRef = useRef<MapRef>(null);

  const { data: pois = [], isLoading: poisLoading } = useQuery<Poi[]>({
    queryKey: ["pois"],
    queryFn: async () => {
      const response = await fetch("/api/poi?includeVisits=true");
      if (!response.ok) throw new Error("Erreur chargement POIs");
      return response.json();
    },
  });

  const { data: licenses = [] } = useQuery<License[]>({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses");
      if (!response.ok) throw new Error("Erreur chargement licences");
      return response.json();
    },
  });

  const filteredPois = useMemo(() => {
    let filtered = pois;
    
    // Exclure Roadpress si la case est cochée
    if (excludeRoadpress) {
      filtered = filtered.filter(poi => 
        poi.license.clientName.toLowerCase() !== "roadpress"
      );
    }
    
    // Filtrer par licence sélectionnée
    if (selectedLicense !== "all") {
      filtered = filtered.filter(poi => poi.license.id === selectedLicense);
    }
    
    // Filtrer par saisons (sélection multiple)
    if (selectedSeasons.length > 0) {
      filtered = filtered.filter(poi => 
        poi.visits?.some(visit => visit.season && selectedSeasons.includes(visit.season))
      );
    }
    
    // Filtrer par profils visiteur (sélection multiple)
    if (selectedProfiles.length > 0) {
      filtered = filtered.filter(poi => 
        poi.visits?.some(visit => visit.visitorProfile && selectedProfiles.includes(visit.visitorProfile))
      );
    }
    
    // Filtrer par raison du voyage (sélection multiple)
    if (selectedTravelReasons.length > 0) {
      filtered = filtered.filter(poi => 
        poi.visits?.some(visit => visit.travelReason && selectedTravelReasons.includes(visit.travelReason))
      );
    }
    
    // Filtrer par durée du séjour
    if (selectedStayDuration !== "all") {
      filtered = filtered.filter(poi => 
        poi.visits?.some(visit => visit.stayDuration === selectedStayDuration)
      );
    }
    
    return filtered;
  }, [pois, selectedLicense, excludeRoadpress, selectedSeasons, selectedProfiles, selectedTravelReasons, selectedStayDuration]);

  // Générer les données GeoJSON pour la heatmap
  const heatmapData = useMemo(() => {
    if (!filteredPois.length) return null;

    // Créer un point par visite (pour une meilleure densité visuelle)
    const features = filteredPois.flatMap(poi => {
      // Créer plusieurs points autour du POI selon le nombre de visites
      // Pour simuler un radius de 100m et donner plus de poids aux POIs très fréquentés
      const visitCount = poi.visitCount || 0;
      const points = [];
      
      // Point central avec le poids total
      points.push({
        type: "Feature" as const,
        properties: { 
          weight: visitCount,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [poi.longitude, poi.latitude],
        },
      });
      
      // Ajouter des points satellites pour créer un effet de zone (radius ~100m)
      // 0.001 degré ≈ 111m à l'équateur, donc 0.0009 ≈ 100m
      const radiusOffsets = [
        [0.0009, 0], [-0.0009, 0], [0, 0.0009], [0, -0.0009], // 4 points cardinaux
        [0.0006, 0.0006], [-0.0006, 0.0006], [0.0006, -0.0006], [-0.0006, -0.0006], // 4 diagonales
      ];
      
      radiusOffsets.forEach(([lonOffset, latOffset]) => {
        points.push({
          type: "Feature" as const,
          properties: { 
            weight: Math.ceil(visitCount * 0.3), // 30% du poids sur les satellites
          },
          geometry: {
            type: "Point" as const,
            coordinates: [poi.longitude + lonOffset, poi.latitude + latOffset],
          },
        });
      });
      
      return points;
    });

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [filteredPois]);

  // Créer l'instance supercluster séparément pour éviter les re-créations
  const supercluster = useMemo(() => {
    if (!filteredPois.length) return null;

    const points: PointFeature[] = filteredPois.map(poi => ({
      type: "Feature",
      properties: { 
        cluster: false,
        poi,
      },
      geometry: {
        type: "Point",
        coordinates: [poi.longitude, poi.latitude],
      },
    }));

    const instance = new Supercluster<GeoJsonProperties & { poi: Poi }>({
      radius: 75,
      maxZoom: 16,
    });

    instance.load(points);
    return instance;
  }, [filteredPois]);

  // Calculer les clusters basés sur le viewport actuel
  const clusters = useMemo(() => {
    if (!supercluster || !mapRef.current) return [];

    const bounds = mapRef.current.getBounds();
    const zoom = Math.floor(viewState.zoom);

    const bbox: BBox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    return supercluster.getClusters(bbox, zoom);
  }, [supercluster, viewState]);

  // Calculer le nombre de clients actifs
  const activeClientsCount = useMemo(() => {
    return new Set(filteredPois.map(poi => poi.license.id)).size;
  }, [filteredPois]);

  const handleClusterClick = useCallback(
    (clusterId: number, longitude: number, latitude: number) => {
      if (!supercluster || !mapRef.current) return;

      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(clusterId),
        20
      );

      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: expansionZoom,
        duration: 1000,
      });
    },
    [supercluster]
  );

  const handleExportToExcel = useCallback(async () => {
    if (!filteredPois.length) {
      alert("Aucun POI à exporter");
      return;
    }

    try {
      // Récupérer toutes les visites pour les POIs filtrés
      const poiIds = filteredPois.map(poi => poi.id);
      console.log('[Export] Nombre de POIs filtrés:', filteredPois.length);
      console.log('[Export] IDs des POIs:', poiIds);
      
      const response = await fetch(`/api/poi/visits/export?poiIds=${poiIds.join(',')}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des visites');
      }
      
      const visits = await response.json();
      console.log('[Export] Nombre de visites reçues:', visits.length);
      console.log('[Export] Première visite:', visits[0]);

      if (!visits.length) {
        alert("Aucune visite à exporter pour les POIs sélectionnés");
        return;
      }

      // Mapper les enums en français
      const seasonNamesFr: Record<string, string> = {
        WINTER: "Hiver",
        SPRING: "Printemps",
        SUMMER: "Été",
        FALL: "Automne",
      };

      const profileNamesFr: Record<string, string> = {
        SOLO: "Solo",
        COUPLE: "Couple",
        FAMILY: "Famille",
        FRIENDS: "Amis",
        ORGANIZED_GROUP: "Groupe organisé",
      };

      const stayDurationFr: Record<string, string> = {
        DAY_TRIP: "Excursion à la journée",
        ONE_NIGHT: "1 nuit",
        TWO_TO_THREE: "2-3 nuits",
        FOUR_TO_SEVEN: "4-7 nuits",
        MORE_THAN_WEEK: "Plus d{`'`}une semaine",
      };

      const bookingModeFr: Record<string, string> = {
        DIRECT: "Réservation directe",
        ONLINE_PLATFORM: "Plateforme en ligne",
        TRAVEL_AGENCY: "Agence de voyage",
        TOUR_OPERATOR: "Tour opérateur",
        OTHER: "Autre",
      };

      const travelReasonFr: Record<string, string> = {
        LEISURE: "Loisirs",
        BUSINESS: "Affaires",
        FAMILY_VISIT: "Visite familiale",
        EVENT: "Événement",
        HEALTH: "Santé/Cure",
        EDUCATION: "Éducation",
        OTHER: "Autre",
      };

      // Préparer les données pour l{`'`}export - 1 ligne par visite
      const exportData = visits.map((visit: any) => {
        // Parser transportModes et interests si JSON
        let transportModes = "N/A";
        let interests = "N/A";

        if (visit.transportModes) {
          try {
            const parsed = JSON.parse(visit.transportModes);
            transportModes = Array.isArray(parsed) ? parsed.join(", ") : visit.transportModes;
          } catch {
            transportModes = visit.transportModes;
          }
        }

        if (visit.interests) {
          try {
            const parsed = JSON.parse(visit.interests);
            interests = Array.isArray(parsed) ? parsed.join(", ") : visit.interests;
          } catch {
            interests = visit.interests;
          }
        }

        return {
          "ID Visite": visit.id,
          "Nom du POI": visit.poi.name,
          "Adresse": visit.poi.address || "N/A",
          "Latitude": visit.poi.latitude,
          "Longitude": visit.poi.longitude,
          "Client": visit.license.clientName,
          "Clé de licence": visit.license.licenseKey,
          "Date de visite": format(new Date(visit.visitDate), "dd/MM/yyyy HH:mm", { locale: fr }),
          "Saison": visit.season ? seasonNamesFr[visit.season] || visit.season : "N/A",
          "ID Roadpress": visit.roadpressId || "N/A",
          
          // Profil du visiteur
          "Profil visiteur": visit.visitorProfile 
            ? profileNamesFr[visit.visitorProfile] || visit.visitorProfile 
            : "N/A",
          "Durée du séjour": visit.stayDuration 
            ? stayDurationFr[visit.stayDuration] || visit.stayDuration 
            : "N/A",
          "Pays d{`'`}origine": visit.countryOfOrigin || "N/A",
          
          // Informations de réservation
          "Mode de réservation": visit.bookingMode 
            ? bookingModeFr[visit.bookingMode] || visit.bookingMode 
            : "N/A",
          "Raison du voyage": visit.travelReason 
            ? travelReasonFr[visit.travelReason] || visit.travelReason 
            : "N/A",
          
          // Transport et intérêts
          "Modes de transport": transportModes,
          "Centres d{`'`}intérêt": interests,
        };
      });

      // Créer un nouveau workbook
      const wb = XLSX.utils.book_new();
      
      // Créer la feuille de calcul
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Ajuster la largeur des colonnes
      const columnWidths = [
        { wch: 30 },  // ID Visite
        { wch: 40 },  // Nom du POI
        { wch: 50 },  // Adresse
        { wch: 12 },  // Latitude
        { wch: 12 },  // Longitude
        { wch: 25 },  // Client
        { wch: 35 },  // Clé de licence
        { wch: 20 },  // Date de visite
        { wch: 15 },  // Saison
        { wch: 35 },  // ID Roadpress
        { wch: 20 },  // Profil visiteur
        { wch: 25 },  // Durée du séjour
        { wch: 20 },  // Pays d'origine
        { wch: 25 },  // Mode de réservation
        { wch: 20 },  // Raison du voyage
        { wch: 30 },  // Modes de transport
        { wch: 30 },  // Centres d'intérêt
      ];
      ws['!cols'] = columnWidths;
      
      // Ajouter la feuille au workbook
      XLSX.utils.book_append_sheet(wb, ws, "Visites POI");
      
      // Générer le nom de fichier avec la date
      const clientName = selectedLicense === "all" 
        ? "Tous_les_clients" 
        : licenses.find(l => l.id === selectedLicense)?.clientName.replace(/\s+/g, "_") || "Client";
      
      const excludeText = excludeRoadpress ? "_sans_Roadpress" : "";
      const fileName = `Visites_POI_${clientName}${excludeText}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
      
      // Télécharger le fichier
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Erreur export:', error);
      alert("Erreur lors de l{`'`}export des données");
    }
  }, [filteredPois, selectedLicense, licenses, excludeRoadpress]);

  useEffect(() => {
    if (filteredPois.length > 0 && mapRef.current) {
      const bounds = filteredPois.reduce(
        (acc, poi) => {
          return {
            minLng: Math.min(acc.minLng, poi.longitude),
            maxLng: Math.max(acc.maxLng, poi.longitude),
            minLat: Math.min(acc.minLat, poi.latitude),
            maxLat: Math.max(acc.maxLat, poi.latitude),
          };
        },
        {
          minLng: Infinity,
          maxLng: -Infinity,
          minLat: Infinity,
          maxLat: -Infinity,
        }
      );

      if (bounds.minLng !== Infinity) {
        mapRef.current.fitBounds(
          [
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat],
          ],
          { padding: 100, duration: 1000, maxZoom: 12 }
        );
      }
    }
  }, [filteredPois]);

  if (poisLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        
        {/* Filters skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* Map skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Carte des POI</h1>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="exclude-roadpress-header"
                checked={excludeRoadpress}
                onCheckedChange={(checked) => setExcludeRoadpress(checked === true)}
              />
              <Label 
                htmlFor="exclude-roadpress-header" 
                className="text-sm cursor-pointer whitespace-nowrap"
              >
                Exclure Roadpress (démo)
              </Label>
            </div>
            <Button 
              variant={showHeatmap ? "default" : "outline"} 
              onClick={() => setShowHeatmap(!showHeatmap)} 
              className="gap-2"
            >
              <Flame className="h-4 w-4" />
              {showHeatmap ? "Masquer" : "Afficher"} la heatmap
            </Button>
            <Button 
              variant={showMarkers ? "default" : "outline"} 
              onClick={() => setShowMarkers(!showMarkers)} 
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              {showMarkers ? "Masquer" : "Afficher"} les markers
            </Button>
            <Button onClick={handleExportToExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Exporter vers Excel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {/* Client avec recherche */}
              <div className="space-y-2">
                <Label htmlFor="license-filter">
                  Client {selectedLicense !== 'all' && '(1)'}
                </Label>
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {selectedLicense === 'all'
                          ? 'Tous les clients'
                          : licenses.find(l => l.id === selectedLicense)?.clientName || 'Tous les clients'}
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
                      <div
                        className={cn(
                          'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                          selectedLicense === 'all' && 'bg-accent'
                        )}
                        onClick={() => {
                          setSelectedLicense('all');
                          setClientSearchOpen(false);
                          setClientSearchQuery('');
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedLicense === 'all' ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        Tous les clients
                      </div>
                      {licenses
                        .filter((license) =>
                          license.clientName.toLowerCase().includes(clientSearchQuery.toLowerCase())
                        )
                        .map((license) => {
                          const isSelected = selectedLicense === license.id;
                          return (
                            <div
                              key={license.id}
                              className={cn(
                                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                isSelected && 'bg-accent'
                              )}
                              onClick={() => {
                                // Toggle selection: déselectionner si déjà sélectionné
                                if (isSelected) {
                                  setSelectedLicense('all');
                                } else {
                                  setSelectedLicense(license.id);
                                }
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
                              {license.clientName}
                            </div>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Saison (sélection multiple) */}
              <div className="space-y-2">
                <Label>
                  Saison {selectedSeasons.length > 0 && `(${selectedSeasons.length})`}
                </Label>
                <Popover open={seasonsSearchOpen} onOpenChange={setSeasonsSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={seasonsSearchOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {selectedSeasons.length === 0
                          ? 'Toutes les saisons'
                          : selectedSeasons.length === 1
                          ? SEASON_LABELS[selectedSeasons[0]]
                          : `${selectedSeasons.length} sélectionnées`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <div className="flex items-center border-b px-3 bg-card">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Rechercher une saison..."
                        value={seasonsSearchQuery}
                        onChange={(e) => setSeasonsSearchQuery(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-card"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {Object.entries(SEASON_LABELS)
                        .filter(([_, label]) =>
                          label.toLowerCase().includes(seasonsSearchQuery.toLowerCase())
                        )
                        .map(([value, label]) => {
                          const isSelected = selectedSeasons.includes(value);
                          return (
                            <div
                              key={value}
                              className={cn(
                                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                isSelected && 'bg-accent'
                              )}
                              onClick={() => {
                                const newSeasons = isSelected
                                  ? selectedSeasons.filter(s => s !== value)
                                  : [...selectedSeasons, value];
                                setSelectedSeasons(newSeasons);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {label}
                            </div>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Profil visiteur (sélection multiple) */}
              <div className="space-y-2">
                <Label>
                  Profil visiteur {selectedProfiles.length > 0 && `(${selectedProfiles.length})`}
                </Label>
                <Popover open={profilesSearchOpen} onOpenChange={setProfilesSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={profilesSearchOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {selectedProfiles.length === 0
                          ? 'Tous les profils'
                          : selectedProfiles.length === 1
                          ? PROFILE_LABELS[selectedProfiles[0]]
                          : `${selectedProfiles.length} sélectionnés`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <div className="flex items-center border-b px-3 bg-card">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Rechercher un profil..."
                        value={profilesSearchQuery}
                        onChange={(e) => setProfilesSearchQuery(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-card"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {Object.entries(PROFILE_LABELS)
                        .filter(([_, label]) =>
                          label.toLowerCase().includes(profilesSearchQuery.toLowerCase())
                        )
                        .map(([value, label]) => {
                          const isSelected = selectedProfiles.includes(value);
                          return (
                            <div
                              key={value}
                              className={cn(
                                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                isSelected && 'bg-accent'
                              )}
                              onClick={() => {
                                const newProfiles = isSelected
                                  ? selectedProfiles.filter(p => p !== value)
                                  : [...selectedProfiles, value];
                                setSelectedProfiles(newProfiles);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {label}
                            </div>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Raison du voyage (sélection multiple) */}
              <div className="space-y-2">
                <Label>
                  Raison du voyage {selectedTravelReasons.length > 0 && `(${selectedTravelReasons.length})`}
                </Label>
                <Popover open={reasonsSearchOpen} onOpenChange={setReasonsSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={reasonsSearchOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {selectedTravelReasons.length === 0
                          ? 'Toutes les raisons'
                          : selectedTravelReasons.length === 1
                          ? TRAVEL_REASON_LABELS[selectedTravelReasons[0]]
                          : `${selectedTravelReasons.length} sélectionnées`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <div className="flex items-center border-b px-3 bg-card">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Rechercher une raison..."
                        value={reasonsSearchQuery}
                        onChange={(e) => setReasonsSearchQuery(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-card"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {Object.entries(TRAVEL_REASON_LABELS)
                        .filter(([_, label]) =>
                          label.toLowerCase().includes(reasonsSearchQuery.toLowerCase())
                        )
                        .map(([value, label]) => {
                          const isSelected = selectedTravelReasons.includes(value);
                          return (
                            <div
                              key={value}
                              className={cn(
                                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                                isSelected && 'bg-accent'
                              )}
                              onClick={() => {
                                const newReasons = isSelected
                                  ? selectedTravelReasons.filter(r => r !== value)
                                  : [...selectedTravelReasons, value];
                                setSelectedTravelReasons(newReasons);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {label}
                            </div>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Durée du séjour */}
              <div className="space-y-2">
                <Label htmlFor="duration-filter">Durée du séjour</Label>
                <Select value={selectedStayDuration} onValueChange={setSelectedStayDuration}>
                  <SelectTrigger id="duration-filter">
                    <SelectValue placeholder="Toutes les durées" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="DAY_TRIP">Excursion à la journée</SelectItem>
                    <SelectItem value="ONE_NIGHT">1 nuit</SelectItem>
                    <SelectItem value="TWO_TO_THREE">2-3 nuits</SelectItem>
                    <SelectItem value="FOUR_TO_SEVEN">4-7 nuits</SelectItem>
                    <SelectItem value="MORE_THAN_WEEK">Plus d&apos;une semaine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bouton Effacer les filtres */}
              <div className="space-y-2">
                <Label className="opacity-0">Action</Label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedLicense("all");
                    setSelectedSeasons([]);
                    setSelectedProfiles([]);
                    setSelectedTravelReasons([]);
                    setSelectedStayDuration("all");
                    setExcludeRoadpress(false);
                  }}
                >
                  Effacer les filtres
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 relative">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_ADMIN_TOKEN}
            style={{ width: "100%", height: "600px", borderRadius: "0.5rem", overflow: "hidden" }}
            onLoad={(e) => {
              const map = e.target;
              
              // Fonction pour ajouter les bâtiments 3D
              const add3DBuildings = () => {
                // Vérifier si le style est chargé
                if (!map.isStyleLoaded()) {
                  setTimeout(add3DBuildings, 100);
                  return;
                }

                // Ajouter la couche de bâtiments 3D si elle n'existe pas déjà
                if (!map.getLayer('3d-buildings')) {
                  const layers = map.getStyle().layers;
                  const labelLayerId = layers?.find(
                    (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
                  )?.id;

                  try {
                    map.addLayer(
                      {
                        id: '3d-buildings',
                        source: 'composite',
                        'source-layer': 'building',
                        filter: ['==', 'extrude', 'true'],
                        type: 'fill-extrusion',
                        minzoom: 14,
                        paint: {
                          'fill-extrusion-color': '#aaa',
                          'fill-extrusion-height': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            14,
                            0,
                            14.5,
                            ['get', 'height']
                          ],
                          'fill-extrusion-base': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            14,
                            0,
                            14.5,
                            ['get', 'min_height']
                          ],
                          'fill-extrusion-opacity': 0.6
                        }
                      },
                      labelLayerId
                    );
                  } catch (error) {
                    console.error('Erreur lors de l\'ajout de la couche 3D:', error);
                  }
                }
              };

              // Lancer l'ajout des bâtiments 3D
              add3DBuildings();
              
              // Re-centrer la carte une fois qu'elle est chargée
              if (filteredPois.length > 0 && mapRef.current) {
                const bounds = filteredPois.reduce(
                  (acc, poi) => {
                    return {
                      minLng: Math.min(acc.minLng, poi.longitude),
                      maxLng: Math.max(acc.maxLng, poi.longitude),
                      minLat: Math.min(acc.minLat, poi.latitude),
                      maxLat: Math.max(acc.maxLat, poi.latitude),
                    };
                  },
                  {
                    minLng: Infinity,
                    maxLng: -Infinity,
                    minLat: Infinity,
                    maxLat: -Infinity,
                  }
                );

                if (bounds.minLng !== Infinity) {
                  mapRef.current.fitBounds(
                    [
                      [bounds.minLng, bounds.minLat],
                      [bounds.maxLng, bounds.maxLat],
                    ],
                    { padding: 100, duration: 1000, maxZoom: 12 }
                  );
                }
              }
            }}
          >
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />

            {/* Tooltip flottant pour le POI survolé */}
            {hoveredPoi && mapRef.current && (() => {
              const map = mapRef.current.getMap();
              const point = map.project([hoveredPoi.longitude, hoveredPoi.latitude]);
              
              return (
                <div 
                  className="absolute pointer-events-none z-[1000]"
                  style={{ 
                    left: `${point.x}px`,
                    top: `${point.y}px`,
                    transform: 'translate(-50%, calc(-100% - 16px))',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  <div className="relative bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-xl border border-border min-w-max">
                    <div className="font-semibold text-sm">{hoveredPoi.name}</div>
                    <div className="text-muted-foreground text-sm">{hoveredPoi.license.clientName}</div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{hoveredPoi.visitCount}</span> {hoveredPoi.visitCount > 1 ? 'visites' : 'visite'}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 'calc(100% - 1px)' }}>
                      <div 
                        className="absolute left-1/2 -translate-x-1/2 w-0 h-0" 
                        style={{
                          top: '0px',
                          borderLeft: '9px solid transparent',
                          borderRight: '9px solid transparent',
                          borderTop: '9px solid hsl(var(--border))'
                        }}
                      ></div>
                      <div 
                        className="relative w-0 h-0"
                        style={{
                          top: '-1px',
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderTop: '8px solid hsl(var(--popover))'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stats Overlay */}
            <div 
              className="absolute top-4 left-4 z-10 bg-card/95 backdrop-blur-sm border rounded-md shadow-lg px-3 py-2 space-y-2"
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="text-sm text-muted-foreground">
                    Total {filteredPois.length > 1 ? 'POIs' : 'POI'} : <span className="font-bold">{filteredPois.length}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total {filteredPois.reduce((acc, poi) => acc + poi.visitCount, 0) > 1 ? 'visites' : 'visite'} : <span className="font-bold">{filteredPois.reduce((acc, poi) => acc + poi.visitCount, 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap Layer */}
            {showHeatmap && heatmapData && (
              <Source
                id="poi-heatmap"
                type="geojson"
                data={heatmapData}
              >
                <Layer
                  id="poi-heatmap-layer"
                  type="heatmap"
                  paint={{
                    // Poids basé sur la propriété 'weight' (nombre de visites)
                    'heatmap-weight': [
                      'interpolate',
                      ['linear'],
                      ['get', 'weight'],
                      0, 0,
                      100, 1
                    ],
                    // Intensité selon le zoom
                    'heatmap-intensity': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      0, 1,
                      10, 2,
                      15, 4,
                      20, 6
                    ],
                    // Gradient de couleur
                    'heatmap-color': [
                      'interpolate',
                      ['linear'],
                      ['heatmap-density'],
                      0, 'rgba(33, 102, 172, 0)',
                      0.2, 'rgb(103, 169, 207)',
                      0.4, 'rgb(209, 229, 240)',
                      0.6, 'rgb(253, 219, 199)',
                      0.8, 'rgb(239, 138, 98)',
                      1, 'rgb(178, 24, 43)'
                    ],
                    // Rayon des points de la heatmap
                    'heatmap-radius': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      0, 2,
                      9, 20,
                      15, 60,
                      18, 100,
                      20, 150
                    ],
                    // Opacité
                    'heatmap-opacity': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      7, 0.8,
                      15, 0.75,
                      18, 0.7,
                      20, 0.65
                    ]
                  }}
                />
              </Source>
            )}

            {/* Markers et Clusters */}
            {showMarkers && clusters.map((cluster) => {
              const [longitude, latitude] = cluster.geometry.coordinates;
              const { cluster: isCluster, point_count: pointCount } = cluster.properties;

              if (isCluster) {
                // Calculer la fréquentation totale du cluster
                const leaves = supercluster?.getLeaves(cluster.id as number, Infinity) || [];
                const totalVisits = leaves.reduce((sum, leaf) => {
                  const poi = leaf.properties.poi as Poi;
                  return sum + poi.visitCount;
                }, 0);
                
                // Colorisation par fréquentation
                let clusterColor = "#51a2ff "; // bleu par défaut (faible)
                if (totalVisits > 100) {
                  clusterColor = "#ef4444"; // rouge (très forte)
                } else if (totalVisits > 50) {
                  clusterColor = "#ff8904"; // orange (forte)
                } else if (totalVisits > 20) {
                  clusterColor = "#ffd6a7"; // jaune (moyenne)
                }

                return (
                  <Marker
                    key={`cluster-${cluster.id}`}
                    latitude={latitude}
                    longitude={longitude}
                    onClick={() => handleClusterClick(cluster.id as number, longitude, latitude)}
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-white font-bold cursor-pointer hover:scale-110 transition-transform shadow-lg"
                      style={{
                        width: `${30 + (pointCount! / filteredPois.length) * 30}px`,
                        height: `${30 + (pointCount! / filteredPois.length) * 30}px`,
                        backgroundColor: clusterColor,
                      }}
                    >
                      {pointCount}
                    </div>
                  </Marker>
                );
              }

              const poi = cluster.properties.poi as Poi;

              // Colorisation par fréquentation
              let markerColor = "#51a2ff"; // bleu (faible)
              if (poi.visitCount > 100) {
                markerColor = "#ef4444"; // rouge (très forte)
              } else if (poi.visitCount > 50) {
                markerColor = "#ff8904"; // orange (forte)
              } else if (poi.visitCount > 20) {
                markerColor = "#ffd6a7"; // jaune (moyenne)
              }

              return (
                <Marker
                  key={poi.id}
                  latitude={latitude}
                  longitude={longitude}
                  onClick={() => setSelectedPoi(poi)}
                >
                  <div 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoi(poi)}
                    onMouseLeave={() => setHoveredPoi(null)}
                  >
                    <MapPin
                      className="h-8 w-8 hover:scale-125 transition-transform drop-shadow-lg"
                      fill={markerColor}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  </div>
                </Marker>
              );
            })}

            {selectedPoi && (
              <Popup
                latitude={selectedPoi.latitude}
                longitude={selectedPoi.longitude}
                onClose={() => setSelectedPoi(null)}
                closeButton={false}
                className="max-w-sm"
              >
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-lg">{selectedPoi.name}</h3>
                      {selectedPoi.address && (
                        <p className="text-sm text-muted-foreground">{selectedPoi.address}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPoi(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {selectedPoi.license.clientName}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {selectedPoi.visitCount.toLocaleString()} {selectedPoi.visitCount > 1 ? 'visites' : 'visite'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(selectedPoi.createdAt), "dd/MM/yyyy", { locale: fr })}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoi.latitude},${selectedPoi.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Navigation2 className="h-4 w-4" />
                      Itinéraire Google Maps
                    </a>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </CardContent>
      </Card>
    </div>
  );
}
