"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import {
  LayoutDashboard,
  FileKey,
  BarChart3,
  Settings,
  MapPin,
  FileText,
  Bug,
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
  {
    href: '/dashboard/debug',
    label: 'Debug',
    icon: Bug,
  },
];

interface SidebarProps {
  readonly user: {
    readonly name?: string | null;
    readonly email?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'A';

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Profil utilisateur */}
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center gap-2 p-2 w-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-left flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
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
