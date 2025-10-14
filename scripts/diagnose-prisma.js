#!/usr/bin/env node

/**
 * Script de diagnostic pour la configuration Prisma
 * Vérifie les variables d'environnement et la connexion DB
 */

console.log('🔍 Diagnostic de configuration Prisma\n');

// 1. Vérifier les variables d'environnement
console.log('📋 Variables d\'environnement:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'non défini'}`);
console.log(`PRISMA_DATABASE_URL: ${process.env.PRISMA_DATABASE_URL ? '✅ défini' : '❌ manquant'}`);
console.log(`DIRECT_DATABASE_URL: ${process.env.DIRECT_DATABASE_URL ? '✅ défini' : '❌ manquant'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ défini (legacy)' : '❌ manquant'}`);

// 2. Analyser les URLs
console.log('\n🔗 Analyse des URLs:');

if (process.env.PRISMA_DATABASE_URL) {
  const prismaUrl = process.env.PRISMA_DATABASE_URL;
  
  if (prismaUrl.startsWith('prisma://')) {
    console.log('✅ PRISMA_DATABASE_URL: Format Prisma Accelerate correct');
  } else if (prismaUrl.startsWith('prisma+postgresql://')) {
    console.log('✅ PRISMA_DATABASE_URL: Format Prisma + PostgreSQL correct');
  } else if (prismaUrl.startsWith('postgresql://')) {
    console.log('⚠️  PRISMA_DATABASE_URL: PostgreSQL classique (OK en dev, problématique en prod Vercel)');
  } else {
    console.log('❌ PRISMA_DATABASE_URL: Format non reconnu');
  }
  
  // Masquer les credentials dans l'affichage
  const safeUrl = prismaUrl.replace(/:\/\/[^@]+@/, '://***:***@');
  console.log(`   URL: ${safeUrl.substring(0, 80)}...`);
}

if (process.env.DIRECT_DATABASE_URL) {
  const directUrl = process.env.DIRECT_DATABASE_URL;
  
  if (directUrl.startsWith('postgresql://')) {
    console.log('✅ DIRECT_DATABASE_URL: Format PostgreSQL correct');
  } else {
    console.log('❌ DIRECT_DATABASE_URL: Devrait commencer par postgresql://');
  }
}

// 3. Test de connexion Prisma
console.log('\n🔌 Test de connexion...');

async function testConnection() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Test simple
    await prisma.$connect();
    console.log('✅ Connexion Prisma réussie');
    
    // Test de requête
    const count = await prisma.license.count();
    console.log(`✅ Requête test réussie: ${count} licences trouvées`);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.log('❌ Erreur de connexion Prisma:');
    console.log(`   Code: ${error.code || 'N/A'}`);
    console.log(`   Message: ${error.message}`);
    
    if (error.code === 'P6001') {
      console.log('\n💡 Solution pour P6001:');
      console.log('   - En production Vercel: utilisez prisma:// ou prisma+postgresql://');
      console.log('   - En développement: postgresql:// est OK');
      console.log('   - Vérifiez les variables d\'environnement dans le dashboard Vercel');
    }
  }
}

// 4. Recommandations selon l'environnement
console.log('\n📝 Recommandations:');

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

if (isProduction || isVercel) {
  console.log('🚀 Environnement de production détecté:');
  console.log('   - Utilisez prisma:// pour PRISMA_DATABASE_URL');
  console.log('   - Utilisez postgresql:// pour DIRECT_DATABASE_URL');
  console.log('   - Configurez les variables dans le dashboard Vercel');
} else {
  console.log('🔧 Environnement de développement:');
  console.log('   - postgresql:// est OK pour toutes les variables');
  console.log('   - Assurez-vous que Docker PostgreSQL est démarré');
}

// Exécuter le test
testConnection();