"use client";

import dynamic from 'next/dynamic';
import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton';

const PoiMapClient = dynamic(() => import('./poi-map-client'), {
  ssr: false,
  loading: () => (
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
  ),
});

export default function PoiMapPage() {
  return <PoiMapClient />;
}
