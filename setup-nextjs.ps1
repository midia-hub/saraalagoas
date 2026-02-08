# Script para configurar o projeto Next.js
# Sara Sede Alagoas

Write-Host "Configurando projeto Next.js..." -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe backup
if (Test-Path "package.json.vite-backup") {
    Write-Host "Backup do projeto Vite ja existe." -ForegroundColor Yellow
} else {
    # Fazer backup do package.json do Vite
    Write-Host "Fazendo backup do projeto Vite..." -ForegroundColor Green
    Copy-Item "package.json" "package.json.vite-backup"
    Write-Host "Backup criado: package.json.vite-backup" -ForegroundColor Green
}

Write-Host ""

# Substituir pelo package.json do Next.js
Write-Host "Configurando package.json do Next.js..." -ForegroundColor Cyan
Copy-Item "package-nextjs.json" "package.json" -Force
Write-Host "package.json atualizado!" -ForegroundColor Green

Write-Host ""

# Remover node_modules antigo
Write-Host "Removendo dependencias antigas..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force
    Write-Host "node_modules removido" -ForegroundColor Green
}

if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "package-lock.json removido" -ForegroundColor Green
}

Write-Host ""

# Instalar dependências do Next.js
Write-Host "Instalando dependencias do Next.js..." -ForegroundColor Cyan
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

npm install

Write-Host ""
Write-Host "Configuracao concluida!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Configure seus dados em: config/site.ts" -ForegroundColor White
Write-Host "2. Adicione suas imagens em: public/" -ForegroundColor White
Write-Host "3. Execute: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Para voltar ao projeto Vite:" -ForegroundColor Cyan
Write-Host "  Restaure: package.json.vite-backup" -ForegroundColor White
Write-Host ""
