# Script para executar migrações do Supabase
# Execute este script da raiz do projeto

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXECUTANDO MIGRAÇÕES DO SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está instalado
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale com: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "Ou: scoop install supabase" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Supabase CLI encontrado: $($supabaseCli.Version)" -ForegroundColor Green
Write-Host ""

# Lista de migrações na ordem
$migrations = @(
    "001_base_schema.sql",
    "002_consolidacao_module.sql",
    "003_livraria_module.sql",
    "004_gallery_social_module.sql",
    "005_auxiliary_modules.sql"
)

# Diretório de migrações
$migrationsDir = "supabase\migrations"

# Verificar se todas as migrações existem
Write-Host "📋 Verificando arquivos de migração..." -ForegroundColor Yellow
$allExist = $true

foreach ($migration in $migrations) {
    $filePath = Join-Path $migrationsDir $migration
    if (Test-Path $filePath) {
        Write-Host "  ✓ $migration" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $migration (NÃO ENCONTRADO)" -ForegroundColor Red
        $allExist = $false
    }
}

Write-Host ""

if (-not $allExist) {
    Write-Host "❌ Algumas migrações não foram encontradas!" -ForegroundColor Red
    exit 1
}

# Perguntar confirmação
Write-Host "⚠️  ATENÇÃO: Este script executará 5 migrações no banco de dados." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Deseja continuar? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXECUTANDO MIGRAÇÕES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalMigrations = $migrations.Count
$currentMigration = 0
$successCount = 0
$errorCount = 0

foreach ($migration in $migrations) {
    $currentMigration++
    $filePath = Join-Path $migrationsDir $migration
    
    Write-Host "[$currentMigration/$totalMigrations] Executando: $migration" -ForegroundColor Cyan
    Write-Host "Arquivo: $filePath" -ForegroundColor Gray
    
    try {
        # Executar migração
        supabase db execute --file $filePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Sucesso!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ❌ Erro ao executar migração!" -ForegroundColor Red
            $errorCount++
        }
    }
    catch {
        Write-Host "  ❌ Erro: $_" -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

# Resumo
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DA EXECUÇÃO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total de migrações: $totalMigrations" -ForegroundColor White
Write-Host "Sucesso: $successCount" -ForegroundColor Green
Write-Host "Erros: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "🎉 Todas as migrações foram executadas com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Verifique as tabelas criadas no Supabase Dashboard" -ForegroundColor White
    Write-Host "  2. Crie o primeiro usuário admin" -ForegroundColor White
    Write-Host "  3. Configure as permissões RBAC" -ForegroundColor White
    Write-Host "  4. Execute o sistema: npm run dev" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  Algumas migrações falharam. Verifique os erros acima." -ForegroundColor Red
    Write-Host ""
    exit 1
}
