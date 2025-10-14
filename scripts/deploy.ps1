# Script de déploiement automatique Vercel
# Évite l'erreur P6001 Prisma en production

# 1. Vérifier le build local
Write-Host "🏗️ Vérification du build local..." -ForegroundColor Yellow
pnpm build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build local. Arrêt du déploiement." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build local réussi !" -ForegroundColor Green

# 2. Vérifier que Vercel CLI est installé
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "⚠️ Vercel CLI non trouvé. Installation..." -ForegroundColor Yellow
    npm install -g vercel
}

# 3. Déploiement
Write-Host "🚀 Déploiement vers Vercel..." -ForegroundColor Yellow
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Déploiement réussi !" -ForegroundColor Green
    Write-Host "" 
    Write-Host "📋 Points à vérifier après déploiement :" -ForegroundColor Cyan
    Write-Host "1. Dashboard : https://votre-app.vercel.app/dashboard" -ForegroundColor White
    Write-Host "2. SMS Pricing : https://votre-app.vercel.app/sms-pricing" -ForegroundColor White
    Write-Host "3. Variables d'env : Vercel Dashboard > Settings > Environment Variables" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Si erreur P6001 :" -ForegroundColor Yellow
    Write-Host "- Vérifier que DATABASE_URL existe dans Vercel" -ForegroundColor White
    Write-Host "- Voir docs/DEPLOYMENT-VERCEL.md" -ForegroundColor White
} else {
    Write-Host "❌ Échec du déploiement. Vérifiez les logs Vercel." -ForegroundColor Red
    exit 1
}