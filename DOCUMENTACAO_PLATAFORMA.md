# Documentação geral da plataforma

Documento de referência com funcionalidades, páginas, APIs, tabelas, funções e fluxos da aplicação.

---

## 1. Visão geral e tecnologias

- **Stack:** Next.js (App Router), React, TypeScript, Supabase (Auth + Postgres + Storage).
- **Integrações:** Google Drive (galeria/upload), Meta (Instagram/Facebook) para publicações e OAuth, webhook de disparos (mensagens pós-conversão).
- **Deploy:** Vercel (recomendado); variáveis em `.env.example`.

---

## 2. Estrutura de pastas

```
├── app/
│   ├── (público)           # Página inicial, galeria, formulário de conversão, privacidade, redefinir-senha
│   ├── admin/              # Painel administrativo (layout com sidebar e verificação de acesso)
│   │   ├── configuracoes   # Ajustes do site
│   │   ├── pessoas        # Cadastro de pessoas
│   │   ├── usuarios       # Usuários e perfis
│   │   ├── roles          # Gerenciar permissões (RBAC)
│   │   ├── upload         # Upload de arquivos
│   │   ├── galeria        # Álbuns e fotos (Google Drive)
│   │   ├── consolidacao/  # Conversões, lista de convertidos, cadastros (igrejas, arenas, células, equipes, API disparos, mensagens)
│   │   ├── livraria/      # Produtos, estoque, movimentações, importação, dashboard
│   │   ├── instancias     # Configurações Instagram/Facebook (Meta)
│   │   ├── instagram/     # Painel de publicações, convites de colaboração
│   │   ├── login, completar-cadastro, criar-acesso, reset-senha, conta, acesso-negado
│   │   └── galeria/[id]/post/  # Criar post a partir de álbum (select, create, editor, publish)
│   └── api/               # Rotas API (admin, public, gallery, meta, social, auth)
├── components/            # Componentes React reutilizáveis
├── config/                # Dados do site (site.ts)
├── lib/                   # Utilitários e lógica compartilhada
└── supabase/              # Migrations, email-templates
```

---

## 3. Autenticação e controle de acesso (RBAC)

### 3.1 Fluxos de autenticação

| Rota / Ação | Descrição | Chamadas |
|-------------|-----------|----------|
| `/admin/login` | Login com e-mail/senha (Supabase Auth). | `supabase.auth.signInWithPassword` → redireciona para `/admin` ou `/admin/completar-cadastro`. |
| `/admin/completar-cadastro` | Primeiro acesso: usuário deve definir senha. | `supabase.auth.updateUser({ password })` após validar token. |
| `/admin/criar-acesso` | Criação de acesso (admin convida por e-mail). | Envio de link mágico ou criação de usuário; uso de `supabase.auth.admin` ou fluxo de invite. |
| `/admin/redefinir-senha` | Redefinir senha (link por e-mail). | `supabase.auth.updateUser({ password })` com sessão recuperada do link. |
| `/redefinir-senha` | Página pública para abrir link de redefinição. | Redireciona para `/admin/redefinir-senha` com hash. |

### 3.2 Verificação de acesso ao painel

- **Layout admin** (`app/admin/layout.tsx`): em toda navegação dentro de `/admin` (exceto login/completar-cadastro) chama `POST /api/auth/admin-check` com `accessToken` da sessão.
- **Resposta:** `canAccessAdmin`, `isAdmin`, `profile.name`, `permissions` (mapa recurso → view/create/edit/delete/manage).
- Se `canAccessAdmin` for true, define cookie `admin_access=1` (24h) para uso em middleware ou outras checagens.
- **API admin-check** (`/api/auth/admin-check`): usa `getAccessSnapshotByToken(accessToken)` de `lib/rbac.ts` e retorna o snapshot em JSON.

### 3.3 RBAC (lib/rbac.ts e lib/rbac-types.ts)

