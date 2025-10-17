# 🧠 Instructions Copilot - Roadpress Admin

> **Documentation centralisée pour GitHub Copilot**
> 
> Ce fichier contient TOUTE la connaissance du projet. Organisé pour une lecture optimale par l'IA.

---

## 🔴 SECTION 1 : RÈGLES CRITIQUES (NE JAMAIS OUBLIER)

### 🤖 Méta-instruction

**TOUJOURS mettre à jour CE FICHIER au lieu de créer des documents séparés.**

Quand un nouveau pattern/règle/procédure est identifié :
1. ✅ Mettre à jour ce fichier dans la section appropriée
2. ❌ NE JAMAIS créer de docs séparés (`DATABASE-MIGRATION-GUIDE.md`, etc.)
3. ❌ NE JAMAIS dupliquer les instructions

**Objectif** : Un seul fichier = une seule source de vérité.

### ⚠️ Gestionnaire de paquets

**TOUJOURS `pnpm`, JAMAIS `npm` ou `yarn`**

```bash
pnpm install        # Installation
pnpm add <pkg>      # Ajouter dépendance
pnpm add -D <pkg>   # Ajouter dev dependency
pnpm remove <pkg>   # Supprimer
pnpm <script>       # Exécuter script
```

### 🚨 Base de données Prisma (RÈGLE ABSOLUE)

**COMMANDES INTERDITES** (suppriment toutes les données) :
- ❌ `prisma migrate reset`
- ❌ `prisma migrate reset --force`
- ❌ `prisma db push --accept-data-loss`
- ❌ `prisma migrate dev --force`

**BACKUP AUTOMATIQUE ACTIVÉ** 🛡️

Toutes les commandes Prisma dangereuses créent **automatiquement** un backup :
- ✅ `pnpm db:push` → Backup auto + push
- ✅ `pnpm db:migrate` → Backup auto + migration interactive
- ✅ `pnpm prisma migrate dev` → Backup auto + migration
- ✅ `pnpm prisma migrate deploy` → Backup auto + déploiement

**Système de protection** :
- Backups automatiques dans `backups/dev/` ou `backups/prod/`
- Conservation des 10 derniers backups (auto-nettoyage)
- Bloque `migrate reset` même avec backup
- Permet skip en dev : `SKIP_BACKUP=1 npx prisma db push` (non recommandé)

**PROCÉDURE OBLIGATOIRE pour toute migration** :

```bash
# 1. BACKUP AUTOMATIQUE (fait automatiquement par les commandes ci-dessous)

# 2. Créer migration SANS appliquer
npx prisma migrate dev --create-only --name <nom>

# 3. VÉRIFIER le SQL généré
# Ouvrir prisma/migrations/<timestamp>_<nom>/migration.sql
# S'assurer qu'il n'y a PAS de DROP/DELETE sur tables importantes

# 4. Appliquer (backup auto avant)
pnpm prisma migrate deploy

# 5. Régénérer client
npx prisma generate
```

**Restauration si données perdues** :
```bash
pnpm db:restore
```

**Commandes sûres** :
```bash
npx prisma migrate status    # ✅ SAFE (pas de backup)
npx prisma generate          # ✅ SAFE (pas de backup)
npx prisma studio            # ✅ SAFE (lecture seule)
pnpm db:push                 # ✅ SAFE (backup auto)
pnpm db:migrate              # ✅ SAFE (backup auto)
npx prisma migrate reset     # ❌ INTERDIT (bloqué par script)
```

---

## � SECTION 2 : CONTEXTE PROJET

### Environnement
- **OS** : Windows
- **Shell** : PowerShell
- **Attention** : Chemins avec backslash, éviter accents dans scripts

### Stack technique
- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript (mode strict)
- **UI** : Tailwind CSS + shadcn/ui
- **Animations** : GSAP + Lenis
- **Database** : PostgreSQL + Prisma ORM
- **Build** : Turbopack (dev) + Webpack (prod)
- **Package Manager** : pnpm

### Commandes développement

```bash
pnpm dev:clean  # ✅ Recommandé : Kill ports + démarrer proprement
pnpm dev        # Démarrer normalement
pnpm build      # Build production
pnpm start      # Start production
pnpm lint       # Lint code
pnpm kill       # Kill processus Node
```

### Structure dossiers
```
src/
├── app/             # Pages Next.js (App Router)
├── components/      # Composants React
│   └── ui/          # shadcn/ui components
├── lib/             # Utilitaires
├── hooks/           # Custom hooks
└── types/           # Types TypeScript

public/
└── images/          # Images sources (optimisées au build)

prisma/
├── schema.prisma    # Schéma database
└── migrations/      # Migrations SQL
```

---

## 🔵 SECTION 3 : PATTERNS DE CODE

### TypeScript : Conventions de nommage

```tsx
// ✅ Fichiers : kebab-case
// button.tsx, theme-toggle.tsx, optimized-image.tsx

// ✅ Composants : PascalCase
<ThemeToggle />
<OptimizedImage />

// ✅ Fonctions/variables : camelCase
const handleClick = () => {}
const isLoading = true

// ✅ Fonctions async : suffixe Async
async function fetchUserDataAsync(id: string) { }
async function saveUserAsync(user: User) { }

// ✅ Constantes : SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com'
const MAX_RETRY_ATTEMPTS = 3

// ✅ Props : readonly + interface
interface ButtonProps {
  readonly children: React.ReactNode
  readonly variant?: 'primary' | 'secondary'
  readonly onClick?: () => void
}
```

