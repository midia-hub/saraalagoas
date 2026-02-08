# Deploy do site Next.js para GitHub Pages (branch gh-pages)
# Uso: .\deploy-github-pages.ps1

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/midia-hub/saraalagoas.git"

Write-Host "=== Build do Next.js ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

if (-not (Test-Path "out")) {
    Write-Host "Erro: pasta 'out' nao encontrada." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Deploy para branch gh-pages ===" -ForegroundColor Cyan
Push-Location out

try {
    Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
    git init
    git add -A
    git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git branch -M gh-pages
    $hasOrigin = (git remote 2>$null) -match "origin"
    if ($hasOrigin) { git remote remove origin }
    git remote add origin $repoUrl
    git push -u origin gh-pages --force
    Write-Host "`nDeploy concluido! Site em: https://midia-hub.github.io/saraalagoas/" -ForegroundColor Green
} finally {
    Pop-Location
}