- **Fontes de permissão:** (1) Novo sistema: `profiles.role_id` → `roles` → `role_permissions` → `resources` + `permissions`; função `get_user_permissions(user_id)` retorna lista de (resource_key, permission_action). (2) Legado: `profiles.role` (admin/editor/viewer) ou `profiles.access_profile_id` → `access_profiles` + `access_profile_permissions` (page_key, can_view, can_create, can_edit, can_delete).
- **Recursos (page_key):** dashboard, configuracoes, upload, galeria, usuarios, roles, pessoas, consolidacao, livraria_produtos, livraria_estoque, livraria_movimentacoes, livraria_importacao, livraria_dashboard, instagram, meta, cultos.
- **Ações:** view, create, edit, delete, manage (manage = todas).
- **Funções:** `getAccessSnapshotByToken(token)`, `getAccessSnapshotFromRequest(request)`, `hasPermission(snapshot, pageKey, action)`, `canView`, `canCreate`, `canEdit`, `canDelete`, `canManage`, `hasAppPermission(snapshot, permissionCode)`.

### 3.4 Proteção de APIs admin (lib/admin-api.ts)

- `requireAccess(request, { pageKey, action })`: obtém snapshot do request; exige `canAccessAdmin` e `hasPermission(snapshot, pageKey, action)`; retorna 401/403 em falha.
- `requireAccessAny(request, requirements[])`: permite se o usuário tiver qualquer uma das permissões.
- `requireAdmin(request)`: exige `snapshot.isAdmin`.

### 3.5 Menu do painel (app/admin/menu-config.ts e AdminSidebar)

- **menuModules:** lista de módulos (Menu Principal, Usuários, Mídia, Consolidação, Livraria, Instagram), cada um com `title`, `permission` (opcional) e `items` (href, label, icon, permission).
- Itens do menu são exibidos conforme as permissões do usuário (comparação com `permissions` do snapshot).

---

## 4. Páginas (rotas da aplicação)

### 4.1 Públicas

| Rota | Descrição |
|------|-----------|
| `/` | Página inicial do site (configurável; `lib/home-route.ts`). |
| `/galeria/[tipo]/[slug]/[date]` | Galeria pública de fotos (culto/evento). |
| `/formulario-conversao` | Formulário de conversão (público); envia para `POST /api/public/consolidacao/conversao`. |
| `/formulario-conversao/sucesso` | Página de sucesso após envio do formulário. |
| `/privacidade` | Política de privacidade. |
| `/redefinir-senha` | Entrada do link de redefinição de senha. |

### 4.2 Admin – Principal e configuração

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/admin` | dashboard | Início do painel. |
| `/admin/configuracoes` | configuracoes | Ajustes do site (API `site-config`, `settings`). |

### 4.3 Admin – Usuários e pessoas

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/admin/pessoas` | pessoas | Lista e cadastro de pessoas (`people`). |
| `/admin/pessoas/[id]` | pessoas | Edição de pessoa. |
| `/admin/usuarios` | usuarios | Usuários e perfis (profiles, roles). |
| `/admin/roles` | roles | Lista de roles. |
| `/admin/roles/[id]` | roles | Edição de role e permissões. |

### 4.4 Admin – Mídia

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/admin/upload` | upload | Upload de arquivos (Storage). |
| `/admin/galeria` | galeria | Lista de álbums (galleries); cria/edita/exclui; integração Drive. |
| `/admin/galeria/[id]/post/select` | instagram | Seleção de fotos do álbum para post. |
| `/admin/galeria/[id]/post/create` | instagram | Criação do rascunho de post. |
| `/admin/galeria/[id]/post/editor` | instagram | Editor de post (legenda, mídia, agendamento). |
| `/admin/galeria/[id]/post/publish` | instagram | Publicar ou agendar. |

### 4.5 Admin – Consolidação

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/admin/consolidacao/conversoes` | consolidacao | Formulário de conversão (admin); mesmo fluxo de dados que o público. |
| `/admin/consolidacao/conversoes/sucesso` | consolidacao | Sucesso após conversão (admin). |
| `/admin/consolidacao/lista` | consolidacao | Lista de convertidos (conversões + pessoas); gráficos. |
| `/admin/consolidacao/cadastros` | consolidacao | Menu de cadastros (igrejas, arenas, células, equipes, pessoas, API disparos, mensagens). |
| `/admin/consolidacao/cadastros/igrejas` | consolidacao | CRUD igrejas. |
| `/admin/consolidacao/cadastros/arenas` | consolidacao | CRUD arenas. |
| `/admin/consolidacao/cadastros/celulas` | consolidacao | CRUD células. |
| `/admin/consolidacao/cadastros/equipes` | consolidacao | CRUD equipes. |
| `/admin/consolidacao/cadastros/pessoas` | consolidacao | Pessoas no contexto consolidação. |
| `/admin/consolidacao/cadastros/api-disparos` | consolidacao | Ativar/desativar API de disparos; log. |
| `/admin/consolidacao/cadastros/mensagens-conversao` | consolidacao | Templates de mensagem (aceitou/reconciliou). |

