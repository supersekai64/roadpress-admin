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

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
}: OptimizedImageProps) {
  const getOptimizedPath = (format: 'avif' | 'webp') => {
    const pathParts = src.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fileNameWithoutExt = fileName.replace(/\.(png|jpg|jpeg)$/i, '');
    const directory = pathParts.slice(0, -1).join('/');
    
    return `${directory}/optimized/${fileNameWithoutExt}.${format}`;
  };

  return (
    <picture>
      {/* Format AVIF */}
      <source
        type="image/avif"
        srcSet={getOptimizedPath('avif')}
        sizes={sizes}
      />
      
      {/* Format WebP */}
      <source
        type="image/webp"
        srcSet={getOptimizedPath('webp')}
        sizes={sizes}
      />
      
      {/* Image originale */}
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
