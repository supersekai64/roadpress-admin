"use client";

import { MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';

const PoiMapClient = dynamic(() => import('./poi-map-client'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="text-center">
        <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

export default function PoiMapPage() {
  return <PoiMapClient />;
}