### 4.6 Admin – Livraria

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/admin/livraria/produtos` | livraria_produtos | CRUD produtos; fotos; código de barras; categoria; desconto; estoque inicial. |
| `/admin/livraria/estoque` | livraria_estoque | Movimentação de estoque (entrada/saída); atualização em lote. |
| `/admin/livraria/movimentacoes` | livraria_movimentacoes | Histórico de movimentações. |
| `/admin/livraria/importacao` | livraria_importacao | Importar/exportar produtos e estoque (XLSX). |
| `/admin/livraria/dashboard` | livraria_dashboard | Indicadores e listas (estoque baixo, entradas/saídas, perdas, top produtos). |

### 4.7 Admin – Instagram / Meta

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/admin/instancias` | instagram | Lista e configuração de instâncias Meta (páginas/Instagram). |
| `/admin/instagram/posts` | instagram | Painel de publicações (rascunhos, programadas, publicadas). |
| `/admin/instagram/collaboration` | instagram | Convites de colaboração. |
| `/admin/instagram/post/new` | instagram | Novo post (pode iniciar de galeria). |
| `/admin/instagram/instances` | instagram | Páginas de instâncias (duplicado/alternativo). |

### 4.8 Admin – Conta e auth

| Rota | Descrição |
|------|-----------|
| `/admin/login` | Login. |
| `/admin/completar-cadastro` | Completar cadastro (senha). |
| `/admin/criar-acesso` | Criar acesso (admin). |
| `/admin/reset-senha` | Redefinir senha (com hash). |
| `/admin/conta` | Conta do usuário logado. |
| `/admin/acesso-negado` | Acesso negado. |

---

## 5. APIs (rotas da API)

Todas as rotas admin que usam `requireAccess` ou `requireAdmin` esperam `Authorization: Bearer <access_token>` (sessão Supabase).

### 5.1 Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/admin-check` | Body: `{ accessToken }`. Retorna snapshot de acesso (canAccessAdmin, isAdmin, profile, permissions). |
| POST | `/api/auth/check-email` | Verificação de e-mail (ex.: existência para criar acesso). |
| POST | `/api/auth/set-admin-cookie` | Define cookie de acesso admin (uso interno). |

### 5.2 Admin – Configuração e RBAC

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET/PATCH | `/api/admin/site-config` | configuracoes | Configuração do site. |
| GET/PATCH | `/api/admin/settings` | configuracoes | Configurações gerais. |
| GET | `/api/admin/resources` | roles | Lista recursos. |
| GET | `/api/admin/permissions` | roles | Lista permissões. |
| GET | `/api/admin/app-permissions` | roles | Lista app_permissions (funções nomeadas). |
| GET | `/api/admin/rbac` | roles | Dados RBAC (roles com permissões). |
| GET/POST | `/api/admin/roles` | roles | CRUD roles. |
| GET/PATCH/DELETE | `/api/admin/roles/[id]` | roles | Uma role. |
| GET/PATCH | `/api/admin/users/[id]` | usuarios | Usuário. |
| POST | `/api/admin/users/[id]/assign-role` | usuarios | Atribuir role. |
| POST | `/api/admin/users/[id]/send-reset-password` | usuarios | Enviar link redefinir senha. |
| GET/POST | `/api/admin/people` | pessoas | Lista/cria pessoas. |
| GET/PATCH/DELETE | `/api/admin/people/[id]` | pessoas | Uma pessoa. |

