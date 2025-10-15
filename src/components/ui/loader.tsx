import { cn } from '@/lib/utils';

interface LoaderProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

export function Loader({ size = 'md', className }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div
      className={cn(
        'inline-block rounded-full border-solid border-current border-r-transparent animate-spin',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Chargement"
    >
      <span className="sr-only">Chargement...</span>
    </div>
  );
}

interface LoadingScreenProps {
  readonly message?: string;
  readonly size?: 'sm' | 'md' | 'lg';
}

export function LoadingScreen({ message = 'Chargement...', size = 'lg' }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader size={size} className="text-primary" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