### React : Server Components vs Client Components

```tsx
// ✅ Par défaut : Server Component (RSC)
export default function Page() {
  return <main>Contenu statique</main>
}

// ✅ Client Component : "use client" UNIQUEMENT si :
// - Hooks (useState, useEffect, useRef)
// - Animations (GSAP, Lenis)
// - Event listeners (onClick, onChange)
// - Context providers
"use client"
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Gestion d{`'`}état : Immutabilité + Loading/Error

```tsx
// ✅ TOUJOURS : États immutables avec readonly
interface AppState {
  readonly users: readonly User[]
  readonly currentUser: User | null
  readonly settings: Readonly<{
    theme: 'light' | 'dark'
    language: string
  }>
}

// ✅ TOUJOURS : Gérer loading + error
function useUserData(id: string) {
  const [state, setState] = useState<{
    readonly data: User | null
    readonly loading: boolean
    readonly error: string | null
  }>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    async function fetchDataAsync() {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))
        const userData = await fetchUserDataAsync(id)
        if (!cancelled) {
          setState({ data: userData, loading: false, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          })
        }
      }
    }

    fetchDataAsync()
    return () => { cancelled = true }
  }, [id])

  return state
}

// ✅ TOUJOURS : Try/catch + cleanup useEffect
async function fetchDataAsync() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Erreur:', error)
    throw error
  }
}

useEffect(() => {
  const interval = setInterval(() => {}, 1000)
  return () => clearInterval(interval) // Cleanup obligatoire
}, [])
```

### Imports : Chemins absolus avec @/

```tsx
// ✅ Toujours utiliser alias @/
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { User } from '@/types/user'

// ❌ Ne jamais utiliser chemins relatifs
import { Button } from '../../../components/ui/button'
```

### Styles : Tailwind + cn() + Variables CSS

```tsx
import { cn } from '@/lib/utils'

// ✅ Combiner classes avec cn()
<div className={cn(
  'px-4 py-2 rounded-md',
  variant === 'primary' && 'bg-primary text-primary-foreground',
  disabled && 'opacity-50 cursor-not-allowed'
)} />

// ✅ Variables CSS pour thèmes
<div className="bg-background text-foreground" />
```

### Performance : Lazy loading + Tree shaking

```tsx
// ✅ Lazy load composants lourds (> 50 KB)
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <div>Chargement...</div>,
  ssr: false
})

// ✅ Tree shaking : imports sélectifs
import { debounce } from 'lodash-es'  // ✅ BON
import { Home, Settings } from 'lucide-react'  // ✅ BON

import _ from 'lodash'  // ❌ MAUVAIS
import * as Icons from 'lucide-react'  // ❌ MAUVAIS
```

### Accessibilité : HTML sémantique + ARIA

```tsx
// ✅ Balises sémantiques
<main>
  <section aria-labelledby="products-heading">
    <h2 id="products-heading">Nos produits</h2>
  </section>
</main>

// ✅ Formulaires accessibles
<form>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-describedby="email-error"
  />
  {error && <p id="email-error">{error}</p>}
</form>

// ✅ Boutons accessibles
<button aria-label="Fermer">
  <X className="w-4 h-4" />
</button>
```

### Texte : Échapper apostrophes et guillemets

```tsx
// ❌ MAUVAIS
<p>Il n'y a pas de problème</p>

// ✅ BON - Entités HTML
<p>Il n&apos;y a pas de problème</p>

// ✅ BON - Template literals (recommandé)
<p>{`Il n'y a pas de problème`}</p>
<p>{`C'est un "exemple" de texte`}</p>
```

---

## 🟣 SECTION 4 : WORKFLOWS (Procédures étape par étape)

### SEO : Créer une nouvelle page

```tsx
// 1. Créer page.tsx avec Metadata complète
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Titre - Nom du site',
  description: 'Description 150-160 caractères',
  keywords: ['mot-clé 1', 'mot-clé 2'],
  openGraph: {
    title: 'Titre OG',
    description: 'Description OG',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  alternates: { canonical: '/nouvelle-page' },
}

export default function NouvellePage() {
  return (
    <main>
      <h1>Un seul H1 par page</h1>
      <section>
        <h2>Section 1</h2>
        <p>Minimum 300 mots...</p>
      </section>
    </main>
  )
}

// 2. Ajouter au sitemap.ts
// 3. Vérifier robots.ts
// 4. Ajouter JSON-LD si applicable
// 5. Créer liens internes
// 6. Optimiser images avec <OptimizedImage />
// 7. Tester : pnpm build
```

### Images : Optimisation

```tsx
// Utiliser <OptimizedImage /> au lieu de <Image />
import { OptimizedImage } from '@/components/optimized-image'

<OptimizedImage
  src="/images/hero.jpg"
  alt="Description précise et SEO"
  width={1200}
  height={600}
  priority={true}  // Si above-the-fold
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

---

## 🔴 SECTION 5 : ANTI-PATTERNS (NE JAMAIS FAIRE)

### TypeScript
- ❌ Utiliser `any` → Utiliser `unknown` ou typer
- ❌ Utiliser `React.FC` → Props explicites
- ❌ Muter props/state → Immutabilité

