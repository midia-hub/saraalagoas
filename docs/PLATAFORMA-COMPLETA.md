# Documentação da plataforma – Sara Sede Alagoas

Documento de referência com **tudo que existe hoje** no projeto: site público, área admin, banco, APIs, Google Drive, configurações e troubleshooting.

---

## 1. Visão geral

- **Nome:** Sara Sede Alagoas (Igreja Sara Nossa Terra – Sede Alagoas)
- **Tipo:** Site institucional + painel administrativo
- **Stack principal:** Next.js 14 (App Router), TypeScript, TailwindCSS, Supabase, Google Drive API
- **Deploy:** Preparado para Vercel; opção para GitHub Pages com `output: 'export'` (ver seção Build e basePath)

---

## 2. Tecnologias e dependências

| Tecnologia      | Uso                                      |
|-----------------|------------------------------------------|
| Next.js 14      | App principal (site + admin)             |
| React 18        | UI                                       |
| TypeScript      | Tipagem                                  |
| TailwindCSS     | Estilos                                  |
| Lucide React    | Ícones                                   |
| Supabase        | Auth, banco (Postgres), Storage, Edge Functions |
| googleapis      | Upload e listagem de arquivos no Google Drive (Admin – galerias de cultos/eventos) |

**Scripts npm:**

| Comando              | Descrição                                  |
|----------------------|--------------------------------------------|
| `npm run dev`        | Servidor de desenvolvimento                |
| `npm run build`      | Build de produção                          |
| `npm run start`      | Rodar build de produção                    |
| `npm run lint`       | ESLint                                     |
| `npm run upload:imagens` | Envia mídias de `public/` para o bucket Supabase `imagens` |

---

## 3. Estrutura do projeto

```
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Layout raiz (fontes, metadata, SiteConfigProvider)
│   ├── page.tsx                 # Página inicial (home)
│   ├── globals.css
│   ├── sitemap.ts               # Sitemap dinâmico
│   ├── privacidade/             # Página de privacidade
│   ├── admin/                   # Área administrativa
│   │   ├── layout.tsx            # Layout admin (auth + sidebar)
│   │   ├── page.tsx              # Dashboard (cards de atalho)
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminSiteConfig.tsx
│   │   ├── AdminUsers.tsx
│   │   ├── login/page.tsx
│   │   ├── configuracoes/page.tsx
│   │   ├── usuarios/page.tsx
│   │   ├── upload/page.tsx       # Upload Cultos/Eventos (fluxo em 3 etapas)
│   │   └── galeria/page.tsx      # Lista de galerias (filtros)
│   ├── galeria/                  # Site público – galerias
│   │   ├── page.tsx              # Redireciona para /admin/galeria
│   │   └── [tipo]/[slug]/[date]/page.tsx  # Galeria por culto/evento + data
│   ├── cultos/page.tsx           # Redireciona para /galeria?type=culto
│   ├── eventos/page.tsx         # Redireciona para /galeria?type=evento
│   ├── upload/page.tsx           # Redireciona para /admin/upload
│   └── api/                      # API Routes
│       ├── auth/admin-check/     # POST – verifica se usuário é admin (profiles.role)
│       ├── admin/settings/       # GET/POST – configuração (home_route, etc.)
│       ├── services/             # GET – lista cultos (worship_services)
│       ├── gallery/
│       │   ├── prepare/          # POST – cria/retorna galeria + drive_folder_id
│       │   ├── list/             # GET – lista galerias (filtros type, slug, date)
│       │   ├── [id]/upload/      # POST – upload de 1 arquivo (multipart) para Drive + gallery_files
│       │   └── [id]/files/       # GET – lista imagens da pasta Drive da galeria
│       └── ...
├── components/                   # Componentes do site público
├── config/
│   └── site.ts                   # Configuração padrão do site
├── lib/
│   ├── supabase.ts               # Cliente Supabase (browser)
│   ├── supabase-server.ts        # Cliente Supabase (server – service role ou anon)
│   ├── site-config-context.tsx
│   ├── site-config-server.ts     # Leitura da config no servidor
│   ├── storage-url.ts            # URL pública do bucket imagens
│   ├── drive.ts                  # Google Drive: uploadImageToFolder, listFolderImages, ensureDrivePath
│   ├── slug.ts                   # slugify
│   ├── auth.ts                   # isAdminRequest (cookies/headers)
│   ├── types.ts
│   └── whatsapp.ts
├── public/
├── scripts/
│   └── upload-imagens-bucket.mjs
├── middleware.ts                 # Proteção /admin e /api/admin (cookie admin_access ou ADMIN_SECRET)
├── next.config.js                # basePath, trailingSlash, output: 'export' condicional
├── supabase/
│   └── functions/
│       └── admin-invite-user/   # Edge Function: convite por e-mail
├── supabase-admin.sql            # site_config, profiles, RLS, trigger novo usuário
├── supabase-gallery.sql          # settings, worship_services, galleries, gallery_files, RLS
├── supabase-bucket-imagens.sql   # Bucket "imagens" e políticas
└── supabase-face-gallery.sql     # (opcional) face_gallery – app Vite
```

