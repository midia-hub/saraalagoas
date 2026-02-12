# Documentação completa da plataforma – Sara Sede Alagoas

Documento único com tecnologias, funcionalidades, integrações, rotas e estrutura do projeto.

---

## 1. Visão geral

A plataforma é o **site institucional** da Igreja Sara Nossa Terra – Sede Alagoas, com:

- **Site público**: páginas institucionais, galeria de fotos, cultos, eventos, WhatsApp, redes sociais.
- **Painel administrativo**: login, ajustes do site, usuários, gerenciamento de permissões (RBAC), galeria, upload, publicações no Instagram/Facebook (Meta), postagens programadas e configurações Meta (OAuth). A interface prioriza **linguagem acessível** e **feedback visual de carregamento** em todas as ações.

---

## 2. Linguagens e tecnologias

### 2.1 Linguagens

| Linguagem   | Uso principal |
|------------|----------------|
| **TypeScript** | Todo o código da aplicação (App Router, API routes, lib) |
| **JavaScript** | Scripts (ex.: `scripts/upload-imagens-bucket.mjs`) |
| **SQL**        | Migrations Supabase (schema, RLS, funções) |
| **HTML/CSS**   | Templates de e-mail (`supabase/email-templates/*.html`), Tailwind CSS |

### 2.2 Framework e bibliotecas principais

| Tecnologia        | Versão   | Uso |
|-------------------|----------|-----|
| **Next.js**       | 14.2.x   | App Router, SSR, API Routes, middleware |
| **React**         | 18.2.x   | Componentes, hooks, contexto |
| **Tailwind CSS**  | 3.4.x    | Estilos, responsividade |
| **Supabase (JS)** | 2.45.x   | Auth, banco, storage (cliente e servidor) |
| **Lucide React**  | 0.323.x  | Ícones no admin e no site |

### 2.3 Bibliotecas por funcionalidade

| Funcionalidade        | Pacotes |
|-----------------------|---------|
| Galeria / imagens     | `sharp` (processamento de imagem no servidor) |
| Upload / arrastar     | `react-dropzone` |
| Edição de foto (crop) | `cropperjs` |
| Reordenação (drag)    | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Lightbox              | `yet-another-react-lightbox` |
| Animações             | `framer-motion` |
| Google Drive          | `googleapis` |

### 2.4 Ferramentas de desenvolvimento

- **TypeScript** 5.3.x  
- **ESLint** + **eslint-config-next**  
- **PostCSS** + **Autoprefixer**  
- **Node.js** (ambiente de execução)

---

## 3. Estrutura do projeto

```
midia_igreja/
├── app/
│   ├── admin/                 # Painel administrativo
│   │   ├── layout.tsx, page.tsx, AdminSidebar.tsx, PageAccessGuard.tsx
│   │   ├── login/, completar-cadastro/, acesso-negado/
│   │   ├── configuracoes/, conta/, settings/
│   │   ├── usuarios/, roles/ [id]/
│   │   ├── galeria/, galeria/[id]/post/ (select, create)
│   │   ├── upload/
│   │   ├── instagram/ (posts, collaboration), instancias/ (OAuth Meta)
│   │   └── ...
│   ├── api/                   # API Routes
│   │   ├── admin/             # RBAC, users, roles, gallery, instagram, site-config, etc.
│   │   ├── auth/              # admin-check, set-admin-cookie
│   │   ├── gallery/           # list, create, image, files, upload, prepare, recent-photos
│   │   ├── meta/              # OAuth, integrations, check-config, pages, collaboration
│   │   └── social/            # publish, run-scheduled, scheduled
│   ├── cultos/, eventos/, galeria/, privacidade/, redefinir-senha/, upload/
│   ├── layout.tsx, page.tsx, globals.css, loading.tsx, sitemap.ts
│   └── ...
├── components/                # Componentes do site e do admin
│   ├── Header, Footer, Hero, FloatingWhatsApp
│   ├── ServicesSection, CellSection, LeadershipSection, SocialSection
│   ├── PrayerSection, LocationSection, MissionSection, GallerySection
│   ├── ui/ (Button com loading, Spinner, PageSpinner)  # UX: feedback visual
│   ├── admin/ (ConfirmDialog, PermissionGate), Toast, Card, GaleriaLoading
│   └── ...
├── config/
│   └── site.ts                # Configuração estática do site (WhatsApp, endereço, cultos, etc.)
├── lib/
│   ├── supabase.ts, supabase-server.ts   # Clientes Supabase
│   ├── admin-api.ts, admin-client.ts, admin-access-context.tsx
│   ├── auth.ts, auth-recovery.ts
│   ├── drive.ts, gallery-types.ts, gallery-files-cache.ts
│   ├── meta.ts, publish-meta.ts, instagram.ts
│   ├── rbac.ts, rbac-types.ts, hooks/useRBAC.ts
│   ├── site-config-context.tsx, site-config-server.ts
│   ├── slug.ts, storage-url.ts, types.ts, whatsapp.ts, home-route.ts
│   └── ...
├── public/                    # Assets (imagens, favicon, manifest, etc.)
├── scripts/                   # Scripts (ex.: upload para bucket)
├── supabase/
│   ├── migrations/           # SQL (tabelas, RLS, funções)
│   ├── email-templates/     # HTML de e-mails (reset, magic-link, invite, etc.)
│   └── functions/           # Edge Functions (ex.: admin-invite-user)
├── .env.example, package.json, next.config.js, tailwind.config.ts, tsconfig.json
├── README.md
└── DOCUMENTACAO_PLATAFORMA.md  # Este arquivo
```

