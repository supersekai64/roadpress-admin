# Script PowerShell pour backup sécurisé avant migration Prisma
# Usage: .\scripts\backup-before-migrate.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🔒 ====================================" -ForegroundColor Cyan
Write-Host "   BACKUP AVANT MIGRATION PRISMA" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Erreur : Fichier .env introuvable" -ForegroundColor Red
    Write-Host "   Créez un fichier .env avec DIRECT_DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Charger les variables d'environnement
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$DATABASE_URL = $env:DIRECT_DATABASE_URL

if (-not $DATABASE_URL) {
    Write-Host "❌ Erreur : DIRECT_DATABASE_URL non trouvée dans .env" -ForegroundColor Red
    exit 1
}

# Créer le dossier backups s'il n'existe pas
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

# Nom du fichier de backup avec timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\backup_$timestamp.sql"

Write-Host "📊 Base de données : $($DATABASE_URL -replace ':[^@]+@', ':****@')" -ForegroundColor White
Write-Host ""

# Demander confirmation
Write-Host "⚠️  ATTENTION : Cette opération va créer un backup de la base de production" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Continuer ? (O/N)"

if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host ""
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "⏳ Création du backup en cours..." -ForegroundColor Yellow

try {
    # Vérifier si pg_dump est disponible
    $pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
    
    if (-not $pgDumpPath) {
        Write-Host "❌ Erreur : pg_dump non trouvé" -ForegroundColor Red
        Write-Host ""
        Write-Host "📝 Solutions :" -ForegroundColor Yellow
        Write-Host "   1. Installer PostgreSQL : https://www.postgresql.org/download/" -ForegroundColor White
        Write-Host "   2. Ou utiliser Vercel Dashboard > Storage > Postgres > Backups" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
    # Créer le backup
    $env:DATABASE_URL = $DATABASE_URL
    & pg_dump $DATABASE_URL > $backupFile
    
    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host ""
        Write-Host "✅ Backup créé avec succès !" -ForegroundColor Green
        Write-Host "   📁 Fichier : $backupFile" -ForegroundColor White
        Write-Host "   📊 Taille : $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
        Write-Host ""
        
        # Demander si on veut migrer maintenant
        Write-Host "🔄 Voulez-vous lancer la migration maintenant ? (O/N)" -ForegroundColor Cyan
        $migrate = Read-Host
        
        if ($migrate -eq "O" -or $migrate -eq "o") {
            Write-Host ""
            Write-Host "⏳ Migration en cours..." -ForegroundColor Yellow
            & npx prisma migrate deploy
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Migration terminée avec succès !" -ForegroundColor Green
                Write-Host ""
                Write-Host "📝 Prochaines étapes :" -ForegroundColor Cyan
                Write-Host "   1. Vérifier les données dans Prisma Studio : npx prisma studio" -ForegroundColor White
                Write-Host "   2. Tester l'application : pnpm dev:clean" -ForegroundColor White
                Write-Host "   3. Si tout est OK, commit et push" -ForegroundColor White
            } else {
                Write-Host ""
                Write-Host "❌ Erreur lors de la migration" -ForegroundColor Red
                Write-Host ""
                Write-Host "🔄 Pour restaurer le backup :" -ForegroundColor Yellow
                Write-Host "   psql `$env:DIRECT_DATABASE_URL < $backupFile" -ForegroundColor White
            }
        } else {
            Write-Host ""
            Write-Host "✅ Backup créé. Migration annulée." -ForegroundColor Green
            Write-Host ""
            Write-Host "📝 Pour migrer plus tard :" -ForegroundColor Cyan
            Write-Host "   npx prisma migrate deploy" -ForegroundColor White
        }
    } else {
        Write-Host ""
        Write-Host "❌ Erreur : Le fichier de backup n'a pas été créé" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors de la création du backup : $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔒 ====================================" -ForegroundColor Cyan
Write-Host ""