A pasta `src/` contém um app **Vite/React** separado (Upload Facial, face_gallery, n8n webhook). O site em produção é o **Next.js** em `app/`. O webpack do Next exclui `src/` do processamento.

---

## 4. Build e basePath (next.config.js)

- **trailingSlash:** `true` – todas as URLs terminam com `/` (ex.: `/admin/login/`).
- **basePath / assetPrefix:** Se `NEXT_PUBLIC_USE_BASEPATH=true`, usa `/saraalagoas` (GitHub Pages). Caso contrário, vazio (Vercel/domínio próprio).
- **output: 'export':** Usado **somente** quando `NODE_ENV === 'production'` **e** `NEXT_PUBLIC_USE_BASEPATH === 'true'`. Em desenvolvimento ou em produção sem basePath, o Next roda em modo servidor normal (API Routes e middleware funcionam). Isso evita o erro *"Page is missing generateStaticParams()"* nas rotas dinâmicas de API durante o dev.

---

## 5. Middleware (proteção Admin)

- **Arquivo:** `middleware.ts`
- **Matcher:** `/admin/:path*`, `/api/admin/:path*`
- **Lógica:**
  - Acesso permitido se: cookie `admin_access=1` OU cookie `admin_secret` / header `x-admin-secret` igual a `ADMIN_SECRET`.
  - Para rotas admin (exceto `/admin/login`): sem acesso → redirect para `/admin/login` (páginas) ou 401 JSON (APIs).
- **Login:** Em `/admin/login` o usuário faz login com Supabase Auth; a página chama `POST /api/auth/admin-check` com o token; se `canAccessAdmin=true`, define cookie `admin_access=1` e redireciona para `/admin`.
- **Normalização de path:** O middleware normaliza o pathname removendo a barra final antes de comparar (ex.: `/admin/login/` é tratado como página de login), evitando loop de redirecionamento com `trailingSlash: true`.

---

## 6. Site público

### 6.1 Rotas

| Rota            | Descrição                    |
|-----------------|------------------------------|
| `/`             | Página inicial (home)        |
| `/privacidade`  | Política de privacidade      |
| `/galeria`      | Redireciona para `/admin/galeria` |
| `/galeria/[tipo]/[slug]/[date]` | Galeria de fotos (culto ou evento por data) |
| `/cultos`       | Redireciona para `/galeria?type=culto` |
| `/eventos`      | Redireciona para `/galeria?type=evento` |
| `/upload`       | Redireciona para `/admin/upload` |

### 6.2 Página inicial – seções (em ordem)

1. Header – Logo, menu de âncoras (configurável no Admin), menu mobile  
2. Hero – Vídeo/imagem de destaque, título e CTA  
3. ServicesSection – Cultos (terça, sábado, domingo manhã/noite)  
4. CellSection – Células, benefícios, WhatsApp  
5. LeadershipSection – Liderança (fotos e links)  
6. SocialSection – Instagram, YouTube  
7. PrayerSection – Pedido de oração + WhatsApp  
8. ImmersionSection – Revisão/Imersão + galeria  
9. OfferingsSection – Dízimos e ofertas  
10. KidsSection – Sara Kids  
11. LocationSection – Endereço e mapa (Google Maps)  
12. MissionSection – Missão da igreja  
13. Footer – Links, créditos, link para Admin  
14. FloatingWhatsApp  

### 6.3 Configuração do site

- **Padrão:** `config/site.ts` – nome, descrição, WhatsApp, redes, endereço, **services** (cultos), **menuItems**, textos das seções, paths de imagens.
- **Runtime:** Se o Supabase estiver configurado, a página lê a chave `main` da tabela `site_config` e mescla com o padrão (`lib/site-config-context.tsx`). O Admin edita e salva em `site_config`.

### 6.4 Imagens e mídia (site)

