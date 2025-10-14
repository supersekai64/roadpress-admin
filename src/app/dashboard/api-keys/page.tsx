"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Lazy load avec Suspense pour améliorer le First Paint
const ApiKeysClient = dynamic(() => import('./api-keys-client'), {
  loading: () => <ApiKeysPageSkeleton />,
});

function ApiKeysPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted animate-pulse rounded-lg" />
                <div>
                  <div className="h-5 w-24 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex gap-2 mt-4">
              <div className="h-9 w-24 bg-muted animate-pulse rounded" />
              <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  return (
    <Suspense fallback={<ApiKeysPageSkeleton />}>
      <ApiKeysClient />
    </Suspense>
  );
}
