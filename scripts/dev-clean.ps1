# Script pour tuer les processus Node et libérer les ports
Write-Host " Arrêt des processus Node..." -ForegroundColor Yellow

# Tuer tous les processus node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Attendre un peu
Start-Sleep -Seconds 1

Write-Host " Ports libérés, démarrage du serveur..." -ForegroundColor Green
Write-Host ""

# Lancer le serveur de dev
& pnpm dev
