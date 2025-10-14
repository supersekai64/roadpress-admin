"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Lazy load avec Suspense pour améliorer le First Paint
const ReportsClient = dynamic(() => import('./reports-client'), {
  loading: () => <ReportsPageSkeleton />,
});

function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Filters skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 space-y-4">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-4">
          <div className="h-6 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsClient />
    </Suspense>
  );
}
