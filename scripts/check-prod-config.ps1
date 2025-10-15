# Script PowerShell : Verification configuration production
# Usage : .\scripts\check-prod-config.ps1

param(
    [string]$url = "https://roadpress.superbien-works.fr"
)

Write-Host ""
Write-Host "[INFO] Verification de la configuration production" -ForegroundColor Cyan
Write-Host "URL cible : $url" -ForegroundColor Gray
Write-Host ""

# Test 1 : Verifier que l'URL est accessible
Write-Host "[1/3] Test connexion serveur..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Serveur accessible (HTTP $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "  [!] Reponse inattendue : HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERREUR] Impossible de joindre le serveur" -ForegroundColor Red
    Write-Host "  Details : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2 : Verifier la configuration des variables d'environnement
Write-Host "[2/3] Verification variables environnement..." -ForegroundColor Yellow
try {
    $envCheckUrl = "$url/api/env-check"
    $envResponse = Invoke-RestMethod -Uri $envCheckUrl -Method GET -TimeoutSec 10
    
    Write-Host "  Variables d'environnement :" -ForegroundColor White
    Write-Host "  ----------------------------------------" -ForegroundColor Gray
    
    $env = $envResponse.environment
    
    # NEXTAUTH_SECRET
    if ($env.hasNextAuthSecret -eq $true) {
        Write-Host "  [OK] NEXTAUTH_SECRET : Defini ($($env.nextAuthSecretLength) caracteres)" -ForegroundColor Green
        if ($env.nextAuthSecretLength -lt 32) {
            Write-Host "       [!] Longueur insuffisante (minimum 32 recommande)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [X] NEXTAUTH_SECRET : MANQUANT" -ForegroundColor Red
    }
    
    # NEXTAUTH_URL
    if ($env.nextAuthUrl -ne "NOT_SET") {
        Write-Host "  [OK] NEXTAUTH_URL : $($env.nextAuthUrl)" -ForegroundColor Green
        if ($env.nextAuthUrl -ne $url) {
            Write-Host "       [!] URL differente de celle testee !" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [X] NEXTAUTH_URL : MANQUANT" -ForegroundColor Red
    }
    
    # PRISMA_DATABASE_URL
    if ($env.hasPrismaDatabaseUrl -eq $true) {
        Write-Host "  [OK] PRISMA_DATABASE_URL : Defini" -ForegroundColor Green
    } else {
        Write-Host "  [X] PRISMA_DATABASE_URL : MANQUANT" -ForegroundColor Red
    }
    
    # DIRECT_DATABASE_URL
    if ($env.hasDirectDatabaseUrl -eq $true) {
        Write-Host "  [OK] DIRECT_DATABASE_URL : Defini" -ForegroundColor Green
    } else {
        Write-Host "  [X] DIRECT_DATABASE_URL : MANQUANT" -ForegroundColor Red
    }
    
    Write-Host "  ----------------------------------------" -ForegroundColor Gray
    
    # Verifier si toutes les variables critiques sont definies
    $allOk = $env.hasNextAuthSecret -and 
             ($env.nextAuthUrl -ne "NOT_SET") -and 
             $env.hasPrismaDatabaseUrl -and 
             $env.hasDirectDatabaseUrl
    
    if ($allOk) {
        Write-Host "  [OK] Toutes les variables critiques sont definies" -ForegroundColor Green
    } else {
        Write-Host "  [X] Certaines variables critiques sont manquantes" -ForegroundColor Red
    }
    
} catch {
    Write-Host "  [ERREUR] Impossible de verifier les variables" -ForegroundColor Red
    Write-Host "  Details : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Peut-etre que la route /api/env-check n'existe pas encore" -ForegroundColor Yellow
}

Write-Host ""

# Test 3 : Verifier l'acces a l'API Debug
Write-Host "[3/3] Verification acces API Debug..." -ForegroundColor Yellow
try {
    $debugUrl = "$url/api/debug/stats"
    $debugResponse = Invoke-WebRequest -Uri $debugUrl -Method GET -UseBasicParsing -TimeoutSec 10
    
    if ($debugResponse.StatusCode -eq 200) {
        Write-Host "  [OK] API Debug accessible (HTTP 200)" -ForegroundColor Green
    } elseif ($debugResponse.StatusCode -eq 401) {
        Write-Host "  [!] Authentification requise (HTTP 401)" -ForegroundColor Yellow
        Write-Host "      C'est normal si vous n'etes pas connecte" -ForegroundColor Gray
    } else {
        Write-Host "  [!] Reponse inattendue : HTTP $($debugResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 401) {
        Write-Host "  [!] Authentification requise (HTTP 401)" -ForegroundColor Yellow
        Write-Host "      C'est normal si vous n'etes pas connecte" -ForegroundColor Gray
    } elseif ($statusCode -eq 404) {
        Write-Host "  [X] Route non trouvee (HTTP 404)" -ForegroundColor Red
        Write-Host "      Probleme : Les routes API ne sont pas deployees correctement" -ForegroundColor Red
    } else {
        Write-Host "  [ERREUR] Erreur lors de l'acces a l'API Debug" -ForegroundColor Red
        Write-Host "  Details : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Gray
Write-Host ""
Write-Host "[RESUME] Recommandations :" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Si des variables sont manquantes :" -ForegroundColor White
Write-Host "   -> Aller dans Vercel Dashboard -> Settings -> Environment Variables" -ForegroundColor Gray
Write-Host "   -> Ajouter les variables manquantes" -ForegroundColor Gray
Write-Host "   -> Redeployer l'application" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Si HTTP 404 sur /api/debug/stats :" -ForegroundColor White
Write-Host "   -> Verifier que NEXTAUTH_SECRET est defini" -ForegroundColor Gray
Write-Host "   -> Se deconnecter puis reconnecter" -ForegroundColor Gray
Write-Host "   -> Vider le cache du navigateur" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Documentation complete :" -ForegroundColor White
Write-Host "   -> Voir RESOLUTION-404-PRODUCTION.md" -ForegroundColor Gray
Write-Host ""
Write-Host "[IMPORTANT] Desactivez /api/env-check apres debug (securite)" -ForegroundColor Yellow
Write-Host ""
