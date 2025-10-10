import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Composant d'image optimise qui charge automatiquement
 * le format le plus leger (AVIF > WebP > Original)
 * 
 * Les images optimisees doivent etre dans /public/optimized/
 * 
 * @example
 * <OptimizedImage 
 *   src="/images/hero.jpg" 
 *   alt="Hero"
 *   width={1920}
 *   height={1080}
 * />
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
}: OptimizedImageProps) {
  // Extraire le nom du fichier sans extension
  const getOptimizedPath = (format: 'avif' | 'webp') => {
    const pathParts = src.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fileNameWithoutExt = fileName.replace(/\.(png|jpg|jpeg)$/i, '');
    const directory = pathParts.slice(0, -1).join('/');
    
    return `${directory}/optimized/${fileNameWithoutExt}.${format}`;
  };

  return (
    <picture>
      {/* Format AVIF (le plus leger) */}
      <source
        type="image/avif"
        srcSet={getOptimizedPath('avif')}
        sizes={sizes}
      />
      
      {/* Format WebP (fallback) */}
      <source
        type="image/webp"
        srcSet={getOptimizedPath('webp')}
        sizes={sizes}
      />
      
      {/* Image originale (fallback final) */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        sizes={sizes}
      />
    </picture>
  );
}