### 5.3 Galeria (Drive + Supabase)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/gallery/list` | Lista álbums (galleries). |
| GET | `/api/gallery/image` | Proxy/URL de imagem (Drive); requer query params. |
| GET | `/api/gallery/recent-photos` | Fotos recentes (gallery_files). |
| POST | `/api/gallery/create` | Cria álbum (galleries + pasta Drive). |
| GET/PATCH/DELETE | `/api/gallery/[id]` | Álbum. |
| GET | `/api/gallery/[id]/files` | Arquivos do álbum. |
| DELETE | `/api/gallery/[id]/files/[fileId]` | Remove arquivo do álbum. |
| POST | `/api/gallery/[id]/upload` | Upload de arquivo para álbum. |
| POST | `/api/gallery/[id]/upload-from-storage` | Associa arquivo já no Storage ao álbum. |
| POST | `/api/gallery/prepare` | Prepara álbum (criação Drive, etc.). |

### 5.4 Meta (OAuth e publicação)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/meta/oauth/start` | Inicia OAuth Meta; redireciona para Facebook. |
| GET | `/api/meta/oauth/callback` | Callback OAuth; grava meta_integrations; usa service role. |
| GET | `/api/meta/check-config` | Verifica se app Meta está configurado. |
| GET | `/api/meta/integrations` | Lista integrações Meta. |
| GET/PATCH/DELETE | `/api/meta/integrations/[id]` | Uma integração. |
| GET | `/api/meta/pages` | Páginas Facebook do usuário. |
| POST | `/api/meta/add-page` | Adiciona página. |
| POST | `/api/meta/select-page` | Seleciona página/Instagram. |
| GET | `/api/meta/recent-posts` | Posts recentes. |
| GET | `/api/meta/collaboration` | Dados de colaboração. |
| POST | `/api/meta/instagram/publish` | Publica no Instagram. |
| GET | `/api/meta/instagram/messages` | Mensagens. |

### 5.5 Social (postagens e fila)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/social/demands` | Demandas de post (workflow). |
| GET | `/api/social/scheduled` | Lista postagens programadas. |
| GET/DELETE | `/api/social/scheduled/[id]` | Uma programada. |
| POST | `/api/social/publish` | Publicar agora (ou enfileirar). |
| POST | `/api/social/run-scheduled` | Processar fila de programadas (cron); header `x-cron-secret`. |

### 5.6 Admin – Instagram (drafts e jobs)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/admin/instagram/posts` | Lista/cria posts (rascunhos/demands). |
| GET | `/api/admin/instagram/drafts` | Rascunhos. |
| GET/PATCH/DELETE | `/api/admin/instagram/drafts/[id]` | Um rascunho. |
| GET/POST | `/api/admin/instagram/drafts/[id]/assets` | Assets do rascunho. |
| GET | `/api/admin/instagram/jobs` | Jobs de publicação. |
| POST | `/api/admin/instagram/jobs/run-due` | Executa jobs em atraso. |

