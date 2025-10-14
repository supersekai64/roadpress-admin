"use client";

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LogoutButtonProps {
  readonly className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps = {}) {
  const handleLogout = async () => {
    await signOut({
      callbackUrl: '/login',
      redirect: true,
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className={className}
            aria-label="Se déconnecter"
          >
            <LogOut className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Se déconnecter</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}