### React
- ❌ Oublier cleanup dans useEffect
- ❌ useEffect pour fetch dans Server Components
- ❌ Oublier états loading/error
- ❌ Hooks conditionnels

### Next.js
- ❌ `getServerSideProps` ou `getStaticProps` (Pages Router déprécié)
- ❌ Importer GSAP/Lenis dans Server Components

### HTML/Accessibilité
- ❌ `<div>` quand balise sémantique existe
- ❌ Oublier `alt` sur images
- ❌ Oublier `label` sur inputs
- ❌ Apostrophes/guillemets non échappés en JSX

### Nommage
- ❌ Mélanger camelCase/PascalCase/kebab-case
- ❌ Noms génériques (`data`, `temp`, `test`)
- ❌ Oublier suffixe `Async` pour fonctions async

---

## ✅ SECTION 6 : CHECKLISTS

### Avant de générer du code

**Code**
- [ ] ESLint + Prettier sans erreurs
- [ ] Tous types TypeScript explicites (pas `any`)
- [ ] Constantes en SCREAMING_SNAKE_CASE
- [ ] Fonctions async avec suffixe `Async`
- [ ] Props `readonly`

**État**
- [ ] États loading + error gérés
- [ ] Try/catch pour toutes opérations async
- [ ] Cleanup dans useEffect si nécessaire
- [ ] Données immutables (readonly, const)

**Accessibilité**
- [ ] HTML sémantique (main, section, article)
- [ ] Labels associés aux inputs (`htmlFor`)
- [ ] ARIA labels où nécessaire
- [ ] Images avec `alt` descriptifs

**Performance**
- [ ] Images optimisées (next/image ou OptimizedImage)
- [ ] Composants lourds lazy-loadés
- [ ] Pas de re-renders inutiles

**Conventions**
- [ ] Fichiers en kebab-case
- [ ] Composants en PascalCase
- [ ] Fonctions/variables en camelCase
- [ ] Imports avec alias `@/`

### Checklist SEO (nouvelle page)

- [ ] Fichier page.tsx créé avec structure sémantique
- [ ] Metadata complète (title, description, OG, Twitter, canonical)
- [ ] Page ajoutée au sitemap.ts
- [ ] Robots.txt vérifié (page non bloquée)
- [ ] Un seul H1 par page
- [ ] Hiérarchie titres (H1 > H2 > H3)
- [ ] Alt text sur toutes images
- [ ] URLs descriptives (kebab-case)
- [ ] Liens internes depuis/vers autres pages
- [ ] Données structurées (JSON-LD) si applicable
- [ ] Contenu minimum 300 mots
- [ ] Images optimisées (WebP/AVIF)
- [ ] Mobile responsive
- [ ] Build réussi sans erreurs
- [ ] Sitemap.xml accessible
- [ ] Temps de chargement < 3s

### Checklist bundles

- [ ] Bundle analyzer installé et utilisé
- [ ] Dynamic imports pour composants > 50 KB
- [ ] Tree shaking activé (imports sélectifs)
- [ ] Vendors séparés (next.config.ts)
- [ ] Alternatives légères préférées
- [ ] First Load JS < 200 KB
- [ ] Pages individuelles < 50 KB
- [ ] Monitoring régulier

---

## 📚 SECTION 7 : RÉFÉRENCE RAPIDE

### Metadata Next.js complète

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://site.com'),
  title: 'Titre - Nom du site',
  description: 'Description 150-160 caractères',
  keywords: ['mot-clé 1', 'mot-clé 2'],
  authors: [{ name: 'Auteur', url: 'https://site.com' }],
  openGraph: {
    title: 'Titre pour Facebook/LinkedIn',
    description: 'Description réseaux sociaux',
    url: 'https://site.com',
    siteName: 'Nom du site',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Titre Twitter/X',
    description: 'Description Twitter/X',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
}
```

### Sitemap + Robots.txt

```tsx
// src/app/sitemap.ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: 'https://site.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://site.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}

// src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: 'https://site.com/sitemap.xml',
  }
}
```

### JSON-LD (Données structurées)

```tsx
// Product
const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Nom produit',
  image: '/product.jpg',
  description: 'Description',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'EUR',
    price: 99.99,
    availability: 'https://schema.org/InStock',
  },
}

// Breadcrumb
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://site.com' },
    { '@type': 'ListItem', position: 2, name: 'Produits', item: 'https://site.com/products' },
  ],
}

// Usage
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
/>
```

### Exemple composant complet

```tsx
// Server Component
import { notFound } from 'next/navigation'

interface PageProps {
  readonly params: Promise<{ id: string }>
}

async function getProductAsync(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Erreur:', error)
    throw error
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params
  const product = await getProductAsync(id)
  if (!product) notFound()
  
  return (
    <main className="container mx-auto px-4 py-8">
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </main>
  )
}

// Client Component
"use client"

import { useState } from 'react'

interface CounterProps {
  readonly initialValue?: number
  readonly max?: number
}

