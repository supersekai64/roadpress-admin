"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileKey,
  BarChart3,
  Settings,
  MapPin,
  FileText,
} from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/licenses',
    label: 'Licences',
    icon: FileKey,
  },
  {
    href: '/dashboard/statistics',
    label: 'Statistiques',
    icon: BarChart3,
  },
  {
    href: '/dashboard/reports',
    label: 'Rapports SMS',
    icon: FileText,
  },
  {
    href: '/dashboard/api-keys',
    label: 'Clés API',
    icon: Settings,
  },
  {
    href: '/dashboard/poi-map',
    label: 'Carte POI',
    icon: MapPin,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Attendre que le composant soit monté côté client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pendant l'hydratation, utiliser le logo blanc (correspond au dark par défaut)
  // Une fois monté, utiliser le thème résolu
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const logoSrc = isDark ? '/images/roadpress-w.svg' : '/images/roadpress-b.svg';

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src={logoSrc}
            alt="Roadpress"
            width={140}
            height={36}
            className="shrink-0"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
