# Script PowerShell pour backup automatique avant migration Prisma
# Usage: 
#   .\scripts\migrate-with-backup.ps1 dev      # Pour dev local
#   .\scripts\migrate-with-backup.ps1 prod     # Pour production

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Environment
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🔒 ====================================" -ForegroundColor Cyan
Write-Host "   MIGRATION PRISMA SÉCURISÉE" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Déterminer l'environnement
if ($Environment -eq "dev") {
    $envLabel = "DÉVELOPPEMENT (LOCAL)"
    $envColor = "Green"
    $envFile = ".env.local"
} else {
    $envLabel = "PRODUCTION"
    $envColor = "Red"
    $envFile = ".env"
}

Write-Host "🌍 Environnement : $envLabel" -ForegroundColor $envColor
Write-Host ""

# Vérifier si le fichier .env existe
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Erreur : Fichier $envFile introuvable" -ForegroundColor Red
    Write-Host ""
    if ($Environment -eq "dev") {
        Write-Host "💡 Pour le développement local :" -ForegroundColor Yellow
        Write-Host "   1. Copiez .env.example vers .env.local" -ForegroundColor White
        Write-Host "   2. Configurez DATABASE_URL avec votre base locale" -ForegroundColor White
    } else {
        Write-Host "💡 Pour la production :" -ForegroundColor Yellow
        Write-Host "   1. Créez un fichier .env avec DIRECT_DATABASE_URL" -ForegroundColor White
        Write-Host "   2. Utilisez les credentials de production" -ForegroundColor White
    }
    exit 1
}

# Charger les variables d'environnement
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Déterminer quelle URL utiliser
if ($Environment -eq "dev") {
    $DATABASE_URL = $env:DATABASE_URL
    if (-not $DATABASE_URL) {
        Write-Host "❌ Erreur : DATABASE_URL non trouvée dans $envFile" -ForegroundColor Red
        exit 1
    }
} else {
    $DATABASE_URL = $env:DIRECT_DATABASE_URL
    if (-not $DATABASE_URL) {
        Write-Host "❌ Erreur : DIRECT_DATABASE_URL non trouvée dans $envFile" -ForegroundColor Red
        exit 1
    }
}

# Créer le dossier backups s'il n'existe pas
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

# Créer un sous-dossier pour l'environnement
$backupDir = "backups\$Environment"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Nom du fichier de backup avec timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\backup_${Environment}_$timestamp.sql"

Write-Host "📊 Base de données : $($DATABASE_URL -replace ':[^@]+@', ':****@')" -ForegroundColor White
Write-Host "📁 Backup sera sauvegardé dans : $backupFile" -ForegroundColor White
Write-Host ""

# Confirmation
if ($Environment -eq "prod") {
    Write-Host "⚠️  ATTENTION : Cette opération va créer un backup de la base de PRODUCTION" -ForegroundColor Red
} else {
    Write-Host "✅ Cette opération va créer un backup de la base de DÉVELOPPEMENT" -ForegroundColor Yellow
}
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
        Write-Host "   2. Ou utiliser Vercel Dashboard > Storage > Postgres > Backups (prod)" -ForegroundColor White
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
            Write-Host ""
            
            if ($Environment -eq "dev") {
                # Migration dev (interactive)
                $migrationName = Read-Host "Nom de la migration (ex: add_new_field)"
                if ($migrationName) {
                    & npx prisma migrate dev --name $migrationName
                } else {
                    & npx prisma migrate dev
                }
            } else {
                # Migration prod (deploy)
                & npx prisma migrate deploy
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Migration terminée avec succès !" -ForegroundColor Green
                Write-Host ""
                Write-Host "📝 Prochaines étapes :" -ForegroundColor Cyan
                Write-Host "   1. Vérifier les données dans Prisma Studio : pnpm db:studio" -ForegroundColor White
                if ($Environment -eq "dev") {
                    Write-Host "   2. Tester l'application : pnpm dev:clean" -ForegroundColor White
                    Write-Host "   3. Si tout est OK, migrer en prod : pnpm db:migrate:prod" -ForegroundColor White
                } else {
                    Write-Host "   2. Tester l'application en production" -ForegroundColor White
                    Write-Host "   3. Si tout est OK, commit et push le code" -ForegroundColor White
                }
            } else {
                Write-Host ""
                Write-Host "❌ Erreur lors de la migration" -ForegroundColor Red
                Write-Host ""
                Write-Host "🔄 Pour restaurer le backup :" -ForegroundColor Yellow
                Write-Host "   pnpm db:restore" -ForegroundColor White
                Write-Host ""
                Write-Host "Ou manuellement :" -ForegroundColor Yellow
                Write-Host "   psql `$env:DATABASE_URL < $backupFile" -ForegroundColor White
            }
        } else {
            Write-Host ""
            Write-Host "✅ Backup créé. Migration annulée." -ForegroundColor Green
            Write-Host ""
            Write-Host "📝 Pour migrer plus tard :" -ForegroundColor Cyan
            if ($Environment -eq "dev") {
                Write-Host "   pnpm db:migrate" -ForegroundColor White
            } else {
                Write-Host "   npx prisma migrate deploy" -ForegroundColor White
            }
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