export function Counter({ initialValue = 0, max = 10 }: CounterProps) {
  const [count, setCount] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  const handleIncrement = () => {
    if (count >= max) {
      setError(`Maximum atteint (${max})`)
      return
    }
    setCount(prev => prev + 1)
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-2xl font-bold">{count}</p>
      <button
        onClick={handleIncrement}
        disabled={count >= max}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        aria-label="Incrémenter le compteur"
      >
        Incrémenter
      </button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
```

---

## 🔗 Ressources externes

- Next.js 15 : https://nextjs.org/docs
- React 19 : https://react.dev
- TypeScript : https://www.typescriptlang.org/docs/
- WCAG : https://www.w3.org/WAI/WCAG21/quickref/

### Metadata (TOUJOURS inclure)

```tsx
// src/app/page.tsx ou src/app/[...]/page.tsx
import type { Metadata } from 'next';

// ✅ Metadata statique
export const metadata: Metadata = {
  title: 'Titre de la page - Nom du site',
  description: 'Description concise et pertinente (150-160 caractères)',
  keywords: ['mot-clé 1', 'mot-clé 2', 'mot-clé 3'],
  authors: [{ name: 'Nom Auteur', url: 'https://site.com' }],
  creator: 'Nom du créateur',
  publisher: 'Nom de l\'éditeur',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://votresite.com'),
  alternates: {
    canonical: '/',
    languages: {
      'fr-FR': '/fr',
      'en-US': '/en',
    },
  },
  openGraph: {
    title: 'Titre pour Facebook/LinkedIn',
    description: 'Description pour les réseaux sociaux',
    url: 'https://votresite.com',
    siteName: 'Nom du site',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Description de l\'image',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Titre pour Twitter/X',
    description: 'Description pour Twitter/X',
    creator: '@username',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'code-de-verification-google',
    yandex: 'code-yandex',
    bing: 'code-bing',
  },
};

export default function Page() {
  return <main>...</main>;
}
```

```tsx
// ✅ Metadata dynamique (pour les pages avec params)
interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductAsync(slug);

  return {
    title: `${product.name} - Boutique`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}
```

### Structure HTML sémantique (OBLIGATOIRE)

```tsx
// ✅ Structure SEO-optimisée
export default function Page() {
  return (
    <>
      {/* En-tête avec navigation */}
      <header>
        <nav aria-label="Navigation principale">
          <ul>
            <li><a href="/">Accueil</a></li>
            <li><a href="/products">Produits</a></li>
          </ul>
        </nav>
      </header>

      {/* Contenu principal */}
      <main>
        <article>
          <header>
            <h1>Titre principal H1 (un seul par page)</h1>
            <p>Introduction ou chapeau</p>
          </header>

          <section>
            <h2>Section 1</h2>
            <p>Contenu...</p>
          </section>

          <section>
            <h2>Section 2</h2>
            <p>Contenu...</p>
          </section>
        </article>

        {/* Barre latérale si nécessaire */}
        <aside aria-label="Informations complémentaires">
          <h2>Articles connexes</h2>
        </aside>
      </main>

      {/* Pied de page */}
      <footer>
        <p>&copy; 2025 Nom du site</p>
      </footer>
    </>
  );
}
```

### Données structurées (Schema.org)

```tsx
// ✅ JSON-LD pour les données structurées
export default function ProductPage({ product }: ProductPageProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'Nom de la marque',
    },
    offers: {
      '@type': 'Offer',
      url: `https://votresite.com/products/${product.slug}`,
      priceCurrency: 'EUR',
      price: product.price,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <h1>{product.name}</h1>
        {/* Contenu */}
      </main>
    </>
  );
}
```

```tsx
// ✅ Breadcrumb (fil d'Ariane)
export default function ProductPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: 'https://votresite.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Produits',
        item: 'https://votresite.com/products',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Nom du produit',
        item: 'https://votresite.com/products/slug',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Contenu */}
    </>
  );
}
```

### Sitemap et Robots.txt

```tsx
// src/app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://votresite.com';
  
  // Pages statiques
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ];

  // Pages dynamiques
  const products = await getAllProductsAsync();
  const productPages = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...productPages];
}
```

```tsx
// src/app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/private/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 2,
      },
    ],
    sitemap: 'https://votresite.com/sitemap.xml',
  };
}
```

### URLs et navigation

```tsx
// ✅ URLs propres et descriptives
// BON : /products/chaussures-running-nike-air-max
// MAUVAIS : /products/12345

// ✅ Utiliser next/link pour la navigation interne
import Link from 'next/link';

<Link href="/products/chaussures-running" prefetch={true}>
  Chaussures de running
</Link>

// ✅ Liens externes avec attributs SEO
<a 
  href="https://externe.com" 
  target="_blank" 
  rel="noopener noreferrer nofollow"
>
  Lien externe
</a>
```

### Performance et Core Web Vitals

```tsx
// ✅ Images optimisées
import { OptimizedImage } from '@/components/optimized-image';

