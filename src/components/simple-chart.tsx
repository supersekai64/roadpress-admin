"use client";

/**
 * Helper pour convertir les données et afficher des graphiques Chart.js
 * Compatible avec l'ancien format de données Recharts
 */

import { LineChart, BarChart, getDefaultChartOptions, getChartColors, getBarChartDatasetDefaults } from '@/components/charts';
import { useTheme } from 'next-themes';

interface SimpleChartProps {
  readonly data: readonly any[];
  readonly dataKeys: readonly string[];
  readonly type?: 'line' | 'bar';
  readonly height?: number;
}

interface MixedChartProps {
  readonly data: readonly any[];
  readonly barKeys: readonly string[];
  readonly lineKeys: readonly string[];
  readonly height?: number;
}

export function SimpleChart({ data, dataKeys, type = 'bar', height = 300 }: SimpleChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = getChartColors(isDark ? 'dark' : 'light');

  // Convertir les données au format Chart.js
  const labels = data.map((item) => item.date || item.name || '');
  
  const datasets = dataKeys.map((key, index) => {
    const colorKeys = Object.values(colors);
    const color = colorKeys[index % colorKeys.length];
    
    return {
      label: key,
      data: data.map((item) => item[key] || 0),
      backgroundColor: type === 'bar' ? color : `${color}33`,
      borderColor: color,
      borderWidth: type === 'bar' ? 0 : 2,
      fill: type === 'line',
      tension: 0, // Lignes droites (0 = droit, 0.4 = courbé)
      ...(type === 'bar' ? getBarChartDatasetDefaults() : {}),
    };
  });

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    ...getDefaultChartOptions(isDark ? 'dark' : 'light'),
    maintainAspectRatio: false,
  };

  return (
    <div style={{ height: `${height}px` }}>
      {type === 'line' ? (
        <LineChart data={chartData} options={options} />
      ) : (
        <BarChart data={chartData} options={options} />
      )}
    </div>
  );
}

// Chart mixte : Barres + Ligne
export function MixedChart({ data, barKeys, lineKeys, height = 300 }: MixedChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = getChartColors(isDark ? 'dark' : 'light');
  const colorValues = Object.values(colors);

  // Convertir les données au format Chart.js
  const labels = data.map((item) => item.date || item.name || '');
  
  const datasets = [
    // Barres en premier
    ...barKeys.map((key, index) => ({
      type: 'bar' as const,
      label: key,
      data: data.map((item) => item[key] || 0),
      backgroundColor: colorValues[index % colorValues.length],
      yAxisID: 'y',
      order: 2, // Barres en arrière-plan
      ...getBarChartDatasetDefaults(), // Pas de bordure + coins arrondis
    })),
    // Lignes ensuite (au-dessus des barres)
    ...lineKeys.map((key, index) => ({
      type: 'line' as const,
      label: key,
      data: data.map((item) => item[key] || 0),
      backgroundColor: `${colorValues[(barKeys.length + index) % colorValues.length]}33`,
      borderColor: colorValues[(barKeys.length + index) % colorValues.length],
      borderWidth: 3, // Ligne plus épaisse pour meilleure visibilité
      fill: false,
      tension: 0, // Lignes droites (0 = droit, 0.4 = courbé)
      yAxisID: 'y1',
      order: 1, // Lignes au premier plan
      pointRadius: 4, // Points visibles
      pointHoverRadius: 6, // Points plus gros au hover
    })),
  ];

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    ...getDefaultChartOptions(isDark ? 'dark' : 'light'),
    maintainAspectRatio: false,
    scales: {
      ...getDefaultChartOptions(isDark ? 'dark' : 'light').scales,
      y: {
        ...getDefaultChartOptions(isDark ? 'dark' : 'light').scales?.y,
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: barKeys.join(', '),
          color: isDark ? '#9ca3af' : '#6b7280',
        },
      },
      y1: {
        ...getDefaultChartOptions(isDark ? 'dark' : 'light').scales?.y,
        type: 'linear' as const,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: lineKeys.join(', '),
          color: isDark ? '#9ca3af' : '#6b7280',
        },
      },
    },
  };

  return (
    <div style={{ height: `${height}px` }}>
      <BarChart data={chartData} options={options} />
    </div>
  );
}
