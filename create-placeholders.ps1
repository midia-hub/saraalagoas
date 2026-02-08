# Script PowerShell para criar placeholders de imagens
# Sara Sede Alagoas

Write-Host "Criando estrutura de pastas e placeholders de imagens..." -ForegroundColor Cyan

# Criar estrutura de pastas
$folders = @(
    "public\brand",
    "public\leadership",
    "public\revisao",
    "public\kids"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -Path $folder -ItemType Directory -Force | Out-Null
        Write-Host "Pasta criada: $folder" -ForegroundColor Green
    } else {
        Write-Host "Pasta ja existe: $folder" -ForegroundColor Yellow
    }
}

# Funcao para criar arquivo placeholder
function New-PlaceholderImage {
    param (
        [string]$Path,
        [string]$Description
    )
    
    $content = @"
=====================================
PLACEHOLDER DE IMAGEM
=====================================

Arquivo: $Path
Descricao: $Description

INSTRUCOES:
1. Substitua este arquivo pela imagem real
2. Mantenha o mesmo nome do arquivo
3. Use formato JPG, PNG ou WebP
4. Otimize a imagem antes de usar

Consulte IMAGENS.md para mais detalhes.
=====================================
"@
    
    $content | Out-File -FilePath $Path -Encoding UTF8
    Write-Host "Placeholder criado: $Path" -ForegroundColor Green
}

# Criar placeholders

Write-Host "`nCriando placeholders de imagens..." -ForegroundColor Cyan

# Logo
New-PlaceholderImage -Path "public\brand\logo.png" -Description "Logo da Sara Sede Alagoas (400x150px recomendado)"

# Hero
New-PlaceholderImage -Path "public\hero.jpg" -Description "Banner principal da primeira secao (1920x1080px recomendado)"

# Lideranca
New-PlaceholderImage -Path "public\leadership\frank.jpg" -Description "Foto do Bispo Frank Guimaraes (800x800px quadrada)"
New-PlaceholderImage -Path "public\leadership\betania.jpg" -Description "Foto da Bispa Betania Guimaraes (800x800px quadrada)"

# Revisao/Imersao
for ($i = 1; $i -le 6; $i++) {
    New-PlaceholderImage -Path "public\revisao\photo-$i.jpg" -Description "Foto $i da Revisao/Imersao (800x800px quadrada)"
}

# Kids
New-PlaceholderImage -Path "public\kids\photo-1.jpg" -Description "Foto 1 do Sara Kids (800x800px quadrada)"
New-PlaceholderImage -Path "public\kids\photo-2.jpg" -Description "Foto 2 do Sara Kids (800x800px quadrada)"

# Favicon
$faviconContent = @"
=====================================
PLACEHOLDER DE FAVICON
=====================================

INSTRUCOES:
1. Crie um favicon.svg, favicon.ico ou favicon.png
2. Dimensoes: 32x32px (ou SVG vetorial)
3. Use o logo simplificado
4. Deve ser legivel em tamanho pequeno

Ferramentas recomendadas:
- https://favicon.io/
- https://realfavicongenerator.net/
=====================================
"@
$faviconContent | Out-File -FilePath "public\favicon.svg" -Encoding UTF8
Write-Host "Placeholder criado: public\favicon.svg" -ForegroundColor Green

Write-Host "`nEstrutura de placeholders criada com sucesso!" -ForegroundColor Green
Write-Host "`nProximos passos:" -ForegroundColor Yellow
Write-Host "1. Consulte o arquivo IMAGENS.md para ver todas as imagens necessarias"
Write-Host "2. Substitua os placeholders pelas imagens reais"
Write-Host "3. Mantenha os mesmos nomes dos arquivos"
Write-Host "4. Otimize as imagens antes de usar"
Write-Host "`nDica: Use TinyPNG (tinypng.com) para otimizar suas imagens" -ForegroundColor Cyan
Write-Host ""
