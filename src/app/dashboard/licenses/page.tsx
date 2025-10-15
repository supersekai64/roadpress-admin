"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton, PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeleton';

const LicensesClient = dynamic(() => import('./licenses-client'), {
  loading: () => <LicensesPageSkeleton />,
});

function LicensesPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Filters card skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[200px]" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <TableSkeleton rows={10} />
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
