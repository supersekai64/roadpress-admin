"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton, PageHeaderSkeleton, StatCardSkeleton, TableSkeleton } from '@/components/ui/skeleton';

// Lazy load avec Suspense pour améliorer le First Paint
const ReportsClient = dynamic(() => import('./reports-client'), {
  loading: () => <ReportsPageSkeleton />,
});

function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Filters card skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <TableSkeleton rows={8} />
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
