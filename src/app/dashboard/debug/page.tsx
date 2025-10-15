"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeleton';

const DebugClient = dynamic(() => import('./debug-client'), {
  loading: () => <DebugPageSkeleton />,
});

function DebugPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      
      {/* Filters skeleton */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Actions skeleton */}
      <div className="flex gap-2 justify-end">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6">
          <TableSkeleton rows={8} />
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