---

## 4. Funcionalidades detalhadas

### 4.1 Site público

| Página / recurso      | Rota / uso | Descrição |
|----------------------|------------|-----------|
| Home                 | `/`        | Hero, cultos, células, liderança, redes, oração, localização, missão, galeria. Rota inicial pode ser alterada via config (ex.: redirecionar para `/cultos`). |
| Cultos               | `/cultos`  | Página de cultos. |
| Eventos              | `/eventos` | Página de eventos. |
| Galeria              | `/galeria`, `/galeria/[tipo]/[slug]/[date]` | Galeria de fotos por tipo/slug/data (dados do Supabase + Google Drive). |
| Privacidade          | `/privacidade` | Como protegemos seus dados (política de privacidade). |
| Redefinir senha      | `/redefinir-senha` | Fluxo de recuperação de senha (Supabase Auth). |
| Upload (público)     | `/upload`  | Página de upload (se existir uso público). |
| WhatsApp flutuante   | Componente | Botão flutuante com links para mensagens pré-definidas (geral, oração, célula, imersão). |
| Configuração do site | Servidor   | Dados do site vêm de `config/site.ts` e podem ser sobrescritos por `site_config` no Supabase (cultos, endereço, WhatsApp, etc.). |

### 4.2 Autenticação e acesso ao admin

