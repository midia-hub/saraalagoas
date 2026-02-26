# Sara Nossa Terra Alagoas - Plataforma de Gestão

Plataforma completa de gestão para igrejas com módulos de consolidação, livraria, células, galeria e redes sociais.

## 🚀 Tecnologias

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Backend**: Supabase (Auth + Postgres + Storage)
- **Integrações**: Google Drive, Meta (Instagram/Facebook), Mercado Pago

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta Supabase (https://supabase.com)
- Conta Google Cloud (para Drive API)
- Conta Meta Developer (opcional - para Instagram)
- Conta Mercado Pago (opcional - para PDV)

## 🛠️ Instalação e Desenvolvimento

```bash
# Clone o repositório
git clone <seu-repositorio>
cd midia_igreja

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Execute as migrações do Supabase (na ordem)
supabase db push
# Ou manualmente via SQL Editor do Supabase Dashboard:
# 001_base_schema.sql
# 002_consolidacao_module.sql
# 003_livraria_module.sql
# 004_gallery_social_module.sql
# 005_auxiliary_modules.sql
# Documentação completa: supabase/migrations/README.md

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**

## 🗄️ Banco de Dados (Migrations)

O projeto utiliza **5 migrações consolidadas** que devem ser executadas na ordem:

1. **001_base_schema.sql** - People, Profiles, RBAC (40+ tabelas base)
2. **002_consolidacao_module.sql** - Conversões, Células, Churches, Teams
3. **003_livraria_module.sql** - Produtos, Estoque, Vendas, MercadoPago
4. **004_gallery_social_module.sql** - Galeria, Instagram, Meta, Social Posts
5. **005_auxiliary_modules.sql** - XP26, Site Config, Ofertas, Oração

**Executar via CLI:**
```bash
supabase db push
```

**Ou via Script PowerShell:**
```bash
.\scripts\run-migrations.ps1
```

**Documentação completa:** [supabase/migrations/README.md](supabase/migrations/README.md)

✅ As 52 migrações antigas foram arquivadas em `supabase/migrations/_old/`

## 📦 Deploy na Vercel

### Preparação

1. Faça push do código para o GitHub
2. Certifique-se de que `.env` está no `.gitignore`
3. Minifique o JSON do Google Service Account em uma linha

### Deploy Automático

1. Acesse https://vercel.com
2. Importe seu repositório do GitHub
3. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (minificado)
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
   - `NEXT_PUBLIC_APP_URL` (seu domínio Vercel)

### Configurações Importantes

- ✅ Build ignora erros TypeScript temporários (`next.config.js`)
- ✅ Otimização de imagens habilitada
- ✅ Middleware de autenticação ativo
- ✅ RLS (Row Level Security) no Supabase

## ⚙️ Configuração

1. **Dados do site:** edite `config/site.ts` (WhatsApp, redes sociais, endereço, textos).
2. **Variáveis de ambiente**: copie `.env.example` para `.env.local` e preencha as credenciais.
3. **Migrations**: execute os arquivos de `supabase/migrations/` no SQL Editor do Supabase.
4. **Permissões**: acesse `/admin/roles` para configurar o sistema RBAC.

## 📚 Módulos da Plataforma

### 📊 Dashboard
- Visão geral da plataforma
- Indicadores e métricas principais

### 👥 Consolidação
- **Cadastro de conversões** com formulário completo
- **Lista de convertidos** com gráficos
- **Envio de convites** para cadastro com pré-preenchimento automático
- **Gestão** de igrejas, arenas, células e equipes
- **API de Disparos** para mensagens automatizadas

### 📚 Livraria (PDV)
- **Ponto de venda** integrado com Mercado Pago
- **Gestão de produtos** com fotos e código de barras
- **Controle de estoque** com movimentações
- **Controle de fiado** e cupons de desconto
- **Relatórios e BI** completos

### 🙏 Células
- Gerenciamento de células
- Dashboard com métricas
- Controle de PD (Plano de Discipulado)

### 🖼️ Mídia e Social
- **Galeria** de fotos integrada com Google Drive
- **Publicação no Instagram** com agendamento
- **Upload de arquivos** com preview
- **Colaboradores** do Instagram

### 🔐 Cadastros
- **Pessoas** (cadastro central unificado)
- **Liderança** e hierarquia
- **Envio de convites** com magic link
- **Pré-preenchimento automático** de dados da conversão

### ⚙️ Configurações
- **Ajustes do Site** (informações institucionais)
- **Gerenciar Permissões** (sistema RBAC completo)
- **API de Disparos** (webhook de mensagens)
- **Mensagens de Conversão** (templates personalizados)

## 🔑 Rotas do Painel Admin

- **Login**: `/admin/login` - Magic link e redefinição de senha
- **Dashboard**: `/admin` - Visão geral
- **Pessoas**: `/admin/pessoas` - Cadastro central com envio de convites
- **Consolidação**: `/admin/consolidacao/conversoes` - Formulário e lista
- **Livraria**: `/admin/livraria/*` - PDV, produtos, estoque, BI
- **Células**: `/admin/celulas` - Gestão e dashboard
- **Mídia**: `/admin/galeria`, `/admin/upload` - Google Drive
- **Instagram**: `/admin/instagram/posts` - Publicações e agendamento
- **Configurações**: `/admin/configuracoes`, `/admin/roles` - RBAC

## 📖 Documentação Completa

> ⚠️ **OBRIGATÓRIO — Design System:** antes de criar ou editar qualquer componente de UI, formulário ou tela, consulte **[`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)**. Ele define os padrões canônicos de dropdowns, campos de data/hora, inputs, labels, botões e tokens de cor da plataforma.

Para informações detalhadas sobre arquitetura, APIs, banco de dados e fluxos:

- [**🎨 Design System (obrigatório)**](docs/DESIGN-SYSTEM.md) - Padrões de UI: selects, datas, inputs, botões, tokens
- [**Documentação da Plataforma**](DOCUMENTACAO_PLATAFORMA.md) - Referência completa
- [Mercado Pago - Produção](docs/MERCADOPAGO-PRODUCAO.md)
- [Webhook Mercado Pago com ngrok](docs/MERCADOPAGO-WEBHOOK-NGROK.md)
- [Como Subir em Produção](docs/SUBIR-EM-PRODUCAO.md)

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor de desenvolvimento
npm run dev:clean        # Limpar cache e iniciar dev

# Produção
npm run build            # Build para produção
npm run start            # Iniciar servidor de produção

# Utilitários
npm run lint             # Executar ESLint
npm run upload:imagens   # Script auxiliar de upload
npm run ngrok            # Túnel HTTP para webhooks locais
```

## 🐛 Troubleshooting

### Build com erro TypeScript
O projeto está configurado para ignorar erros TS durante build. Para corrigir:
```bash
npm run lint
npx tsc --noEmit
```

### Erro 404 nas imagens
- Verifique `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- Verifique permissões da Service Account no Drive
- Certifique-se que `GOOGLE_SERVICE_ACCOUNT_JSON` está minificado

### Erro de autenticação Supabase
- Verifique URLs e keys do Supabase
- Execute todas as migrations em ordem
- Verifique RLS no painel do Supabase

## 🔒 Segurança

- ✅ Credenciais no `.gitignore`
- ✅ RLS habilitado no Supabase
- ✅ Middleware de autenticação
- ✅ Sistema RBAC completo
- ✅ Service Account Keys protegidas

## 📝 Licença

Proprietary - Sara Nossa Terra Alagoas

---

**Última atualização**: 19 de fevereiro de 2026  
**Versão**: 1.0.0


- **Login:** `/admin/login` — modais **Primeiro login** (magic link) e **Redefinir senha**. Páginas: `/admin/criar-acesso`, `/admin/reset-senha`, `/admin/completar-cadastro`.
- **Início:** `/admin` · **Ajustes do site:** `/admin/configuracoes`
- **Pessoas / Usuários / Permissões:** `/admin/pessoas`, `/admin/usuarios`, `/admin/roles`
- **Mídia:** `/admin/upload` (fluxo em 3 etapas), `/admin/galeria` (álbuns e fotos via Google Drive).
- **Consolidação:** `/admin/consolidacao/conversoes` (formulário de conversão), `/admin/consolidacao/lista` (lista de convertidos), `/admin/consolidacao/cadastros` (igrejas, arenas, células, equipes, pessoas; API de disparos; mensagens de conversão).
- **Livraria:** `/admin/livraria/produtos` (cadastro com fotos, código de barras, desconto, estoque), `/admin/livraria/estoque`, `/admin/livraria/movimentacoes`, `/admin/livraria/importacao`, `/admin/livraria/dashboard`.
- **Instagram/Meta:** `/admin/instancias` (conectar contas), `/admin/instagram/posts` (publicações), `/admin/instagram/collaboration` (convites).

### Fluxo de publicação (Instagram/Facebook)

1. Em **Galeria**, abra um álbum e clique em **Criar post**.
2. Em **Seleção de fotos**, escolha as imagens (até 10 para Instagram).
3. Em **Criar post**, edite as fotos (crop, ordem), escreva o texto, escolha a conta e os destinos (Instagram e/ou Facebook).
4. Escolha **Publicar agora** ou **Programar postagem** (data e hora).
5. Após publicar (ou programar), você é redirecionado ao **Painel de publicações**.

### Postagens programadas

- Na tela de criar post, use **Programar postagem** e defina data/hora.
- As programadas aparecem no **Painel de publicações** (seção “Postagens programadas”).
- **Processar fila agora** no painel dispara a publicação das programadas em atraso.
- Para publicação automática no horário: configure um cron (ex.: Vercel Cron) chamando `POST /api/social/run-scheduled` com header `x-cron-secret: <CRON_SECRET>`. Defina `CRON_SECRET` nas variáveis de ambiente.

### Consolidação e API de disparos

- Em **Cadastros** (Consolidação) estão: Igrejas, Arenas, Células, Equipes, Pessoas; **API de disparos** (ativação e log); **Mensagens de conversão**.
- Se a API de disparos estiver ativa e `DISPAROS_WEBHOOK_URL` / `DISPAROS_WEBHOOK_BEARER` definidos, ao finalizar o formulário de conversão (público ou admin) o sistema chama o webhook com telefone (prefixo 55), nome e `message_id` (aceitou/reconciliou).

### Módulo Livraria

- **Produtos:** cadastro com múltiplas fotos (enviar ou câmera), código de barras (digitar ou ler com câmera), categoria digitável (cria nova se não existir), desconto (valor ou %), estoque inicial/ajuste no próprio formulário. SKU opcional (gerado automaticamente se vazio).
- **Estoque:** movimentação individual (entrada/saída) e atualização em lote (manual ou XLSX).
- **Movimentações:** histórico de entradas e saídas com filtros (data, tipo).
- **Importação/Exportação:** modelos XLSX para produtos e estoque; exportação de produtos, movimentações e estoque baixo.
- **Dashboard:** indicadores (produtos ativos, estoque baixo, entradas/saídas/perdas nos últimos 30 dias) e listas (movimentações por dia, top produtos, estoque baixo, perdas).

## Scripts

| Comando        | Descrição                    |
|----------------|------------------------------|
| `npm run dev`  | Desenvolvimento              |
| `npm run build`| Build para produção          |
| `npm run start`| Rodar build de produção      |
| `npm run lint` | Verificar código             |

## Estrutura principal

```
├── app/                    # Next.js App Router
│   ├── admin/             # Painel (configurações, pessoas, usuários, roles, mídia,
│   │                       # consolidação, livraria, Instagram/Meta)
│   │   └── livraria/       # Produtos, estoque, movimentações, importação, dashboard
│   └── api/                # Rotas API (admin, public, gallery, meta, social)
├── components/             # Componentes React
├── config/                 # Dados do site (site.ts)
├── lib/                    # Utilitários (admin-client, rbac, storage-url, disparos-webhook, etc.)
├── public/                 # Imagens e estáticos
└── supabase/               # Migrations e email-templates
```

## Variáveis de ambiente (resumo)

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Google Drive (galeria/upload):** `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (ou credenciais alternativas)
- **Meta (Instagram/Facebook):** `META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_META_REDIRECT_URI` (ou `META_REDIRECT_URI` em dev)
- **Postagens programadas:** `CRON_SECRET` — para o cron que chama `POST /api/social/run-scheduled`
- **API de disparos (consolidação):** `DISPAROS_WEBHOOK_URL`, `DISPAROS_WEBHOOK_BEARER` — opcional; ativado em Cadastros → API de disparos

Consulte `.env.example` para a lista completa.

## Git (primeiro push)

O projeto já está pronto para versionamento. **Nunca commite** o arquivo `.env` (ele está no `.gitignore`).

```bash
git init
git add .
git status   # confira: .env não deve aparecer
git commit -m "chore: estado inicial do projeto"
git remote add origin <URL_DO_SEU_REPOSITORIO>
git branch -M main
git push -u origin main
```

Antes do primeiro push, confira que variáveis sensíveis (Supabase, Meta, Google) estão apenas em `.env` e que `.env` está ignorado.

## Deploy (Vercel)

Configure no painel da Vercel (Settings → Environment Variables) as variáveis necessárias:

- **Supabase:** URL, anon key e service role key.
- **Galeria (Google Drive):** `GOOGLE_DRIVE_ROOT_FOLDER_ID` e `GOOGLE_SERVICE_ACCOUNT_JSON`. Sem elas, `/api/gallery/image` pode retornar 503.
- **Meta (Instagram/Facebook):** `META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_META_REDIRECT_URI`.
- **Postagens programadas:** `CRON_SECRET` e Cron Job para `POST /api/social/run-scheduled` com header `x-cron-secret`.
- **API de disparos (opcional):** `DISPAROS_WEBHOOK_URL`, `DISPAROS_WEBHOOK_BEARER` para webhook da consolidação.

## Documentação adicional

- **🎨 Design System (obrigatório para UI):** [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) — padrões canônicos de dropdowns, datas, inputs, labels, botões e tokens de cor.
- **Documentação geral da plataforma:** `DOCUMENTACAO_PLATAFORMA.md` — funcionalidades, páginas, APIs, tabelas do banco, bibliotecas (quando são chamadas), fluxos (conversão, publicação Meta, livraria) e variáveis de ambiente.
- **Menu admin:** configuração em `app/admin/menu-config.ts` (módulos: Principal, Usuários, Mídia, Consolidação, Livraria, Instagram). Permissões e RBAC em `lib/rbac.ts`.
- **Templates de e-mail:** `supabase/email-templates/README.md`.

## Licença

© Sara Sede Alagoas. Todos os direitos reservados.
