"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const LicensesClient = dynamic(() => import('./licenses-client'), {
  loading: () => <LicensesPageSkeleton />,
});

function LicensesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="h-12 border-b bg-muted/50" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b" />
        ))}
      </div>
    </div>
  );
}

export default function LicensesPage() {
  return (
    <Suspense fallback={<LicensesPageSkeleton />}>
      <LicensesClient />
    </Suspense>
  );
}
