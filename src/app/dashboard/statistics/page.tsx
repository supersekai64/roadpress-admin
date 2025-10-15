"use client";

import dynamic from 'next/dynamic';

// Lazy load la page complète de statistiques avec Recharts (bundle lourd)
const StatisticsClient = dynamic(() => import('./statistics-client'), {
  loading: () => {
    // Importer au runtime pour éviter les erreurs
    const { Skeleton, PageHeaderSkeleton, StatCardSkeleton } = require('@/components/ui/skeleton');
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        
        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        
        {/* Charts skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-80 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  },
  ssr: false,
});

export default function StatisticsPage() {
  return <StatisticsClient />;
}
