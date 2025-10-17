#!/usr/bin/env node

/**
 * Hook Prisma - Backup automatique avant toute migration
 * 
 * Ce script s'exécute AUTOMATIQUEMENT avant :
 * - prisma migrate dev
 * - prisma migrate deploy
 * - prisma db push
 * 
 * Il crée un backup de sécurité pour éviter toute perte de données.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkIfMigrationCommand() {
  const args = process.argv.slice(2);
  const command = args.join(' ');
  
  // Vérifier si c'est une commande de migration dangereuse
  const dangerousCommands = [
    'migrate dev',
    'migrate deploy',
    'db push',
    'migrate reset', // Bloqué de toute façon
  ];
  
  return dangerousCommands.some(cmd => command.includes(cmd));
}

function createBackup() {
  log('\n====================================', 'cyan');
  log('   BACKUP AUTOMATIQUE PRISMA', 'cyan');
  log('====================================\n', 'cyan');
  
  // Vérifier si pg_dump est disponible
  try {
    execSync('pg_dump --version', { stdio: 'pipe' });
  } catch (error) {
    log('⚠️  pg_dump non trouvé - Backup ignoré', 'yellow');
    log('💡 Installez PostgreSQL pour activer les backups automatiques\n', 'yellow');
    return false;
  }
  
  // Déterminer l'environnement
  const isProduction = process.env.NODE_ENV === 'production';
  const envLabel = isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT';
  const databaseUrl = isProduction 
    ? process.env.DIRECT_DATABASE_URL 
    : process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    log('❌ DATABASE_URL non trouvée - Backup impossible', 'red');
    return false;
  }
  
  // Créer le dossier backups
  const backupDir = path.join(process.cwd(), 'backups', isProduction ? 'prod' : 'dev');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Nom du fichier avec timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5);
  const backupFile = path.join(backupDir, `auto_backup_${timestamp}.sql`);
  
  log(`🌍 Environnement : ${envLabel}`, isProduction ? 'red' : 'green');
  log(`📁 Backup : ${backupFile}\n`, 'cyan');
  
  try {
    log('⏳ Création du backup...', 'yellow');
    
    // Créer le backup (masquer la sortie pour éviter le spam)
    execSync(`pg_dump "${databaseUrl}" > "${backupFile}"`, {
      stdio: 'pipe',
      env: { ...process.env, PGPASSWORD: extractPassword(databaseUrl) }
    });
    
    // Vérifier la taille du backup
    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    log('✅ Backup créé avec succès !', 'green');
    log(`   📊 Taille : ${sizeMB} MB\n`, 'green');
    
    // Nettoyer les vieux backups (garder seulement les 10 derniers)
    cleanOldBackups(backupDir, 10);
    
    return true;
  } catch (error) {
    log(`❌ Erreur lors du backup : ${error.message}`, 'red');
    log('⚠️  Migration annulée pour sécurité\n', 'yellow');
    return false;
  }
}

function extractPassword(databaseUrl) {
  // Extraire le mot de passe de l'URL PostgreSQL
  const match = databaseUrl.match(/:([^@]+)@/);
  return match ? match[1] : '';
}

function cleanOldBackups(backupDir, keepCount) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('auto_backup_') && f.endsWith('.sql'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Plus récent en premier
    
    // Supprimer les backups au-delà de keepCount
    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        log(`🗑️  Suppression ancien backup : ${file.name}`, 'yellow');
      });
    }
  } catch (error) {
    // Ignorer les erreurs de nettoyage
  }
}

// Point d'entrée principal
function main() {
  // Vérifier si c'est une commande de migration
  if (!checkIfMigrationCommand()) {
    // Pas une commande dangereuse, laisser passer
    process.exit(0);
  }
  
  // Bloquer migrate reset (même avec backup)
  if (process.argv.join(' ').includes('migrate reset')) {
    log('\n❌ COMMANDE INTERDITE : prisma migrate reset', 'red');
    log('Cette commande SUPPRIME TOUTES LES DONNÉES\n', 'red');
    log('💡 Utilisez plutôt :', 'yellow');
    log('   1. pnpm db:backup (créer backup)', 'cyan');
    log('   2. Modifier le schema.prisma', 'cyan');
    log('   3. pnpm db:migrate (migration sécurisée)\n', 'cyan');
    process.exit(1);
  }
  
  // Créer le backup automatique
  const success = createBackup();
  
  if (!success) {
    log('⚠️  Échec du backup - Migration annulée par sécurité', 'red');
    log('💡 Si vous voulez forcer (non recommandé) :', 'yellow');
    log('   SKIP_BACKUP=1 npx prisma migrate dev\n', 'yellow');
    
    // Autoriser le skip en dev uniquement
    if (process.env.SKIP_BACKUP === '1' && process.env.NODE_ENV !== 'production') {
      log('⚠️  SKIP_BACKUP activé - Migration sans backup\n', 'yellow');
      process.exit(0);
    }
    
    process.exit(1);
  }
  
  log('🔒 ====================================\n', 'cyan');
  process.exit(0);
}

// Exécution
main();
