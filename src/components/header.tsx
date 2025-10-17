"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/logout-button';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

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
        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
          <Link href="/dashboard/settings/2fa">
            <Shield className="h-5 w-5" />
            <span className="sr-only">Sécurité 2FA</span>
          </Link>
        </Button>
        <LogoutButton />
      </div>
    </header>
  );
}