<OptimizedImage
  src="/products/chaussure.jpg"
  alt="Chaussures de running Nike Air Max - vue de profil"
  width={800}
  height={600}
  priority={isAboveFold}
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// ✅ Lazy loading pour le contenu below-the-fold
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/heavy-component'), {
  loading: () => <p>Chargement...</p>,
  ssr: false,
});
```

### Favicon (Bonnes pratiques modernes)

```tsx
// ✅ Configuration complète des favicons dans layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://votresite.com'),
  
  // Favicons - Configuration moderne optimale
  icons: {
    // SVG favicon (recommandé, supporte light/dark mode)
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' }, // Fallback + support PDF
    ],
    
    // Apple Touch Icon (180x180 suffit depuis iOS 8)
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  
  // Web App Manifest (obligatoire pour Android/PWA)
  manifest: '/manifest.json',
};
```

**Exemple de fichier public/manifest.json :**
```
{
  "name": "Nom complet de l'application",
  "short_name": "Nom court",
  "description": "Description de l'application",
  "start_url": "/",
  "display": "standalone",
  "background_color": "white",
  "theme_color": "black",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

**Exemple de fichier public/favicon.svg avec support dark mode :**
```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .icon { fill: black; }
    @media (prefers-color-scheme: dark) {
      .icon { fill: white; }
    }
  </style>
  <circle class="icon" cx="16" cy="16" r="14"/>
</svg>
```

#### 📋 Checklist fichiers favicon requis

Dans le dossier `public/` :

- [ ] **favicon.svg** (32x32 ou vectoriel) - Favicon moderne avec support dark mode
- [ ] **favicon.ico** (32x32) - Fallback + support PDF dans navigateurs
- [ ] **apple-touch-icon.png** (180x180, opaque) - iOS/Safari (PAS transparent)
- [ ] **android-chrome-192x192.png** (192x192) - Android/PWA
- [ ] **android-chrome-512x512.png** (512x512) - Android "Add to Home Screen"
- [ ] **manifest.json** - Web App Manifest (obligatoire Android/Chromium)

#### 🎨 Spécifications techniques

```tsx
// Tailles et formats recommandés :
// - favicon.svg : vectoriel ou 32x32, support @media dark mode
// - favicon.ico : 32x32 (ou multi-size 16+32+48)
// - apple-touch-icon.png : 180x180, OPAQUE (iOS ajoute fond noir sur transparent)
// - android-chrome-192x192.png : 192x192
// - android-chrome-512x512.png : 512x512 (utilisé pour "Ajouter à l'écran d'accueil")
```

### Balises importantes

```tsx
// ✅ Thème mobile et viewport
export const metadata: Metadata = {
  // Thème mobile (couleur de la barre d'adresse)
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  
  // Viewport (automatique dans Next.js 15, mais peut être configuré)
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};
```

### Contenu et texte

```tsx
// ✅ Texte optimisé SEO
// - Minimum 300 mots par page
// - Mots-clés naturellement intégrés
// - Titres hiérarchisés (H1 > H2 > H3)
// - Paragraphes courts et lisibles
// - Listes à puces pour la lisibilité

export default function BlogPost() {
  return (
    <article>
      <h1>Titre principal avec mot-clé principal</h1>
      
      <p>
        Introduction claire avec mot-clé principal mentionné naturellement
        dans les 100 premiers mots.
      </p>

      <section>
        <h2>Sous-titre avec mot-clé secondaire</h2>
        <p>Contenu développé...</p>
        
        <ul>
          <li>Point important 1</li>
          <li>Point important 2</li>
          <li>Point important 3</li>
        </ul>
      </section>

      <section>
        <h2>Autre section</h2>
        <p>Contenu développé avec liens internes...</p>
        <Link href="/related-article">Article connexe</Link>
      </section>
    </article>
  );
}
```

### 🚀 Workflow création de page (OBLIGATOIRE)

**À CHAQUE création de nouvelle page, suivre ces étapes dans l'ordre :**

#### 1. Créer le fichier page.tsx

```tsx
// src/app/nouvelle-page/page.tsx
import type { Metadata } from 'next';

// ✅ TOUJOURS : Metadata complète
export const metadata: Metadata = {
  title: 'Titre de la nouvelle page - Nom du site',
  description: 'Description claire de 150-160 caractères',
  keywords: ['mot-clé 1', 'mot-clé 2', 'mot-clé 3'],
  openGraph: {
    title: 'Titre pour réseaux sociaux',
    description: 'Description pour réseaux sociaux',
    url: 'https://votresite.com/nouvelle-page',
    images: [{ url: '/og-nouvelle-page.jpg', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/nouvelle-page',
  },
};

export default function NouvellePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <article>
        <h1>Un seul H1 par page</h1>
        
        <section>
          <h2>Section 1</h2>
          <p>Contenu minimum 300 mots...</p>
        </section>
        
        <section>
          <h2>Section 2</h2>
          <p>Contenu avec liens internes...</p>
        </section>
      </article>
    </main>
  );
}
```

#### 2. Ajouter au sitemap.ts

```tsx
// src/app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://votresite.com';
  
  const staticPages = [
    // Pages existantes...
    
    // ✅ AJOUTER la nouvelle page
    {
      url: `${baseUrl}/nouvelle-page`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ];

  return staticPages;
}
```

#### 3. Vérifier robots.txt (si restrictions)

```tsx
// src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'], // ✅ Vérifier que la page n'est pas bloquée
      },
    ],
    sitemap: 'https://votresite.com/sitemap.xml',
  };
}
```

#### 4. Ajouter données structurées (si applicable)

```tsx
// ✅ Si page produit, article, événement, etc.
export default function NouvellePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article', // ou 'Product', 'Event', etc.
    headline: 'Titre de l\'article',
    datePublished: '2025-10-10',
    author: { '@type': 'Person', name: 'Auteur' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>{/* Contenu */}</main>
    </>
  );
}
```

#### 5. Créer liens internes depuis autres pages

```tsx
// ✅ Ajouter des liens depuis pages existantes
<Link href="/nouvelle-page">
  Découvrir la nouvelle page
</Link>
```

#### 6. Optimiser les images

```tsx
// ✅ Toujours utiliser OptimizedImage avec alt descriptif
import { OptimizedImage } from '@/components/optimized-image';

<OptimizedImage
  src="/images/nouvelle-page-hero.jpg"
  alt="Description précise et descriptive de l'image"
  width={1200}
  height={600}
  priority={true} // Si above-the-fold
/>
```

#### 7. Tester la page

```bash
# ✅ Vérifier le build
pnpm build

# ✅ Vérifier le sitemap généré
# Ouvrir : http://localhost:3000/sitemap.xml

# ✅ Vérifier robots.txt
# Ouvrir : http://localhost:3000/robots.txt

# ✅ Vérifier metadata (inspect source HTML)
# Ouvrir : view-source:http://localhost:3000/nouvelle-page
```

### Checklist SEO obligatoire

Avant de déployer une page, vérifier :

- [ ] **Fichier page.tsx créé** avec structure sémantique
- [ ] **Metadata complète** (title, description, OG, Twitter, canonical)
- [ ] **Page ajoutée au sitemap.ts** avec priorité et changeFrequency
- [ ] **Robots.txt vérifié** (page non bloquée)
- [ ] **Un seul H1** par page
- [ ] **Hiérarchie des titres** respectée (H1 > H2 > H3)
- [ ] **Alt text** sur toutes les images avec OptimizedImage
- [ ] **URLs descriptives** (kebab-case, pas de IDs numériques)
- [ ] **Liens internes** depuis/vers d'autres pages
- [ ] **Données structurées** (JSON-LD) si applicable
- [ ] **Contenu minimum 300 mots**
- [ ] **Images optimisées** (WebP/AVIF via scripts/optimize-images.js)
- [ ] **Mobile responsive** (Tailwind breakpoints)
- [ ] **Build réussi** sans erreurs
- [ ] **Sitemap.xml accessible** et contient la nouvelle page
- [ ] **Temps de chargement** < 3 secondes (Lighthouse)

## 📐 Patterns TypeScript avancés

### Props avec immutabilité

```tsx
// ✅ TOUJOURS : Props avec readonly
interface ButtonProps {
  readonly children: React.ReactNode;
  readonly variant?: 'primary' | 'secondary';
  readonly disabled?: boolean;
  readonly onClick?: () => void;
}

export function Button({ children, variant = 'primary', disabled, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-md transition-colors',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground'
      )}
    >
      {children}
    </button>
  );
}
```

### Nommage des fonctions asynchrones

```tsx
// ✅ TOUJOURS : Suffixe Async pour les fonctions asynchrones
async function fetchUserDataAsync(id: string) {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return await response.json();
}

async function saveUserAsync(user: User) {
  // ...
}
```

### Constantes

```tsx
// ✅ TOUJOURS : SCREAMING_SNAKE_CASE pour les constantes
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 5000;

// ✅ Utiliser as const pour les tableaux immutables
const STATUSES = ['idle', 'loading', 'success', 'error'] as const;
type Status = typeof STATUSES[number];
```

### Gestion d'état immutable

```tsx
// ✅ TOUJOURS : États immutables avec readonly
interface AppState {
  readonly users: readonly User[];
  readonly currentUser: User | null;
  readonly settings: Readonly<{
    theme: 'light' | 'dark';
    language: string;
  }>;
}
```

## 🔄 Gestion des données et états

### Gestion des erreurs (OBLIGATOIRE)

```tsx
// ✅ TOUJOURS : Try/catch explicite avec gestion d'erreur
async function fetchDataAsync() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw error;
  }
}
```

### États de chargement (OBLIGATOIRE)

```tsx
// ✅ TOUJOURS : Gérer loading et error states
function useUserData(id: string) {
  const [state, setState] = useState<{
    readonly data: User | null;
    readonly loading: boolean;
    readonly error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchDataAsync() {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const userData = await fetchUserDataAsync(id);
        if (!cancelled) {
          setState({ data: userData, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      }
    }

    fetchDataAsync();
    return () => { cancelled = true; };
  }, [id]);

  return state;
}
```

### Cleanup dans useEffect

```tsx
// ✅ TOUJOURS : Cleanup pour les subscriptions/timers
useEffect(() => {
  const interval = setInterval(() => {
    // Logique
  }, 1000);

  return () => {
    clearInterval(interval); // Cleanup obligatoire
  };
}, []);
```

## ♿ Accessibilité (OBLIGATOIRE)

### HTML sémantique

```tsx
// ✅ Utiliser les balises sémantiques appropriées
<main>
  <section aria-labelledby="products-heading">
    <h2 id="products-heading">Nos produits</h2>
    {/* Contenu */}
  </section>
</main>

// ❌ NE PAS utiliser div partout
<div>
  <div>Titre</div>
  <div>Contenu</div>
</div>
```

### Formulaires accessibles

```tsx
// ✅ TOUJOURS : Labels associés et ARIA
<form>
  <label htmlFor="email" className="block text-sm font-medium">
    Adresse email
  </label>
  <input
    id="email"
    type="email"
    required
    aria-describedby="email-error"
    className="block w-full"
  />
  {error && (
    <p id="email-error" className="text-destructive text-sm">
      {error}
    </p>
  )}
</form>
```

### Boutons accessibles

```tsx
// ✅ Utiliser <button> au lieu de <div onClick>
<button
  type="button"
  onClick={handleClick}
  aria-label="Fermer le modal"
  className="..."
>
  <X className="w-4 h-4" />
</button>

// ❌ NE PAS FAIRE
<div onClick={handleClick}>
  <X />
</div>
```

## 🚨 Anti-patterns à éviter (NE JAMAIS FAIRE)

### TypeScript
- ❌ **NE JAMAIS** utiliser `any` → Utiliser `unknown` ou typer correctement
- ❌ **NE JAMAIS** utiliser `React.FC` → Préférer les props explicites
- ❌ **NE JAMAIS** muter les props ou le state → Utiliser l'immutabilité

### React
- ❌ **NE JAMAIS** oublier les cleanup dans useEffect
- ❌ **NE JAMAIS** utiliser useEffect pour fetch dans Server Components
- ❌ **NE JAMAIS** oublier les états loading/error
- ❌ **NE JAMAIS** utiliser des hooks conditionnels

### Next.js
- ❌ **NE JAMAIS** utiliser `getServerSideProps` ou `getStaticProps` (Pages Router)
- ❌ **NE PAS** importer des libs client-only (GSAP, Lenis) dans Server Components

### HTML/Accessibilité
- ❌ **NE JAMAIS** utiliser `<div>` quand une balise sémantique existe
- ❌ **NE JAMAIS** oublier les `alt` sur les images
- ❌ **NE JAMAIS** oublier les labels sur les inputs

### Texte et caractères spéciaux (OBLIGATOIRE)
- ❌ **NE JAMAIS** utiliser d'apostrophes directement dans le JSX
- ❌ **NE JAMAIS** utiliser de guillemets directement dans le JSX
- ✅ **TOUJOURS** échapper les apostrophes avec des entités HTML ou template literals
- ✅ **TOUJOURS** échapper les guillemets avec des entités HTML ou template literals
- ✅ **MÉTHODE RECOMMANDÉE** : utiliser des template literals entre accolades

```tsx
// ❌ MAUVAIS - Provoque une erreur ESLint
<p>Il n'y a pas de problème</p>
<p>C'est un "exemple" de texte</p>

// ✅ BON - Apostrophes et guillemets échappés
<p>Il n&apos;y a pas de problème</p>
<p>C&apos;est un &quot;exemple&quot; de texte</p>

// ✅ BON - Alternative avec accolades
<p>Il{`'`}y a pas de problème</p>
<p>C{`'`}est un {`"`}exemple{`"`} de texte</p>

// ✅ BON - Template literals (recommandé pour texte long)
<p>{`Il n'y a pas de problème`}</p>
<p>{`C'est un "exemple" de texte`}</p>
```

### Nommage
- ❌ **NE JAMAIS** mélanger les conventions (camelCase, PascalCase, kebab-case)
- ❌ **NE JAMAIS** utiliser des noms génériques (`data`, `temp`, `test`)
- ❌ **NE JAMAIS** oublier le suffixe `Async` pour les fonctions asynchrones

## ✅ Checklist de qualité

Avant de générer du code, vérifier que :

### Code
- [ ] Le code passe ESLint et Prettier sans erreurs
- [ ] Tous les types TypeScript sont explicites (pas de `any`)
- [ ] Les constantes utilisent SCREAMING_SNAKE_CASE
- [ ] Les fonctions async ont le suffixe `Async`
- [ ] Toutes les props sont `readonly`

### Gestion d'état
- [ ] Les états loading et error sont gérés
- [ ] Try/catch présent pour toutes les opérations async
- [ ] Cleanup functions présentes dans useEffect si nécessaire
- [ ] Les données sont immutables (readonly, const)

### Accessibilité
- [ ] HTML sémantique utilisé (main, section, article, etc.)
- [ ] Labels associés aux inputs avec `htmlFor`
- [ ] ARIA labels présents où nécessaire
- [ ] Images ont des attributs `alt` descriptifs

### Performance
- [ ] Images optimisées avec next/image ou OptimizedImage
- [ ] Composants lourds lazy-loadés
- [ ] Pas de re-renders inutiles

### Conventions
- [ ] Fichiers en kebab-case
- [ ] Composants en PascalCase
- [ ] Fonctions/variables en camelCase
- [ ] Imports avec alias `@/`

## � Optimisation des bundles et code splitting

### Analyse des bundles

```bash
# ✅ Analyser la taille des bundles
pnpm add -D @next/bundle-analyzer

# Dans next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  // config Next.js
});