### 5.7 Admin – Consolidação

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/admin/consolidacao/churches` | Igrejas. |
| GET/PATCH/DELETE | `/api/admin/consolidacao/churches/[id]` | Uma igreja. |
| GET/POST | `/api/admin/consolidacao/arenas` | Arenas. |
| GET/PATCH/DELETE | `/api/admin/consolidacao/arenas/[id]` | Uma arena. |
| GET/POST | `/api/admin/consolidacao/cells` | Células. |
| GET/PATCH/DELETE | `/api/admin/consolidacao/cells/[id]` | Uma célula. |
| GET/POST | `/api/admin/consolidacao/teams` | Equipes. |
| GET/PATCH/DELETE | `/api/admin/consolidacao/teams/[id]` | Uma equipe. |
| GET/POST | `/api/admin/consolidacao/people` | Pessoas (consolidação). |
| GET/PATCH/DELETE | `/api/admin/consolidacao/people/[id]` | Uma pessoa. |
| GET | `/api/admin/consolidacao/conversoes` | Lista conversões. |
| POST | `/api/admin/consolidacao/upsert-person-and-conversion` | Upsert pessoa + conversão (formulário admin). |
| GET/PATCH | `/api/admin/consolidacao/disparos-settings` | consolidation_settings.disparos_api_enabled. |
| GET | `/api/admin/consolidacao/conversion-messages` | Templates de mensagem (aceitou/reconciliou). |
| PATCH | `/api/admin/consolidacao/conversion-messages` | Atualiza templates. |
| GET | `/api/admin/consolidacao/lookups/churches` | Lookup igrejas. |
| GET | `/api/admin/consolidacao/lookups/arenas` | Lookup arenas. |
| GET | `/api/admin/consolidacao/lookups/cells` | Lookup células. |
| GET | `/api/admin/consolidacao/lookups/teams` | Lookup equipes. |
| GET | `/api/admin/consolidacao/lookups/people` | Lookup pessoas. |
| GET | `/api/admin/disparos-log` | Log de chamadas ao webhook de disparos. |

### 5.8 API pública – Consolidação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/public/consolidacao/conversao` | Cadastro de conversão (formulário público); cria/atualiza people + conversão; opcionalmente chama webhook disparos. |
| GET | `/api/public/consolidacao/churches` | Lista igrejas (para formulário). |
| GET | `/api/public/consolidacao/arenas` | Lista arenas. |
| GET | `/api/public/consolidacao/cells` | Lista células. |
| GET | `/api/public/consolidacao/teams` | Lista equipes. |
| GET | `/api/public/consolidacao/people` | Lista pessoas (se necessário). |
| GET | `/api/public/consolidacao/conversion-messages` | Mensagens de sucesso (aceitou/reconciliou). |

### 5.9 Admin – Livraria

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/admin/livraria/produtos` | Lista/cria produtos (bookstore_products). |
| GET/PATCH/DELETE | `/api/admin/livraria/produtos/[id]` | Um produto. |
| POST | `/api/admin/livraria/produtos/[id]/upload-image` | Upload de imagem do produto (Storage + bookstore_product_images). |
| DELETE | `/api/admin/livraria/produtos/[id]/images/[imageId]` | Remove imagem do produto. |
| GET/POST | `/api/admin/livraria/categorias` | Lista/cria categorias (bookstore_categories). |
| GET | `/api/admin/livraria/fornecedores` | Lista fornecedores (bookstore_suppliers). |
| POST | `/api/admin/livraria/estoque/movimentar` | Movimentação unitária (entrada/saída); atualiza bookstore_products e bookstore_stock_movements. |
| POST | `/api/admin/livraria/estoque/bulk-update` | Atualização em lote de estoque. |
| GET | `/api/admin/livraria/movimentacoes` | Lista movimentações. |
| GET | `/api/admin/livraria/dashboard` | Indicadores e listas (dashboard). |
| GET | `/api/admin/livraria/exportacao` | Exportação (produtos, movimentações, estoque baixo). |
| GET | `/api/admin/livraria/importacao/modelo` | Download de modelo XLSX. |
| POST | `/api/admin/livraria/importacao/validar` | Valida arquivo de importação. |
| POST | `/api/admin/livraria/importacao/processar` | Processa importação (produtos/estoque). |
| POST | `/api/admin/livraria/vendas` | Registro de venda (bookstore_sales, bookstore_sale_items, estoque, movimentações). |
| GET/POST | `/api/admin/livraria/mercadopago/lojas` | Lista/cria lojas MP (livraria_mp_store). |
| PATCH/DELETE | `/api/admin/livraria/mercadopago/lojas/[id]` | Atualiza ou exclui loja. |
| GET/POST | `/api/admin/livraria/mercadopago/caixas` | Lista/cria caixas POS (livraria_mp_pos). |
| GET/POST | `/api/admin/livraria/mercadopago/sessoes` | Lista/cria sessões de caixa (abertura). |
| PATCH | `/api/admin/livraria/mercadopago/sessoes/[id]` | Fecha sessão (fechamento de caixa). |
| POST | `/api/admin/livraria/mercadopago/orders` | Cria order de pagamento QR presencial (pos_id ou external_pos_id, total_amount, external_reference; mode: static/dynamic/hybrid). |
| GET | `/api/admin/livraria/mercadopago/orders/[id]` | Consulta order. |
| POST | `/api/admin/livraria/mercadopago/orders/[id]/cancel` | Cancela order (status created). |
| POST | `/api/admin/livraria/mercadopago/orders/[id]/refund` | Reembolso total (status processed). |

### 5.10 Serviços

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/services` | Serviços do site (config). |

