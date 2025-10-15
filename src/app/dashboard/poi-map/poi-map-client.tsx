"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Map, { Marker, NavigationControl, FullscreenControl, Popup } from "react-map-gl";
import type { MapRef } from "react-map-gl";
import { MapPin, Users, Eye, Calendar, X, Navigation2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";
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
import "mapbox-gl/dist/mapbox-gl.css";

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
}

interface License {
  readonly id: string;
  readonly licenseKey: string;
  readonly clientName: string;
}

type PointFeature = GeoJSON.Feature<GeoJSON.Point, GeoJsonProperties & { poi: Poi }>;

const MAPBOX_ADMIN_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function PoiMapClient() {
  const [selectedLicense, setSelectedLicense] = useState<string>("all");
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [excludeRoadpress, setExcludeRoadpress] = useState<boolean>(false);
  const [viewState, setViewState] = useState({
    latitude: 46.603354,
    longitude: 1.888334,
    zoom: 5,
  });
  const mapRef = useRef<MapRef>(null);

  const { data: pois = [], isLoading: poisLoading } = useQuery<Poi[]>({
    queryKey: ["pois"],
    queryFn: async () => {
      const response = await fetch("/api/poi");
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
    
    return filtered;
  }, [pois, selectedLicense, excludeRoadpress]);

  const { clusters, supercluster } = useMemo(() => {
    if (!filteredPois.length) return { clusters: [], supercluster: null };

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

    const superclusterInstance = new Supercluster<GeoJsonProperties & { poi: Poi }>({
      radius: 75,
      maxZoom: 16,
    });

    superclusterInstance.load(points);

    const bounds = mapRef.current?.getBounds();
    const zoom = Math.floor(viewState.zoom);

    if (!bounds) return { clusters: [], supercluster: superclusterInstance };

    const bbox: BBox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    return {
      clusters: superclusterInstance.getClusters(bbox, zoom),
      supercluster: superclusterInstance,
    };
  }, [filteredPois, viewState.zoom]);

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
            <p className="text-muted-foreground">
              {filteredPois.length} point{filteredPois.length > 1 ? "s" : ""} d{"'"}intérêt
            </p>
          </div>
          <Button onClick={handleExportToExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter vers Excel
          </Button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="license-filter" className="text-sm font-medium whitespace-nowrap">
              Filtrer par client :
            </Label>
            <Select value={selectedLicense} onValueChange={setSelectedLicense}>
              <SelectTrigger id="license-filter" className="w-[250px]">
                <SelectValue />
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
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              id="exclude-roadpress"
              checked={excludeRoadpress}
              onCheckedChange={(checked) => setExcludeRoadpress(checked === true)}
            />
            <Label 
              htmlFor="exclude-roadpress" 
              className="text-sm font-medium cursor-pointer"
            >
              Exclure le client de démo (Roadpress)
            </Label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POIs</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPois.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total visites</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPois.reduce((acc, poi) => acc + poi.visitCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredPois.map(poi => poi.license.id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={MAPBOX_ADMIN_TOKEN}
            style={{ width: "100%", height: "600px", borderRadius: "0.5rem", overflow: "hidden" }}
            onLoad={() => {
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

            {clusters.map((cluster) => {
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
                let clusterColor = "#3b82f6"; // bleu par défaut (faible)
                if (totalVisits > 100) {
                  clusterColor = "#ef4444"; // rouge (très forte)
                } else if (totalVisits > 50) {
                  clusterColor = "#f97316"; // orange (forte)
                } else if (totalVisits > 20) {
                  clusterColor = "#eab308"; // jaune (moyenne)
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
              let markerColor = "#3b82f6"; // bleu (faible)
              if (poi.visitCount > 100) {
                markerColor = "#ef4444"; // rouge (très forte)
              } else if (poi.visitCount > 50) {
                markerColor = "#f97316"; // orange (forte)
              } else if (poi.visitCount > 20) {
                markerColor = "#eab308"; // jaune (moyenne)
              }

              return (
                <Marker
                  key={poi.id}
                  latitude={latitude}
                  longitude={longitude}
                  onClick={() => setSelectedPoi(poi)}
                >
                  <div className="relative group cursor-pointer">
                    <div className="relative">
                      <MapPin
                        className="h-8 w-8 hover:scale-125 transition-transform drop-shadow-lg"
                        fill={markerColor}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    </div>
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-3 py-2 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-border min-w-max z-10">
                      <div className="font-semibold">{poi.name}</div>
                      <div className="text-muted-foreground">{poi.license.clientName}</div>
                      <div className="text-muted-foreground">{poi.visitCount} visites</div>
                    </div>
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
                      <span>{selectedPoi.visitCount.toLocaleString()} visites</span>
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
