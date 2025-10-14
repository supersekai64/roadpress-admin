"use client";

import { Suspense, lazy } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const LazyLine = lazy(() => import('react-chartjs-2').then((mod) => ({ default: mod.Line })));
const LazyBar = lazy(() => import('react-chartjs-2').then((mod) => ({ default: mod.Bar })));
const LazyDoughnut = lazy(() => import('react-chartjs-2').then((mod) => ({ default: mod.Doughnut })));

function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full animate-pulse bg-muted rounded-md flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Chargement du graphique...</div>
    </div>
  );
}

export function LineChart({ data, options }: { readonly data: any; readonly options?: any }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyLine data={data} options={options} />
    </Suspense>
  );
}

export function BarChart({ data, options }: { readonly data: any; readonly options?: any }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyBar data={data} options={options} />
    </Suspense>
  );
}

export function DoughnutChart({ data, options }: { readonly data: any; readonly options?: any }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyDoughnut data={data} options={options} />
    </Suspense>
  );
}

export function getDefaultChartOptions(theme: 'light' | 'dark' = 'light') {
  const isDark = theme === 'dark';
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDark ? '#9ca3af' : '#6b7280',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#f9fafb' : '#111827',
        bodyColor: isDark ? '#e5e7eb' : '#374151',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          color: isDark ? '#374151' : '#e5e7eb',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
      },
      y: {
        grid: {
          color: isDark ? '#374151' : '#e5e7eb',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
        beginAtZero: true,
      },
    },
  };
}

export function getChartColors(theme: 'light' | 'dark' = 'light') {
  const isDark = theme === 'dark';
  
  return {
    primary: isDark ? '#4ade80' : '#4ade80',
    secondary: isDark ? '#8b5cf6' : '#8b5cf6',
    success: isDark ? '#4ade80' : '#22c55e',
    warning: isDark ? '#fbbf24' : '#f59e0b',
    danger: isDark ? '#f87171' : '#ef4444',
    info: isDark ? '#38bdf8' : '#0ea5e9',
  };

}

export function getBarChartDatasetDefaults() {
  return {
    borderWidth: 0,
    borderRadius: 3,
    borderSkipped: 'bottom',
  };
}