---

## 6. Tabelas do banco de dados (Supabase / Postgres)

Tabelas referenciadas no código e nas migrations (schema `public`, salvo menção).

### 6.1 Auth e perfis

- **auth.users** – Supabase Auth (gerenciado pelo Supabase).
- **profiles** – Perfil por usuário (id = auth.users.id); colunas: role, email, access_profile_id, role_id, person_id; pode ter RLS.

### 6.2 RBAC (migrations 20260211_rbac_*)

- **resources** – Recursos/módulos (key, name, description, category, sort_order, is_active).
- **permissions** – Ações (action: view, create, edit, delete, manage).
- **roles** – Funções (key, name, is_admin, is_system, sort_order, is_active).
- **role_permissions** – (role_id, resource_id, permission_id).
- **app_permissions** – Funções nomeadas (code, resource_id, permission_id) para mapeamento view_gallery, create_post, etc.

### 6.3 Legado (se existir)

- **access_pages** – Páginas de acesso (legado).
- **access_profiles** – Perfis de acesso (legado); is_admin.
- **access_profile_permissions** – (profile_id, page_key, can_view, can_create, can_edit, can_delete).

### 6.4 Pessoas e consolidação

- **people** – Cadastro central (full_name, church_profile, church_situation, church_role, sex, birth_date, contatos, dados eclesiásticos, etc.); usado por Pessoas e Consolidação.
- **conversoes** – Conversões (nome, email, telefone, data_conversao, culto, person_id, consolidator_person_id, cell_id, conversion_type, instagram, church_id, team_id, gender, etc.).
- **churches** – Igrejas.
- **church_pastors** – (church_id, person_id).
- **cells** – Células (church_id, name, day_of_week, time_of_day, frequency, leader_person_id, co_leader_person_id).
- **cell_lt_members** – (cell_id, person_id).
- **arenas** – Arenas (church_id, name, day_of_week, time_of_day).
- **arena_leaders** – (arena_id, person_id).
- **teams** – Equipes (church_id OU arena_id, leader_person_id).
- **team_leaders** – (team_id, person_id) – múltiplos líderes.
- **conversion_message_templates** – type (accepted | reconciled), content.
- **consolidation_settings** – id = 1; disparos_api_enabled; pode ter updated_at.
- **disparos_log** (ou equivalente) – Log de chamadas ao webhook de disparos (se existir migration).

### 6.5 Galeria

- **galleries** – Álbums (type, title, slug, date, description, drive_folder_id, etc.).
- **gallery_files** – Arquivos do álbum (gallery_id, drive_file_id ou storage_path, uploaded_by_user_id, uploaded_by_name, etc.).

### 6.6 Instagram / Meta

- **instagram_instances** – Instâncias antigas (provider, access_token, ig_user_id, status).
- **instagram_post_drafts** – Rascunhos (gallery_id, created_by, status, caption, preset, publish_mode, scheduled_at).
- **instagram_post_assets** – Assets do rascunho (draft_id, source_url, storage_path, final_url, sort_order, status).
- **instagram_post_jobs** – Jobs (draft_id, instance_id, status, run_at, published_at).
- **meta_integrations** – Integrações Meta (page_id, page_name, instagram_business_account_id, instagram_username, access_token, etc.).
- **scheduled_social_posts** – Postagens programadas (album_id, created_by, scheduled_at, instance_ids, destinations, caption, media_specs, status).
- **social_post_demands** – Demandas de post (workflow).

### 6.7 Livraria (bookstore_*)

