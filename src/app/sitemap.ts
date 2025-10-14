import type { MetadataRoute } from 'next';

/**
 * Sitemap vide - Aucune page à indexer
 * Site non indexable : Interface d'administration privée
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Retourner un tableau vide = aucune page à indexer
  return [];
}
