#!/bin/bash

# Script para configurar variáveis Meta na Vercel
# Uso: bash scripts/setup-vercel-meta.sh

echo "🚀 Configurando variáveis Meta na Vercel (saraalagoas.com)"
echo ""
echo "Este script vai adicionar as variáveis de ambiente necessárias"
echo "para a integração Meta no ambiente de Production da Vercel."
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está logado na Vercel
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI não encontrada!${NC}"
    echo "Instale com: npm i -g vercel"
    exit 1
fi

echo -e "${YELLOW}⚠️  Certifique-se de estar no diretório correto do projeto${NC}"
echo ""

# Confirmar antes de continuar
read -p "Deseja continuar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 1
fi

# Valores das variáveis
APP_ID="1475677427606585"
APP_SECRET="027eafd1b907a10ff5f0f91ee5165335"
REDIRECT_URI="https://saraalagoas.com/api/meta/oauth/callback"
SCOPES="pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,pages_manage_metadata,instagram_manage_messages"
STATE_SECRET="a7f8d9e2c4b1a6f5e8d7c3b2a9f1e4d8c6b5a3f2e1d9c8b7a6f5e4d3c2b1a0f9"

echo ""
echo "📝 Adicionando variáveis..."
echo ""

# Adicionar cada variável
echo "1/5 META_APP_ID..."
echo "$APP_ID" | vercel env add META_APP_ID production

echo "2/5 META_APP_SECRET..."
echo "$APP_SECRET" | vercel env add META_APP_SECRET production

echo "3/5 META_REDIRECT_URI..."
echo "$REDIRECT_URI" | vercel env add META_REDIRECT_URI production

echo "4/5 META_SCOPES..."
echo "$SCOPES" | vercel env add META_SCOPES production

echo "5/5 META_STATE_SECRET..."
echo "$STATE_SECRET" | vercel env add META_STATE_SECRET production

echo ""
echo -e "${GREEN}✅ Variáveis adicionadas com sucesso!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC} Você precisa fazer REDEPLOY para as variáveis ficarem ativas."
echo ""
echo "Opções para redeploy:"
echo "  1. Dashboard: Vercel → Deployments → ... → Redeploy"
echo "  2. CLI: vercel --prod"
echo ""

read -p "Deseja fazer redeploy agora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Fazendo deploy..."
    vercel --prod --yes
    echo ""
    echo -e "${GREEN}✅ Deploy concluído!${NC}"
    echo ""
    echo "Teste em: https://saraalagoas.com/admin/instancias"
else
    echo ""
    echo "Lembre-se de fazer redeploy manualmente!"
fi

echo ""
echo "📚 Veja VERCEL-DEPLOY-META.md para mais detalhes."
echo ""