# Lancer l'analyse
ANALYZE=true pnpm build
```

### Code splitting avec dynamic imports

```tsx
// ✅ TOUJOURS : Lazy load des composants lourds
import dynamic from 'next/dynamic';

// Composant lourd chargé uniquement quand nécessaire
const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <div>Chargement du graphique...</div>,
  ssr: false, // Désactiver SSR si le composant utilise des APIs browser
});

// Librairie externe lourde
const HeavyEditor = dynamic(
  () => import('react-quill').then((mod) => mod.default),
  { ssr: false }
);

export default function Page() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>
        Afficher le graphique
      </button>
      {showChart && <HeavyChart data={data} />}
    </div>
  );
}
```

### Tree shaking - Imports optimisés

```tsx
// ❌ MAUVAIS - Importe toute la librairie
import _ from 'lodash';
import * as Icons from 'lucide-react';

// ✅ BON - Import sélectif (tree shaking)
import { debounce } from 'lodash-es';
import { Home, Settings, User } from 'lucide-react';

// ❌ MAUVAIS - Importe tout GSAP
import gsap from 'gsap';
import * as allPlugins from 'gsap/all';

// ✅ BON - Import uniquement ce qui est utilisé
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
```

### Séparation des vendors

```typescript
// next.config.ts - Configuration webpack pour split chunks
export default {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Séparer les grosses librairies en chunks distincts
          gsap: {
            test: /node_modules\/gsap/,
            name: 'gsap',
            priority: 30,
          },
          lenis: {
            test: /node_modules\/lenis/,
            name: 'lenis',
            priority: 30,
          },
          // Vendor par défaut pour les autres dépendances
          vendor: {
            test: /node_modules/,
            name: 'vendors',
            priority: 20,
          },
        },
      };
    }
    return config;
  },
};
```

### Optimisation des dépendances

```tsx
// ✅ Préférer les alternatives légères
// Moment.js (289KB) → date-fns (20KB) ou Day.js (2KB)
import { format } from 'date-fns';