- **Bucket Supabase:** `imagens` (público para leitura). Definido em `supabase-bucket-imagens.sql`.
- **URL pública:** `lib/storage-url.ts` – `getStorageUrl(path)`.
- **Upload inicial:** `npm run upload:imagens` envia arquivos de `public/` para o bucket conforme `scripts/upload-imagens-bucket.mjs`.

### 6.5 Cores e tema (Tailwind)

- `sara-red`: #c62737  
- `sara-gray-dark`: #252525  
- `sara-gray-light`: #B6B8BA  
- Fonte: Poppins (Google Fonts)

---

## 7. Área Admin

### 7.1 Acesso e autenticação

- **Login:** `/admin/login` – e-mail/senha ou link mágico (Supabase Auth).
- **Proteção:** Middleware exige cookie `admin_access=1` (ou `ADMIN_SECRET`) para todas as rotas em `/admin` exceto `/admin/login`. O layout admin também valida a sessão e o snapshot de permissões.
- **Verificação de acesso:** Após login, a página chama `POST /api/auth/admin-check` com o `access_token`. A rota retorna `isAdmin`, `canAccessAdmin`, perfil e permissões por página. O backend valida permissões por endpoint (`requireAccess`) e não depende apenas do frontend.

### 7.2 Rotas do Admin

| Rota                      | Conteúdo                                      |
|---------------------------|-----------------------------------------------|
| `/admin`                  | Dashboard com cards para cada seção           |
| `/admin/configuracoes`    | Edição da configuração do site (AdminSiteConfig) |
| `/admin/usuarios`         | Convite de usuários + gestão de perfis e permissões (AdminUsers) |
| `/admin/upload`           | Upload de imagens para galerias (Cultos/Eventos) – fluxo em 3 etapas + Google Drive |
| `/admin/galeria`          | Lista de galerias com filtros (tipo, data); links para galeria pública e para edição |

### 7.3 Upload Cultos/Eventos (fluxo em 3 etapas)

1. **Etapa 1:** Tipo (culto ou evento), data, culto (se tipo culto) ou nome do evento, descrição opcional.  
2. **Etapa 2:** Seleção de múltiplas imagens (PNG, JPEG, WebP, GIF até 10MB). Botão “Iniciar upload”.  
3. **Etapa 3:** Confirmação; link para “Ver galeria criada”.

**Fluxo técnico:**

- Front chama `POST /api/gallery/prepare` com `{ type, date, serviceId ou eventName, description }`.
- Backend: valida; obtém ou cria pasta no Drive (`ensureDrivePath([year, type, slug, date])`); cria ou reutiliza registro em `galleries`; retorna `{ galleryId, galleryRoute }`.
- Para cada arquivo, front envia `POST /api/gallery/[galleryId]/upload` com `FormData` (campo `file`). Backend: valida tipo/tamanho; lê `drive_folder_id` da galeria; envia arquivo para o Drive via `lib/drive.ts` (`uploadImageToFolder`); insere registro em `gallery_files`. O Drive espera um stream no body do upload; em `lib/drive.ts` usa-se `Readable.from(buffer)` para evitar erro “part.body.pipe is not a function”.

---

## 8. APIs (resumo)

| Método | Rota | Descrição |
|--------|------|------------|
| POST | `/api/auth/admin-check` | Body: `{ accessToken }`. Retorna `{ isAdmin }` conforme `profiles.role`. |
| GET/POST | `/api/admin/settings` | Configuração do site (ex.: home_route). Requer admin (isAdminRequest). |
| GET | `/api/services` | Lista cultos ativos (`worship_services`). |
| POST | `/api/gallery/prepare` | Body: type, date, serviceId ou eventName, description. Cria/reutiliza galeria e pasta Drive; retorna galleryId e galleryRoute. |
| GET | `/api/gallery/list` | Query: type, slug, date. Lista galerias. |
| POST | `/api/gallery/[id]/upload` | FormData com `file`. Upload para Drive + insert em `gallery_files`. Limite 10MB; tipos: image/png, image/jpeg, image/webp, image/gif. |
| GET | `/api/gallery/[id]/files` | Lista imagens da pasta Drive da galeria (com cache 5 min); sincroniza metadados em `gallery_files`. |
| GET | `/api/gallery/image` | Query: `fileId`, `mode=full|thumb`. Proxy de imagem do Drive. **Para postagem em redes:** usar sempre `mode=full` (original); `mode=thumb` é só para listagens e prévias. |

### 8.1 Qualidade das imagens na postagem

