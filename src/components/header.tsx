"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/logout-button';

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
        <Image
          src={logoSrc}
          alt="Roadpress"
          width={140}
          height={36}
          className="shrink-0"
          priority
        />
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