// Lodash (70KB) → Lodash-es (modules séparés)
import { debounce } from 'lodash-es';

// Chart.js (200KB) → Recharts (tree-shakeable)
import { LineChart, Line } from 'recharts';
```

### Limites de taille recommandées

```tsx
// 🎯 Objectifs de taille (après gzip)
// - First Load JS total : < 200 KB
// - Page individuelle : < 50 KB
// - Chunk vendor : < 150 KB
// - Chunk individuel : < 30 KB

// ⚠️ Si un chunk dépasse 100 KB :
// 1. Vérifier avec bundle analyzer
// 2. Lazy load si possible
// 3. Code splitting agressif
// 4. Remplacer par alternative légère
```

### Monitoring continu

```tsx
// ✅ Vérifier régulièrement
// 1. Lancer : pnpm build
// 2. Regarder la table "Route (app)" dans la console
// 3. Si "First Load JS" > 200 KB → optimiser
// 4. Si une page > 50 KB → lazy load

// Exemple de sortie à surveiller :
// Route (app)                Size  First Load JS
// ┌ ○ /                   2.73 kB      105 kB  ✅ BON
// ├ ○ /dashboard         45.2 kB      150 kB  ✅ BON
// └ ○ /editor           156.8 kB      262 kB  ⚠️ TROP GROS
```

### Preload et prefetch stratégiques

```tsx
// ✅ Preload pour les ressources critiques
import Link from 'next/link';