- **Galeria → Criar post:** O draft guarda `url` com `mode=full`; a API de publicação recebe `mediaEdits` com `id` (fileId). Ao implementar o envio real para redes, buscar cada imagem em tamanho original: `GET /api/gallery/image?fileId=<id>&mode=full` (ou `getFileDownloadStream` no servidor). Nunca usar `mode=thumb` para a imagem que será publicada.
- **Editor Instagram:** A exportação para publicação usa JPEG com qualidade 0,97 (constante `JPEG_QUALITY_PUBLISH`) para evitar perda visível; a origem (`source_url`) é sempre a imagem full do Drive.

---

## 9. Supabase

### 9.1 Migrações SQL (ordem recomendada)

1. **supabase-admin.sql** – `site_config`, `profiles`, RLS, trigger `on_auth_user_created` (novo usuário recebe perfil com role `viewer`). Primeiro admin: `UPDATE public.profiles SET role = 'admin' WHERE id = 'USER_UUID';`
2. **supabase-gallery.sql** – `settings`, `worship_services`, `galleries`, `gallery_files`, RLS e políticas.
3. **supabase-bucket-imagens.sql** – Bucket `imagens` e políticas de leitura/upload.

### 9.2 Tabelas principais

- **site_config** – `key` (PK), `value` (jsonb), `updated_at`. Chave `main`: JSON da configuração do site. RLS: leitura pública; escrita autenticados.
- **profiles** – `id` (FK auth.users), `email`, `role` ('admin'|'editor'|'viewer'), `created_at`, `updated_at`. RLS: usuário lê/atualiza o próprio; admins (via `is_current_user_admin()`) podem gerenciar todos.
- **settings** – `id` (PK default 1), `home_route`, `updated_at`. Rota da página inicial.
- **worship_services** – Cultos (id, name, slug, active, created_at). Listados em `/api/services`.
- **galleries** – Galerias de culto/evento: type, title, slug, date, description, drive_folder_id. Unique (type, slug, date).
- **gallery_files** – Arquivos por galeria: gallery_id, drive_file_id (unique), name, web_view_link, thumbnail_link, mime_type, created_time. Insert por upload; sem upsert por constraint.

### 9.3 Storage

- **Bucket `imagens`:** Público leitura; upload anon permitido (script inicial). Usado pelo site (liderança, kids, revisão, etc.). Admin de galerias usa **Google Drive**, não este bucket.
- **Bucket `faces`:** Referido em `src/` e supabase-face-gallery.sql (opcional).

### 9.4 Edge Functions

- **admin-invite-user** – POST com e-mail; Authorization Bearer (sessão). Verifica admin em `profiles`; chama `auth.admin.inviteUserByEmail`. Deploy: `supabase functions deploy admin-invite-user`.

---

## 10. Google Drive (Admin – Galerias)

- **Uso:** Upload e listagem de imagens das galerias de cultos/eventos. Pasta raiz configurada por `GOOGLE_DRIVE_ROOT_FOLDER_ID` (ou `GOOGLE_DRIVE_FOLDER_ID`). Subpastas criadas automaticamente: `[ano]/[type]/[slug]/[date]`.
- **lib/drive.ts:** `getAuth()` (Service Account por arquivo ou env), `ensureDrivePath(parts)`, `uploadImageToFolder(folderId, { name, mimeType, buffer })`, `listFolderImages(folderId)`. O body do upload para a API do Drive é enviado como `Readable.from(buffer)` (stream).
- **Credenciais:** Service Account no Google Cloud com Drive API ativada; pasta raiz no Drive compartilhada com o e-mail da service account (Editor). Variáveis: `GOOGLE_DRIVE_ROOT_FOLDER_ID`, e uma de: `GOOGLE_APPLICATION_CREDENTIALS` (caminho do JSON), `GOOGLE_SERVICE_ACCOUNT_JSON` (string), ou `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`. Ver `docs/GOOGLE-DRIVE-ADMIN.md`.

---

## 11. Variáveis de ambiente

Usar `.env` ou `.env.local` (não commitar). Exemplo em `.env.example`:

