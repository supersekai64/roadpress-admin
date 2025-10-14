import type { MetadataRoute } from 'next';

/**
 * Fichier robots.txt - Bloque TOUS les robots
 * Site non indexable : Interface d'administration privée
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*', // Tous les bots
        disallow: '/', // Bloquer l'intégralité du site
      },
      {
        userAgent: 'Googlebot',
        disallow: '/',
      },
      {
        userAgent: 'GPTBot', // OpenAI
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User', // ChatGPT
        disallow: '/',
      },
      {
        userAgent: 'Google-Extended', // Google Bard/Gemini
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai', // Claude
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web', // Claude
        disallow: '/',
      },
      {
        userAgent: 'CCBot', // Common Crawl
        disallow: '/',
      },
      {
        userAgent: 'Bytespider', // ByteDance (TikTok)
        disallow: '/',
      },
      {
        userAgent: 'Diffbot',
        disallow: '/',
      },
      {
        userAgent: 'FacebookBot',
        disallow: '/',
      },
      {
        userAgent: 'PerplexityBot', // Perplexity AI
        disallow: '/',
      },
      {
        userAgent: 'Amazonbot',
        disallow: '/',
      },
      {
        userAgent: 'ClaudeBot', // Anthropic
        disallow: '/',
      },
      {
        userAgent: 'Omgilibot',
        disallow: '/',
      },
      {
        userAgent: 'Applebot',
        disallow: '/',
      },
      {
        userAgent: 'YouBot', // You.com
        disallow: '/',
      },
    ],
    // Pas de sitemap (site non indexable)
  };
}
