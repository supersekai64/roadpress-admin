"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton, PageHeaderSkeleton, CardSkeleton } from '@/components/ui/skeleton';

// Lazy load avec Suspense pour améliorer le First Paint
const ApiKeysClient = dynamic(() => import('./api-keys-client'), {
  loading: () => <ApiKeysPageSkeleton />,
});

function ApiKeysPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      
      {/* Action button skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
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