- **bookstore_categories** – id, name, description.
- **bookstore_suppliers** – Fornecedores.
- **bookstore_products** – sku, barcode, name, description, category_id, supplier_id, cost_price, sale_price, discount_type, discount_value, min_stock, current_stock, active, etc.
- **bookstore_product_images** – product_id, image_path, sort_order (Storage: bucket imagens).
- **bookstore_stock_movements** – product_id, type (entrada/saída/ajuste/perda), quantity, reason, etc.
- **bookstore_sales** – Vendas (cabecalho).
- **bookstore_sale_items** – Itens da venda (sale_id, product_id, quantity, etc.).

Função de banco (livraria): **get_next_product_sku** – gera próximo SKU quando não informado.

---

## 7. Bibliotecas (lib) – quando são usadas

| Arquivo | Uso |
|---------|-----|
| **admin-access-context** | Provider React que expõe snapshot de acesso e helpers (canView, canCreate, etc.) para o painel. |
| **admin-api** | `requireAccess`, `requireAccessAny`, `requireAdmin` – usados em rotas API admin. |
| **admin-client** | `getAccessTokenOrThrow()`, `adminFetchJson()` – chamadas autenticadas do cliente (páginas admin). |
| **auth-recovery** | `getSessionWithRecovery`, `clearSupabaseLocalSession` – layout admin e fluxos de sessão. |
| **date-utils** | `getTodayBrasilia()` – formulários de conversão e datas. |
| **disparos-webhook** | `callDisparosWebhook({ phone, nome, conversionType })` – chamado após salvar conversão (admin ou público) se API disparos ativa e env configurado. |
| **gallery-types** | Tipos Album, GalleryRow, WorshipServiceRow – galeria e posts. |
| **home-route** | `getConfiguredHomeRoute()` – redirecionamento da raiz. |
| **people** | `upsertPersonAndConversion()` – usado na página admin de conversões. |
| **rbac** | `getAccessSnapshotByToken`, `getAccessSnapshotFromRequest`, `hasPermission`, canView/canCreate/canEdit/canDelete/canManage, hasAppPermission – servidor (APIs e admin-check). |
| **rbac-types** | Tipos AccessSnapshot, Role, Resource, Permission, PermissionMap, APP_PERMISSION_CODES, etc. |
| **storage-url** | `getStorageUrl(path)` – URLs públicas de imagens (ex.: fotos de produtos). |
| **supabase** | Cliente Supabase no browser (auth e dados com RLS). |
| **supabase-server** | `supabaseServer`, `createSupabaseAdminClient(request)`, `createSupabaseServiceClient()` – APIs e server. |
| **types** | Tipos globais (ex.: SiteConfig). |
| **validators/person** | `personUpsertFromConversionSchema`, `normalizePhone`, `normalizeDate` – validação de pessoa/conversão. |
| **hooks/useRBAC** | Hook para páginas de roles (carrega recursos, permissões, roles). |

---

## 8. Fluxos principais

### 8.1 Conversão (público ou admin)

1. Usuário preenche formulário (nome, telefone, e-mail, data conversão, culto, igreja, aceitou/reconciliou, gênero, etc.).
2. Front chama `POST /api/public/consolidacao/conversao` (público) ou usa fluxo admin que chama `POST /api/admin/consolidacao/upsert-person-and-conversion`.
3. Backend valida com `personUpsertFromConversionSchema`; cria ou atualiza **people** (por CPF ou novo); insere **conversoes** com person_id, church_id, team_id, conversion_type, etc.
4. Se **consolidation_settings.disparos_api_enabled** e DISPAROS_WEBHOOK_* estão configurados, chama `callDisparosWebhook(phone, nome, conversionType)` e registra em **disparos_log** (se tabela existir).
5. Retorno: sucesso + message_id para exibir mensagem de template (aceitou/reconciliou) na página de sucesso.

### 8.2 Publicação no Instagram / Meta

