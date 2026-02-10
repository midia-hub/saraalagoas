# Script PowerShell para configurar variáveis Meta na Vercel
# Uso: .\scripts\setup-vercel-meta.ps1

Write-Host "🚀 Configurando variáveis Meta na Vercel (saraalagoas.com)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai adicionar as variáveis de ambiente necessárias"
Write-Host "para a integração Meta no ambiente de Production da Vercel."
Write-Host ""

# Verificar se Vercel CLI está instalada
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI não encontrada!" -ForegroundColor Red
    Write-Host "Instale com: npm i -g vercel"
    exit 1
}

Write-Host "⚠️  Certifique-se de estar no diretório correto do projeto" -ForegroundColor Yellow
Write-Host ""

# Confirmar antes de continuar
$confirm = Read-Host "Deseja continuar? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelado."
    exit 0
}

# Valores das variáveis
$APP_ID = "1475677427606585"
$APP_SECRET = "027eafd1b907a10ff5f0f91ee5165335"
$REDIRECT_URI = "https://saraalagoas.com/api/meta/oauth/callback"
$SCOPES = "pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages"
$STATE_SECRET = "a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9"

Write-Host ""
Write-Host "📝 Adicionando variáveis..." -ForegroundColor Cyan
Write-Host ""

# Função para adicionar variável
function Add-VercelEnv {
    param($Name, $Value, $Number, $Total)
    Write-Host "$Number/$Total $Name..." -ForegroundColor Gray
    $Value | vercel env add $Name production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Erro ao adicionar $Name (pode já existir)" -ForegroundColor Yellow
    }
}

# Adicionar cada variável
Add-VercelEnv "META_APP_ID" $APP_ID 1 5
Add-VercelEnv "META_APP_SECRET" $APP_SECRET 2 5
Add-VercelEnv "META_REDIRECT_URI" $REDIRECT_URI 3 5
Add-VercelEnv "META_SCOPES" $SCOPES 4 5
Add-VercelEnv "META_STATE_SECRET" $STATE_SECRET 5 5

Write-Host ""
Write-Host "✅ Processo concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Você precisa fazer REDEPLOY para as variáveis ficarem ativas." -ForegroundColor Yellow
Write-Host ""
Write-Host "Opções para redeploy:"
Write-Host "  1. Dashboard: Vercel → Deployments → ... → Redeploy"
Write-Host "  2. CLI: vercel --prod"
Write-Host ""

$redeploy = Read-Host "Deseja fazer redeploy agora? (y/n)"
if ($redeploy -eq "y" -or $redeploy -eq "Y") {
    Write-Host ""
    Write-Host "🚀 Fazendo deploy..." -ForegroundColor Cyan
    vercel --prod --yes
    Write-Host ""
    Write-Host "✅ Deploy concluído!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Teste em: https://saraalagoas.com/admin/instancias" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Lembre-se de fazer redeploy manualmente!"
}

Write-Host ""
Write-Host "📚 Veja VERCEL-DEPLOY-META.md para mais detalhes." -ForegroundColor Cyan
Write-Host ""
