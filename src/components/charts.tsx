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

// Configuration globale de la police Inter pour Chart.js
ChartJS.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

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

// Fonction helper pour gérer le singulier/pluriel
function pluralize(label: string, count: number): string {
  const value = Math.abs(count);
  
  // Extraire le suffixe si présent (ex: "Token (x1000)" -> "Token" + " (x1000)")
  const suffixMatch = label.match(/^(.+?)(\s*\([^)]+\))$/);
  const baseLabel = suffixMatch ? suffixMatch[1] : label;
  const suffix = suffixMatch ? suffixMatch[2] : '';
  
  // Règles de pluralisation en français
  const rules: Record<string, string> = {
    'Envoyé': 'Envoyés',
    'envoyé': 'envoyés',
    'Traduction': 'Traductions',
    'traduction': 'traductions',
    'Caractère traduit': 'Caractères traduits',
    'caractère traduit': 'caractères traduits',
    'Requête': 'Requêtes',
    'requête': 'requêtes',
    'Token': 'Tokens',
    'token': 'tokens',
  };
  
  // Si la valeur est > 1, utiliser le pluriel
  // Note: en français, 0 et 1 prennent le singulier dans ce contexte
  if (value > 1) {
    const pluralForm = rules[baseLabel] || baseLabel;
    return pluralForm + suffix;
  }
  
  // Sinon (valeur = 0 ou 1), retourner le singulier tel quel avec le suffixe
  return baseLabel + suffix;
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
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#222222' : '#ffffff',
        titleColor: isDark ? '#fafafa' : '#111827',
        bodyColor: isDark ? '#fafafa' : '#374151',
        borderColor: isDark ? '#222222' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 13,
        },
        footerFont: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 12,
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label && value !== null) {
              // Pluraliser le label en fonction de la valeur
              const pluralizedLabel = pluralize(label, value);
              return `${pluralizedLabel} : ${value.toLocaleString('fr-FR')}`;
            }
            
            if (value !== null) {
              return value.toLocaleString('fr-FR');
            }
            
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: isDark ? '#222222' : '#e5e7eb',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#fafafa' : '#6b7280',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: isDark ? '#222222' : '#e5e7eb',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#fafafa' : '#6b7280',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 12,
          },
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
