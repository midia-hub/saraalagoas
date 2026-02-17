# Sara Sede Alagoas - Site Institucional

Site institucional da Igreja Sara Nossa Terra - Sede Alagoas. Next.js 14, TypeScript e TailwindCSS.

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Supabase (auth, storage, banco)
- Lucide React (ícones)
- Integração Meta (Instagram e Facebook) para publicações

## Como rodar

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000**

## Configuração

1. **Dados do site:** edite `config/site.ts` (WhatsApp, redes sociais, endereço, textos).
2. **Variáveis de ambiente:** copie `.env.example` para `.env` e preencha (Supabase, Meta, Google, etc.).

## Painel administrativo

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

- **Documentação geral da plataforma:** `DOCUMENTACAO_PLATAFORMA.md` — funcionalidades, páginas, APIs, tabelas do banco, bibliotecas (quando são chamadas), fluxos (conversão, publicação Meta, livraria) e variáveis de ambiente.
- **Menu admin:** configuração em `app/admin/menu-config.ts` (módulos: Principal, Usuários, Mídia, Consolidação, Livraria, Instagram). Permissões e RBAC em `lib/rbac.ts`.
- **Templates de e-mail:** `supabase/email-templates/README.md`.

## Licença

© Sara Sede Alagoas. Todos os direitos reservados.
