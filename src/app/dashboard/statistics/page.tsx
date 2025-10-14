"use client";

import dynamic from 'next/dynamic';

// Lazy load la page complète de statistiques avec Recharts (bundle lourd)
const StatisticsClient = dynamic(() => import('./statistics-client'), {
  loading: () => (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse bg-muted rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-96 animate-pulse bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  ),
  ssr: false,
});

export default function StatisticsPage() {
  return <StatisticsClient />;
}
