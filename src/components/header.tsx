"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/logout-button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Shield } from 'lucide-react';

export function Header() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const logoSrc = isDark ? '/images/roadpress-w.svg' : '/images/roadpress-b.svg';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 select-none">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="shrink-0">
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

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <User className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Menu profil</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/2fa" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                <span>Sécurité 2FA</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <LogoutButton />
      </div>
    </header>
  );
}