// Prefetch automatique avec next/link
<Link href="/dashboard" prefetch={true}>
  Dashboard
</Link>

// Preload manuel pour composants critiques
import { preload } from 'react-dom';

function handleMouseEnter() {
  preload('/api/data', { as: 'fetch' });
}
```

### Checklist optimisation bundles

- [ ] **Bundle analyzer installé** et utilisé régulièrement
- [ ] **Dynamic imports** pour composants > 50 KB
- [ ] **Tree shaking** activé (imports sélectifs)
- [ ] **Vendors séparés** dans next.config.ts
- [ ] **Alternatives légères** préférées aux grosses libs
- [ ] **First Load JS** < 200 KB
- [ ] **Pages individuelles** < 50 KB
- [ ] **Monitoring régulier** après chaque ajout de dépendance

## �💡 Exemples de code exemplaire

### Composant complet (Server Component)

```tsx
// src/app/products/[id]/page.tsx
import { notFound } from 'next/navigation';

interface PageProps {
  readonly params: Promise<{ id: string }>;
}

async function getProductAsync(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      next: { revalidate: 3600 }, // Cache 1h
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur produit:', error);
    throw error;
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductAsync(id);
  
  if (!product) {
    notFound();
  }
  
  return (
    <main className="container mx-auto px-4 py-8">
      <article>
        <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
        <p className="text-muted-foreground">{product.description}</p>
      </article>
    </main>
  );
}
```

### Composant client avec hooks

```tsx
"use client";

import { useState, useEffect } from 'react';

interface CounterProps {
  readonly initialValue?: number;
  readonly max?: number;
}

export function Counter({ initialValue = 0, max = 10 }: CounterProps) {
  const [count, setCount] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleIncrement = () => {
    if (count >= max) {
      setError(`Maximum atteint (${max})`);
      return;
    }
    setCount(prev => prev + 1);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-2xl font-bold">{count}</p>
      <button
        onClick={handleIncrement}
        disabled={count >= max}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        aria-label="Incrémenter le compteur"
      >
        Incrémenter
      </button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

## 📚 Ressources

Documentation externe :
- Next.js 15 Documentation : https://nextjs.org/docs
- React 19 Documentation : https://react.dev
- TypeScript Handbook : https://www.typescriptlang.org/docs/
- WCAG Guidelines : https://www.w3.org/WAI/WCAG21/quickref/
