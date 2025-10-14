#!/usr/bin/env node

/**
 * 🎯 Configuration automatique Prisma
 * Détecte l'environnement et donne les instructions précises
 */

console.log('🎯 Configuration Prisma Automatique\n');

// Détecter l'environnement
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const isLocal = !isProduction && !isVercel;

console.log('🔍 Environnement détecté:');
console.log(`   Production: ${isProduction ? '✅' : '❌'}`);
console.log(`   Vercel: ${isVercel ? '✅' : '❌'}`);
console.log(`   Local: ${isLocal ? '✅' : '❌'}\n`);

if (isLocal) {
  console.log('🔧 **CONFIGURATION LOCALE**');
  console.log('');
  console.log('✅ Votre configuration actuelle devrait fonctionner !');
  console.log('');
  console.log('📋 Vérifications:');
  console.log('   1. Docker PostgreSQL démarré: pnpm docker:up');
  console.log('   2. Variables dans .env.local:');
  console.log('      DATABASE_URL="postgresql://roadpress_dev:..."');
  console.log('   3. Schema Prisma: utilise DATABASE_URL ✅');
  console.log('');
  console.log('🚀 Commandes utiles:');
  console.log('   pnpm docker:up     # Démarrer PostgreSQL');
  console.log('   pnpm db:push       # Synchroniser DB');
  console.log('   pnpm dev           # Démarrer le serveur');
  
} else if (isVercel || isProduction) {
  console.log('🚀 **CONFIGURATION PRODUCTION (Vercel)**');
  console.log('');
  console.log('📋 Dans le dashboard Vercel, configurez:');
  console.log('');
  console.log('   DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=XXX"');
  console.log('   DIRECT_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"');
  console.log('   NEXTAUTH_SECRET="votre-secret-production"');
  console.log('   NEXTAUTH_URL="https://votre-domaine.vercel.app"');
  console.log('');
  console.log('💡 URLs Vercel automatiques (si Vercel Postgres):');
  console.log('   DATABASE_URL → Copier POSTGRES_PRISMA_URL');
  console.log('   DIRECT_DATABASE_URL → Copier POSTGRES_URL_NON_POOLING');
}

console.log('\n🎉 **AVANTAGE: Plus jamais besoin de modifier schema.prisma !**');
console.log('   Le même fichier fonctionne en local ET en production');
console.log('');

// Test de configuration
async function testCurrentConfig() {
  try {
    console.log('🧪 Test de la configuration actuelle...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    const count = await prisma.license.count();
    console.log(`✅ Configuration OK: ${count} licences trouvées`);
    await prisma.$disconnect();
    
  } catch (error) {
    console.log('❌ Problème de configuration:');
    console.log(`   Erreur: ${error.message}`);
    
    if (error.code === 'P6001') {
      console.log('\n💡 Solution:');
      if (isLocal) {
        console.log('   - Vérifiez que Docker PostgreSQL est démarré: pnpm docker:up');
        console.log('   - Vérifiez .env.local avec DATABASE_URL postgresql://');
      } else {
        console.log('   - Configurez DATABASE_URL avec prisma:// dans Vercel');
        console.log('   - Re-déployez après configuration des variables');
      }
    }
  }
}

testCurrentConfig();