# Script PowerShell pour restaurer une base de données depuis un backup
# Usage: .\scripts\restore-backup.ps1

param(
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🔄 ====================================" -ForegroundColor Cyan
Write-Host "   RESTAURATION DEPUIS BACKUP" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Erreur : Fichier .env introuvable" -ForegroundColor Red
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

# Si aucun fichier spécifié, lister les backups disponibles
if (-not $BackupFile) {
    Write-Host "📁 Backups disponibles :" -ForegroundColor Cyan
    Write-Host ""
    
    if (Test-Path "backups") {
        $backups = Get-ChildItem -Path "backups" -Filter "*.sql" | Sort-Object LastWriteTime -Descending
        
        if ($backups.Count -eq 0) {
            Write-Host "❌ Aucun backup trouvé dans le dossier 'backups'" -ForegroundColor Red
            Write-Host ""
            Write-Host "💡 Pour créer un backup :" -ForegroundColor Yellow
            Write-Host "   pnpm db:backup" -ForegroundColor White
            exit 1
        }
        
        $i = 1
        foreach ($backup in $backups) {
            $size = [math]::Round($backup.Length / 1MB, 2)
            $date = $backup.LastWriteTime.ToString("dd/MM/yyyy HH:mm:ss")
            Write-Host "   $i. $($backup.Name)" -ForegroundColor White
            Write-Host "      📅 $date | 📊 $size MB" -ForegroundColor Gray
            Write-Host ""
            $i++
        }
        
        Write-Host ""
        $selection = Read-Host "Sélectionnez un backup (1-$($backups.Count)) ou Q pour quitter"
        
        if ($selection -eq "Q" -or $selection -eq "q") {
            Write-Host ""
            Write-Host "❌ Opération annulée" -ForegroundColor Red
            exit 0
        }
        
        $index = [int]$selection - 1
        if ($index -lt 0 -or $index -ge $backups.Count) {
            Write-Host ""
            Write-Host "❌ Sélection invalide" -ForegroundColor Red
            exit 1
        }
        
        $BackupFile = $backups[$index].FullName
    } else {
        Write-Host "❌ Dossier 'backups' introuvable" -ForegroundColor Red
        exit 1
    }
}

# Vérifier que le fichier existe
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Erreur : Fichier de backup introuvable : $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⚠️  ATTENTION : Cette opération va ÉCRASER toutes les données actuelles !" -ForegroundColor Red
Write-Host ""
Write-Host "📁 Backup sélectionné : $BackupFile" -ForegroundColor White
Write-Host "📊 Base de données : $($DATABASE_URL -replace ':[^@]+@', ':****@')" -ForegroundColor White
Write-Host ""

# Triple confirmation
Write-Host "⚠️  Êtes-vous ABSOLUMENT SÛR de vouloir restaurer ce backup ? (O/N)" -ForegroundColor Yellow
$confirmation1 = Read-Host

if ($confirmation1 -ne "O" -and $confirmation1 -ne "o") {
    Write-Host ""
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "⚠️  Dernière confirmation : tapez 'RESTAURER' pour continuer" -ForegroundColor Red
$confirmation2 = Read-Host

if ($confirmation2 -ne "RESTAURER") {
    Write-Host ""
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "⏳ Restauration en cours..." -ForegroundColor Yellow
Write-Host ""

try {
    # Vérifier si psql est disponible
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if (-not $psqlPath) {
        Write-Host "❌ Erreur : psql non trouvé" -ForegroundColor Red
        Write-Host ""
        Write-Host "📝 Installer PostgreSQL : https://www.postgresql.org/download/" -ForegroundColor Yellow
        exit 1
    }
    
    # Restaurer le backup
    $env:DATABASE_URL = $DATABASE_URL
    Get-Content $BackupFile | & psql $DATABASE_URL
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Restauration terminée avec succès !" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Prochaines étapes :" -ForegroundColor Cyan
        Write-Host "   1. Vérifier les données : pnpm db:studio" -ForegroundColor White
        Write-Host "   2. Tester l'application : pnpm dev:clean" -ForegroundColor White
        Write-Host "   3. Créer un nouveau backup : pnpm db:backup" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Erreur lors de la restauration" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Vérifiez :" -ForegroundColor Yellow
        Write-Host "   - La connexion à la base de données" -ForegroundColor White
        Write-Host "   - Les permissions sur la base" -ForegroundColor White
        Write-Host "   - Le format du fichier de backup" -ForegroundColor White
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors de la restauration : $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 ====================================" -ForegroundColor Cyan
Write-Host ""