| Variável                         | Uso                                      |
|----------------------------------|------------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL         | URL do projeto Supabase                  |
| NEXT_PUBLIC_SUPABASE_ANON_KEY    | Chave anon (site e admin)                 |
| SUPABASE_SERVICE_ROLE_KEY        | Chave **service_role** (server). Necessária para escrita com privilégios; admin-check usa o token do usuário para ler role. |
| ADMIN_SECRET                     | (Opcional) Cookie `admin_secret` ou header `x-admin-secret` para acesso admin sem login Supabase |
| NEXT_PUBLIC_USE_BASEPATH         | Se `true`, usa basePath `/saraalagoas` e, em produção, `output: 'export'` |
| GOOGLE_DRIVE_ROOT_FOLDER_ID      | ID da pasta raiz no Drive (ou GOOGLE_DRIVE_FOLDER_ID) |
| GOOGLE_APPLICATION_CREDENTIALS   | Caminho do JSON da Service Account       |
| GOOGLE_SERVICE_ACCOUNT_JSON      | JSON da service account (string)         |
| GOOGLE_SERVICE_ACCOUNT_EMAIL     | E-mail da service account (alternativa)  |
| GOOGLE_PRIVATE_KEY               | Chave privada (alternativa)              |
| VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY | App Vite (src/)                    |
| VITE_N8N_WEBHOOK_URL             | (Opcional) Webhook n8n no app Vite       |

---

## 12. Galeria pública (site)

- **URL:** `/galeria/[tipo]/[slug]/[date]` – ex.: `/galeria/culto/culto-de-fe-e-milagres/2026-02-10`.
- **Comportamento:** A página chama `GET /api/gallery/list?type=&slug=&date=` e obtém a galeria; em seguida `GET /api/gallery/[id]/files` para as imagens. Exibe grid com miniaturas e lightbox; link “Abrir no Drive”.

---

## 13. Troubleshooting (resumo)

- **Admin não abre / loop de redirect:** Middleware agora normaliza path (remove barra final) para reconhecer `/admin/login/` como página de login.
- **“Acesso permitido apenas para administradores”:** Verificar se o usuário tem `profiles.role = 'admin'`. A rota `admin-check` usa o token do usuário para ler `profiles`; garantir também que `SUPABASE_SERVICE_ROLE_KEY` seja a chave service_role real se usado em outros fluxos.
- **Upload 500 “part.body.pipe is not a function”:** Corrigido em `lib/drive.ts` usando `Readable.from(buffer)` no body do upload para o Drive.
- **Upload 500 “there is no unique or exclusion constraint matching the ON CONFLICT specification”:** A rota de upload usa `.insert()` em `gallery_files`, não `.upsert()`, pois a constraint pode não existir em todos os ambientes.
- **API 500 “missing generateStaticParams” em dev:** O `next.config.js` só aplica `output: 'export'` em produção **e** com `NEXT_PUBLIC_USE_BASEPATH=true`; em dev as API Routes dinâmicas funcionam normalmente.

---

## 14. Documentação existente no repositório

| Arquivo                  | Conteúdo resumido                          |
|--------------------------|--------------------------------------------|
| README.md                | Visão geral, como rodar, estrutura, deploy |
| README-ADMIN.md          | Admin: variáveis, migração, primeiro admin, convite, URLs |
| docs/PLATAFORMA-COMPLETA.md | Este documento                         |
| docs/README-UPLOAD-GALERIA.md | Upload e galeria (fluxo)              |
| docs/GOOGLE-DRIVE-ADMIN.md | Configurar Google Drive para Admin     |
| docs/EMAIL-NAO-RECEBIDO.md | E-mail não recebido (Supabase)         |
| docs/SMTP-GOOGLE-SUPABASE.md | SMTP/Google com Supabase              |
| DEPLOY.md / DEPLOY-GITHUB-PAGES.md | Deploy Vercel / GitHub Pages       |
| IMAGENS.md, FAQ.md, INICIO-RAPIDO.md, CONFIGURAR-NEXTJS.md | Diversos |

---

## 15. Resumo rápido

- **Site público:** Página inicial com seções editáveis via Admin + `site_config`; página de privacidade; galeria em `/galeria/[tipo]/[slug]/[date]`; redirecionamentos de `/galeria`, `/cultos`, `/eventos`, `/upload`.
- **Admin:** Login Supabase; verificação de acesso por perfil/permissões (`/api/auth/admin-check`) e cookie `admin_access`; dashboard; configurações do site; usuários + perfis (convite, atribuição e permissões); upload de imagens para galerias (prepare + upload por arquivo para Google Drive); listagem de galerias.
- **Supabase:** Auth, `site_config`, `profiles`, `settings`, `worship_services`, `galleries`, `gallery_files`, bucket `imagens`, Edge Function `admin-invite-user`.
- **Google Drive:** Pastas por ano/tipo/slug/date; upload via API (stream); listagem de imagens; credenciais Service Account.
- **Config:** `trailingSlash: true`; `output: 'export'` apenas em produção com basePath; middleware protege `/admin` e `/api/admin`; normalização de path para evitar loop no login.

Este documento reflete o estado atual da plataforma e pode ser atualizado conforme novas funcionalidades forem adicionadas.