1. Admin cria álbum na Galeria (ou usa existente); sobe fotos (Drive ou Storage).
2. Em “Criar post”, seleciona álbum e fotos → cria rascunho (instagram_post_drafts ou scheduled_social_posts conforme fluxo).
3. Editor: legenda, mídia, “Publicar agora” ou “Programar”.
4. Se programar: grava em **scheduled_social_posts** com scheduled_at e instance_ids.
5. Publicar agora: chama `POST /api/social/publish` ou `/api/meta/instagram/publish`; usa **meta_integrations** (token da página/Instagram).
6. Cron (ou botão “Processar fila”) chama `POST /api/social/run-scheduled` com header `x-cron-secret`; processa scheduled_social_posts com status pending e scheduled_at <= now.

### 8.3 Livraria – produto e estoque

1. **Produto:** POST em `/api/admin/livraria/produtos` (e PATCH em `/api/admin/livraria/produtos/[id]`); SKU opcional (get_next_product_sku). Fotos: POST em upload-image; DELETE em images/[imageId]. Categoria: GET/POST categorias; pode criar categoria nova no cadastro. Desconto: discount_type (valor/%), discount_value; aviso se preço final < custo. Estoque inicial no formulário gera movimentação de ajuste ao salvar.
2. **Movimentação:** POST `/api/admin/livraria/estoque/movimentar` (tipo, product_id, quantity, reason) → atualiza **bookstore_products.current_stock** e insere **bookstore_stock_movements**.
3. **Importação:** GET modelo XLSX; POST validar; POST processar → cria/atualiza produtos e/ou movimentações.
4. **Dashboard:** GET `/api/admin/livraria/dashboard` → agregados de produtos ativos, estoque baixo, entradas/saídas/perdas (30 dias), top produtos, etc.

---

## 9. Variáveis de ambiente

- **Supabase:** NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
- **Google Drive:** GOOGLE_DRIVE_ROOT_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_JSON (ou credenciais alternativas).
- **Meta:** META_APP_ID, META_APP_SECRET, NEXT_PUBLIC_META_REDIRECT_URI (ou META_REDIRECT_URI em dev).
- **Cron:** CRON_SECRET – para POST /api/social/run-scheduled.
- **Disparos:** DISPAROS_WEBHOOK_URL, DISPAROS_WEBHOOK_BEARER – webhook pós-conversão.

Consulte `.env.example` para a lista completa e valores de exemplo.

---

## 10. Migrations (Supabase)

Ordem aproximada das migrations em `supabase/migrations/`:

- create_consolidacao_module.sql – conversoes (inicial).
- 20260210_instagram.sql – instagram_instances, drafts, assets, jobs.
- 20260210_meta_integrations_rls.sql – meta_integrations.
- 20260210_instagram_rls_fix.sql, 20260210_galeria_*, 20260210_meta_* – ajustes.
- 20260211_rbac_complete_system.sql – resources, permissions, roles, role_permissions, profiles.role_id.
- 20260211_app_permissions_named_functions.sql – app_permissions, get_user_permissions.
- 20260211_scheduled_social_posts.sql – scheduled_social_posts.
- 20260211_gallery_files_uploaded_by.sql – gallery_files.uploaded_by_*.
- 20260211_temp_gallery_uploads_bucket.sql – Storage.
- 20260212_social_post_demands_workflow.sql – social_post_demands.
- 20260214_01_create_people_and_link_consolidacao.sql – people, conversoes.person_id, RLS.
- 20260214_000001_consolidacao_cadastros.sql – churches, cells, arenas, teams, church_pastors, cell_lt_members, arena_leaders, conversoes (novos campos).
- 20260214_02_backfill_profiles_person_id.sql – profiles.person_id.
- 20260214_03 a 20260214_10 – cells/teams/conversoes (church_id, team_id, gender, etc.), conversion_message_templates.
- 20260215_fix_conversoes_columns.sql – ajustes em conversoes.

As tabelas da **livraria** (bookstore_*) podem ter sido criadas em migrations removidas ou em outro repositório; o código atual espera que existam no banco. Em ambiente novo, é necessário criar essas tabelas (e a função get_next_product_sku) conforme o uso nas APIs acima.

---

*Documento gerado a partir do código e das migrations do projeto. Última atualização: fevereiro 2025.*
