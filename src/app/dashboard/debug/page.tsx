"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const DebugClient = dynamic(() => import('./debug-client'), {
  loading: () => <DebugPageSkeleton />,
});

function DebugPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-28 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-0">
          <div className="h-12 border-b bg-muted/20" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 border-b" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DebugPage() {
  return (
    <Suspense fallback={<DebugPageSkeleton />}>
      <DebugClient />
    </Suspense>
  );
}