- **Login admin:** `/admin/login` (Supabase Auth).
- **Cookie de acesso:** após login, cookie `admin_access` (e opcionalmente `admin_secret`) para acessar `/admin` e `/api/admin`.
- **Middleware:** protege todas as rotas `/admin/*` e `/api/admin/*`; redireciona para `/admin/login` se não houver acesso; aplica headers de segurança (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- **Completar cadastro:** `/admin/completar-cadastro` para usuários que precisam finalizar perfil.
- **Acesso negado:** `/admin/acesso-negado` quando o usuário não tem permissão para a página.

### 4.3 Painel administrativo – menu e permissões

O menu do admin é controlado por **RBAC** (recursos e permissões). Textos exibidos ao usuário (linguagem acessível):

- **dashboard** – Início  
- **configuracoes** – Ajustes do Site  
- **usuarios** – Usuários e perfis  
- **roles** – Gerenciar Permissões  
- **upload** – Upload  
- **galeria** – Galeria  
- **instagram** – Painel de publicações e Convites de Colaboração  
- **meta** – Configurações do Instagram/Facebook (OAuth)  

Cada recurso pode ter permissões: `view`, `create`, `edit`, `delete`, `manage`. Roles padrão: Administrador, Moderador, Usuário Padrão, Convidado. O **PageAccessGuard** e a **lib/admin-api** verificam permissões por página/ação. O botão de sair do painel exibe **"Sair do Painel"**.

### 4.4 Ajustes do site (configurações)

- **Página:** `/admin/configuracoes` (título na interface: **Ajustes do Site**).
- **API:** `/api/admin/site-config` (leitura/gravação).
- Dados editáveis no admin sobrescrevem o que está em `config/site.ts` (armazenados em `site_config` no Supabase, chave `main`). Inclui: nome, descrição, URL, WhatsApp, mensagens WhatsApp, redes sociais, endereço, liderança, cultos/serviços, missão, etc. Botão **Salvar configurações** com indicador de carregamento durante o salvamento.

### 4.5 Usuários e perfis

- **Páginas:** `/admin/usuarios`, usuário individual (edição, atribuição de role, envio de redefinição de senha).
- **APIs:** `/api/admin/users`, `/api/admin/users/[id]`, `/api/admin/users/[id]/assign-role`, `/api/admin/users/[id]/send-reset-password`.
- Perfis no Supabase (`profiles`) vinculados ao Auth; role atribuída via `role_id` (RBAC).

### 4.6 Funções e permissões (RBAC)

- **Páginas:** `/admin/roles` (título: **Gerenciar Funções e Acessos**), `/admin/roles/[id]`.
- **APIs:** `/api/admin/roles`, `/api/admin/roles/[id]`, `/api/admin/resources`, `/api/admin/permissions`, `/api/admin/rbac`, `/api/admin/app-permissions`.
- Tabelas: `resources`, `permissions`, `roles`, `role_permissions`, `app_permissions`. Controle fino de quem vê/edita cada módulo do admin. Botões de salvar/criar e excluir com feedback visual de carregamento.

### 4.7 Galeria (admin)

- **Listagem:** `/admin/galeria` – álbuns (galleries) com filtros; estado de carregamento inicial via `GaleriaLoading`; exclusão de álbum com confirmação e spinner no botão **Excluir álbum**.
- **Álbum:** `/admin/galeria/[id]` – fotos do álbum; origem dos arquivos: **Google Drive** (e opcionalmente bucket Supabase para uploads grandes).
- **Criar post a partir do álbum:**
  - `/admin/galeria/[id]/post/select` – seleção de fotos (até 10 para Instagram).
  - `/admin/galeria/[id]/post/create` – edição (crop, ordem), texto, conta e destinos (Instagram/Facebook), **publicar agora** ou **programar postagem** (data/hora). Botão **Publicar** com spinner durante o envio.
- Upload de novas fotos para álbum: APIs em `/api/gallery/...` (upload, upload-from-storage, prepare, list, files, recent-photos, create). Limite de tamanho configurável (`MAX_UPLOAD_MB`); arquivos grandes podem ir para o bucket `temp-gallery-uploads` e depois para o Drive.

### 4.8 Publicações (Instagram / Facebook – Meta)

- **Painel de publicações:** `/admin/instagram/posts` – lista jobs de publicação (legado) e **postagens programadas** (Meta). Abas: Todas, Na fila, Publicadas, Falhas. Botão **“Processar fila agora”** com spinner durante o processamento; executa jobs em atraso e postagens programadas (`/api/social/run-scheduled`).
- **Configurações do Instagram/Facebook:** `/admin/instancias` – conectar contas Facebook/Instagram via **OAuth Meta** (páginas do Facebook e contas Instagram Business vinculadas). Fluxo: start → callback → select-page → oauth-done. Botões **Conectar conta** e **Reconectar permissões** com indicador de carregamento. Scopes incluem `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `pages_manage_posts`.
- **Publicação imediata:** `POST /api/social/publish` com `albumId`, `instanceIds`, `destinations`, `text`, `mediaEdits` (e opcionalmente `croppedUrl` por mídia). Publica no Meta (Instagram carrossel até 10 fotos, Facebook uma ou várias fotos).
- **Publicação programada:** mesmo `POST /api/social/publish` com `scheduled_at` (ISO). Grava em `scheduled_social_posts`; no horário (ou ao clicar “Processar fila”), `POST /api/social/run-scheduled` processa e chama a mesma lógica de publicação (`lib/publish-meta.ts`). Listagem de programadas: `GET /api/social/scheduled`.
- **Convites de colaboração:** `/admin/instagram/collaboration` e APIs Meta de colaboração (`/api/meta/collaboration`, etc.).

### 4.9 Upload (admin)

- **Página:** `/admin/upload` – upload de arquivos para a galeria (Drive ou bucket temporário conforme config). Fluxo em 3 etapas; botão **Iniciar upload** com spinner; barra de progresso e status por arquivo (Na fila, Concluído, Falhou).

### 4.10 Conta e configurações de perfil

- **Conta:** `/admin/conta` (Minha conta) – dados do usuário logado; alteração de e-mail com botão **Enviar confirmação para o novo e-mail** e spinner durante o envio.
- **Settings:** `/admin/settings` – preferências do admin (se existir).

### 4.11 UX – feedback visual de carregamento

Em **todas as páginas do admin**, ações assíncronas exibem feedback visual imediato:

| Área | Onde | Comportamento |
|------|------|----------------|
| **Login** | Botões Entrar e Enviar link | Spinner + texto "Validando acesso..." / estado loading |
| **Galeria** | Excluir álbum (modal) | Botão com spinner "Excluindo..." |
| **Upload** | Iniciar upload | Spinner no botão; barra de progresso e status por arquivo |
| **Post** | Publicar, Processar fila | Spinner nos botões "Publicando...", "Processando…" |
| **Usuários** | Convidar, Editar, Reset senha, Excluir | Spinner em cada ação; ConfirmDialog com spinner no confirmar |
| **Roles** | Salvar/Criar função, Excluir | Spinner no botão; ConfirmDialog com spinner |
| **Configurações** | Salvar configurações | Spinner no botão "Salvando..." |
| **Instâncias Meta** | Conectar, Reconectar permissões | Spinner nos botões |
| **Minha conta** | Alterar e-mail | Spinner no botão de envio |

**Componentes reutilizáveis:** `components/ui/Button.tsx` (prop `loading` com ícone animado), `components/ui/Spinner.tsx` (tamanhos sm/md/lg/xl, opcional texto), `PageSpinner` para telas inteiras. O **ConfirmDialog** (`components/admin/ConfirmDialog.tsx`) exibe spinner no botão de confirmação quando `loading` é true.

### 4.12 Textos e linguagem (UX)

Os textos da interface seguem **linguagem acessível e não técnica**, documentados em **TEXTOS_PLATAFORMA.md**. Exemplos: "Ajustes do Site" (em vez de "Configurações do site"), "Gerenciar Permissões", "Configurações do Instagram/Facebook", "Sair do Painel", mensagens de erro empáticas (ex.: "Não conseguimos carregar os álbuns. Por favor, tente novamente."). A página de privacidade pública usa o título **"Como protegemos seus dados"**.

---


## 5. Integrações

### 5.1 Supabase

- **Auth:** login, sessão, recuperação de senha, convites (e-mail), completar cadastro.
- **Banco:** PostgreSQL – perfis, roles, recursos, permissões, galerias, arquivos da galeria, `site_config`, instâncias Instagram (legado), drafts/jobs de postagem, integrações Meta, postagens programadas (`scheduled_social_posts`).
- **Storage:** buckets para imagens do site, `instagram_posts` (mídia processada para Meta), `temp-gallery-uploads` (uploads grandes antes de enviar ao Drive).
- **E-mails:** templates em `supabase/email-templates/` (confirm-signup, reset-password, magic-link, invite-user, change-email, reauthentication).

### 5.2 Google Drive

- **Uso:** origem das fotos da galeria (pasta raiz configurada por `GOOGLE_DRIVE_ROOT_FOLDER_ID`).
- **Autenticação:** Service Account (`GOOGLE_SERVICE_ACCOUNT_JSON` ou `GOOGLE_APPLICATION_CREDENTIALS` em dev).
- **APIs:** leitura de arquivos, listagem, download; imagens servidas/processadas via `/api/gallery/image` e usadas na publicação (crop com `sharp`, upload para bucket, depois envio ao Meta).

### 5.3 Meta (Facebook / Instagram)

- **OAuth:** conexão de páginas Facebook e contas Instagram Business; tokens armazenados em `meta_integrations`.
- **Publicação:** Graph API – criação de mídia (single/carrossel no Instagram), publicação no feed; fotos no Facebook (uma ou várias). Lógica centralizada em `lib/meta.ts` e `lib/publish-meta.ts`.
- **Variáveis:** `META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_META_REDIRECT_URI` (ou `META_REDIRECT_URI`), `META_SCOPES`, `META_STATE_SECRET`.

### 5.4 WhatsApp

- **Uso:** links de contato no site (número e mensagens em `config/site.ts` / `site_config`). Sem API server-side obrigatória; componente `FloatingWhatsApp` e links em seções (oração, célula, imersão).

---

## 6. APIs – resumo das rotas

### 6.1 Autenticação / admin

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/auth/admin-check` | Verificação de acesso admin |
| POST | `/api/auth/set-admin-cookie` | Definir cookie de acesso admin |

### 6.2 Galeria (público / servidor)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/gallery/list` | Listar galerias/álbuns |
| GET | `/api/gallery/[id]` | Dados de um álbum |
| GET | `/api/gallery/image` | Imagem (proxy/Drive) |
| GET | `/api/gallery/[id]/files` | Arquivos do álbum |
| GET | `/api/gallery/[id]/files/[fileId]` | Um arquivo |
| POST | `/api/gallery/create` | Criar galeria |
| POST | `/api/gallery/[id]/upload` | Upload para o álbum |
| POST | `/api/gallery/[id]/upload-from-storage` | Upload a partir do storage |
| GET | `/api/gallery/prepare` | Preparar upload |
| GET | `/api/gallery/recent-photos` | Fotos recentes |

### 6.3 Admin – usuários, roles, config

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/admin/site-config` | Configuração do site |
| GET | `/api/admin/users` | Listar usuários |
| GET/PATCH | `/api/admin/users/[id]` | Ver/editar usuário |
| POST | `/api/admin/users/[id]/assign-role` | Atribuir role |
| POST | `/api/admin/users/[id]/send-reset-password` | Enviar e-mail de redefinição |
| GET/POST | `/api/admin/roles` | Listar/criar roles |
| GET/PATCH/DELETE | `/api/admin/roles/[id]` | Ver/editar/excluir role |
| GET | `/api/admin/resources` | Recursos (RBAC) |
| GET | `/api/admin/permissions` | Permissões |
| GET | `/api/admin/rbac` | Dados RBAC |
| GET | `/api/admin/app-permissions` | Permissões da aplicação |
| GET/POST | `/api/admin/settings` | Configurações gerais do admin |

### 6.4 Admin – Instagram (legado) e jobs

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/instagram/posts` | Listar jobs de publicação (legado) |
| GET/POST | `/api/admin/instagram/drafts` | Rascunhos |
| GET/PATCH | `/api/admin/instagram/drafts/[id]` | Um rascunho |
| GET/POST | `/api/admin/instagram/drafts/[id]/assets` | Assets do rascunho |
| GET/POST | `/api/admin/instagram/jobs` | Jobs |
| POST | `/api/admin/instagram/jobs/run-due` | Processar fila de jobs em atraso |
| GET | `/api/admin/instagram/instances` | Instâncias (legado) |
| GET/PATCH | `/api/admin/instagram/instances/[id]` | Uma instância |

### 6.5 Meta (OAuth e integrações)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/meta/oauth/start` | Iniciar OAuth Meta |
| GET | `/api/meta/oauth/callback` | Callback OAuth |
| GET | `/api/meta/check-config` | Verificar config Meta |
| GET | `/api/meta/pages` | Páginas Facebook do usuário |
| GET/POST | `/api/meta/select-page` | Selecionar página |
| GET | `/api/meta/integrations` | Listar integrações Meta |
| GET/DELETE | `/api/meta/integrations/[id]` | Uma integração |
| POST | `/api/meta/add-page` | Adicionar página |
| GET/POST | `/api/meta/collaboration` | Colaboração Instagram |
| GET | `/api/meta/instagram/messages` | Mensagens Instagram (se houver) |
| POST | `/api/meta/instagram/publish` | Publicação legada (se ainda usada) |

### 6.6 Publicação social (Meta – fluxo principal)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/social/publish` | Publicar agora ou programar (`scheduled_at`) |
| POST | `/api/social/run-scheduled` | Processar postagens programadas (cron ou “Processar fila”) |
| GET | `/api/social/scheduled` | Listar postagens programadas |

### 6.7 Serviços

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/services` | Serviços/cultos (para o site) |

---

## 7. Banco de dados (Supabase) – principais entidades

- **profiles** – Usuários (vinculados ao Auth), com `role_id` (RBAC).
- **resources** – Recursos/módulos do sistema (dashboard, configuracoes, usuarios, roles, galeria, upload, instagram, meta, cultos).
- **permissions** – Ações (view, create, edit, delete, manage).
- **roles** – Funções (admin, moderador, usuario_padrao, convidado).
- **role_permissions** – Relação role × recurso × permissão.
- **app_permissions** – Permissões nomeadas da aplicação.
- **site_config** – Configuração editável do site (chave `main`, JSON).
- **galleries** – Álbuns da galeria.
- **gallery_files** – Arquivos dos álbuns (referência ao Drive ou storage), com `uploaded_by_user_id`.
- **instagram_instances** – Instâncias legado (se ainda usadas).
- **instagram_post_drafts** – Rascunhos de post (legado).
- **instagram_post_assets** – Assets dos rascunhos (legado).
- **instagram_post_jobs** – Jobs de publicação (legado).
- **meta_integrations** – Integrações OAuth Meta (página Facebook + Instagram Business).
- **scheduled_social_posts** – Postagens programadas (album_id, scheduled_at, instance_ids, destinations, caption, media_specs, status).
- **access_pages** – Páginas de acesso (legado/Instagram).
- **Storage:** buckets `imagens`, `instagram_posts`, `temp-gallery-uploads`.

Todas as tabelas relevantes possuem **RLS** (Row Level Security) e políticas para leitura/escrita conforme perfil e role.

---

## 8. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anônima Supabase (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (admin/backend) | Chave service role (backend, ignora RLS) |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Galeria/upload | ID da pasta raiz no Drive |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Galeria/upload | JSON da Service Account (uma linha em prod) ou `GOOGLE_APPLICATION_CREDENTIALS` (arquivo em dev) |
| `META_APP_ID` | Publicações Meta | App ID do app Meta |
| `META_APP_SECRET` | Publicações Meta | App Secret |
| `NEXT_PUBLIC_META_REDIRECT_URI` / `META_REDIRECT_URI` | OAuth Meta | URL de callback OAuth |
| `META_SCOPES` | OAuth Meta | Scopes (ex.: pages_show_list, instagram_content_publish, pages_manage_posts) |
| `META_STATE_SECRET` | OAuth Meta | Segredo para estado OAuth |
| `CRON_SECRET` | Cron programadas | Segredo para `POST /api/social/run-scheduled` (cron) |
| `ADMIN_SECRET` | Opcional | Acesso alternativo ao admin (cookie ou header) |
| `MAX_UPLOAD_MB` / `NEXT_PUBLIC_MAX_UPLOAD_MB` | Opcional | Limite de upload em MB (padrão 4) |
| `NEXT_PUBLIC_APP_URL` | Opcional | URL pública do app (e-mails, links) |

Detalhes e exemplos em `.env.example`.

---

## 9. Scripts e comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento (Next.js) |
| `npm run build` | Build de produção |
| `npm run start` | Servir build de produção |
| `npm run lint` | ESLint |
| `npm run upload:imagens` | Script de upload de imagens para bucket (`scripts/upload-imagens-bucket.mjs`) |

---

## 10. Documentação relacionada

- **README.md** – Visão geral, como rodar, deploy, variáveis.
- **TEXTOS_PLATAFORMA.md** – Inventário de todos os textos da interface (páginas, menus, botões, mensagens de erro/sucesso), com local e função de cada um; referência para revisão de copy e internacionalização.
- **docs/GALERIA_E_POSTAGEM_INSTAGRAM_FACEBOOK.md** – Documento único sobre galeria (admin e pública), configurações Meta (OAuth), fluxo de postagem (seleção, edição, publicação imediata e programada), APIs de galeria e social, e painel de publicações.
- **app/admin/galeria/[id]/post/README.md** – Módulo de postagem (seleção, edição, publicação, programação).
- **app/admin/galeria/[id]/post/FLUXO_POSTAGEM.md** – Fluxo detalhado de postagem e componentes.
- **supabase/email-templates/README.md** – Templates de e-mail.

---

*Última atualização: Fevereiro 2026.*
