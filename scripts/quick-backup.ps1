# Script PowerShell pour backup rapide de la base de données
# Usage: .\scripts\quick-backup.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "💾 Backup rapide de la base de données" -ForegroundColor Cyan
Write-Host ""

# Vérifier si .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Fichier .env introuvable" -ForegroundColor Red
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
    Write-Host "❌ DIRECT_DATABASE_URL non trouvée" -ForegroundColor Red
    exit 1
}

# Créer le dossier backups
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\backup_$timestamp.sql"

Write-Host "⏳ Création du backup..." -ForegroundColor Yellow

try {
    & pg_dump $DATABASE_URL > $backupFile
    
    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "✅ Backup créé : $backupFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erreur : $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
