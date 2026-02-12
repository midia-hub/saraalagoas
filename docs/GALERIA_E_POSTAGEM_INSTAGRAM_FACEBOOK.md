# Galeria, postagem no Instagram e no Facebook

Documento único que descreve **toda a parte de galeria** (admin e pública), **conexão de contas Meta** (Instagram/Facebook) e **fluxo de postagem** (imediata e programada).

---

## 1. Visão geral

| Área | O que é |
|------|--------|
| **Galeria (admin)** | Listagem de álbuns, fotos por álbum (Google Drive), upload de novas fotos, exclusão de álbum. |
| **Galeria (pública)** | Páginas do site onde o visitante vê álbuns e fotos por tipo/slug/data. |
| **Configurações Instagram/Facebook** | Conectar contas Meta via OAuth (páginas Facebook + contas Instagram Business). |
| **Criar post** | Selecionar fotos do álbum → editar (crop, ordem) → escolher conta e destinos → publicar agora ou programar. |
| **Painel de publicações** | Ver fila de jobs (legado), postagens programadas e status; botão "Processar fila agora". |

Ordem lógica para o usuário: **Conectar conta Meta** → **Criar álbum/upload** (ou usar álbum existente) → **Criar post** a partir do álbum → **Publicar** ou **Programar**.

---

## 2. Galeria – admin

### 2.1 Listagem de álbuns

- **Rota:** `/admin/galeria`
- **API:** `GET /api/gallery/list` — retorna álbuns (id, type, title, slug, date, created_at, drive_folder_id).
- **Funcionalidades:**
  - Filtros: busca por texto, tipo (culto/evento), período (últimos 7/30 dias, mês atual, mês passado), ordenação (mais recente, etc.).
  - Cards de álbum com capa (primeira foto), título, tipo, data, quantidade de fotos; link para o álbum e para "Criar post".
  - Excluir álbum: modal de confirmação; botão com spinner "Excluindo..."; API `DELETE /api/gallery/[id]`.
- **Estado de carregamento:** componente `GaleriaLoading` na carga inicial; mensagem de erro amigável se falhar a listagem.

### 2.2 Página do álbum

- **Rota:** `/admin/galeria/[id]`
- **APIs usadas:**
  - `GET /api/gallery/[id]` — dados do álbum.
  - `GET /api/gallery/[id]/files` — lista de arquivos (id, thumbnailLink, webViewLink) do Drive.
- **Funcionalidades:**
  - Exibição das fotos do álbum; lightbox para ampliar.
  - Botão **Criar post** (leva a `/admin/galeria/[id]/post/select`).
  - Opção de excluir álbum inteiro (com confirmação).
- **Origem das imagens:** Google Drive (pasta do álbum referenciada em `galleries.drive_folder_id`). Uploads grandes podem usar o bucket Supabase `temp-gallery-uploads` e depois a API envia ao Drive.

### 2.3 APIs de galeria (resumo)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/gallery/list` | Listar todos os álbuns |
| GET | `/api/gallery/[id]` | Dados de um álbum |
| GET | `/api/gallery/[id]/files` | Arquivos (fotos) do álbum |
| GET | `/api/gallery/image?fileId=...&mode=thumb\|full` | Imagem (proxy a partir do Drive) |
| POST | `/api/gallery/create` | Criar galeria (FormData: tipo, título, data, etc.) |
| POST | `/api/gallery/[id]/upload` | Upload de arquivo para o álbum (vai para o Drive) |
| POST | `/api/gallery/[id]/upload-from-storage` | Enviar arquivo do bucket temporário para o Drive |
| GET | `/api/gallery/prepare` | Preparar upload (retorna URL ou config para upload grande) |
| DELETE | `/api/gallery/[id]` | Excluir álbum e registros de imagens (não remove arquivos do Drive) |

Todas as rotas de escrita exigem permissão admin (cookie de acesso e, quando aplicável, permissão RBAC para galeria).

### 2.4 Banco de dados – galeria

- **galleries** — id, type (culto/evento), title, slug, date, drive_folder_id, created_at, etc.
- **gallery_files** — id, gallery_id, file_id (referência ao Drive ou storage), sort_order, uploaded_by_user_id, etc.

As imagens ficam no **Google Drive**; o banco guarda referências. O bucket **instagram_posts** no Supabase é usado para imagens processadas (crop/JPEG) antes de enviar ao Meta.

---

## 3. Configurações do Instagram/Facebook (Meta OAuth)

### 3.1 O que é

Conexão de **páginas do Facebook** e **contas Instagram Business** vinculadas a essas páginas, para poder publicar em nome da página/Instagram.

- **Rota no menu:** "Configurações do Instagram/Facebook" (`/admin/instancias`).
- **Fluxo:** Conectar conta (login Meta) → selecionar página → integração salva em `meta_integrations`. Cada integração pode publicar no **Instagram** (conta Business ligada à página) e no **Facebook** (página).

### 3.2 APIs Meta (OAuth e integrações)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/meta/oauth/start` | Iniciar OAuth (redireciona para login Meta) |
| GET | `/api/meta/oauth/callback` | Callback após login; troca código por token |
| GET | `/api/meta/select-page` | Seleção de página (quando há mais de uma) |
| GET | `/api/meta/integrations` | Listar integrações do usuário |
| GET/DELETE | `/api/meta/integrations/[id]` | Ver ou desvincular uma integração |
| POST | `/api/meta/add-page` | Adicionar outra página à conta |
| GET | `/api/meta/recent-posts` | Últimas postagens do Instagram e Facebook dos últimos 30 dias (por integração conectada) |

### 3.3 Scopes utilizados

- `pages_show_list` — listar páginas do Facebook.
- `pages_read_engagement` — leitura de engajamento da página.
- `instagram_basic` — acesso básico ao Instagram.
- `instagram_content_publish` — publicar no Instagram.
- `pages_manage_posts` — publicar na página do Facebook.

### 3.4 Banco de dados – Meta

- **meta_integrations** — id, created_by, page_id, page_access_token, instagram_business_account_id, is_active, token_expires_at, metadata (pending_page_selection, etc.). RLS e políticas restringem por usuário.

### 3.5 Checklist de publicação

Na interface, cada integração exibe um “checklist” de permissões (ex.: token válido, conta Instagram Business vinculada, scopes). Se algo falhar, o botão **Reconectar permissões** inicia novamente o OAuth para atualizar o token e os scopes. Botões **Conectar conta** e **Reconectar** têm indicador de carregamento.

---

## 4. Fluxo de criação de post (Instagram/Facebook)

### 4.1 Passo a passo

1. **Seleção de fotos** — `/admin/galeria/[id]/post/select`
   - Lista todas as fotos do álbum.
   - Usuário seleciona até **10 fotos** (limite do carrossel do Instagram).
   - "Confirmar seleção" envia as mídias para o rascunho (localStorage) e vai para o create.

2. **Edição e composição** — `/admin/galeria/[id]/post/create`
   - **Reordenar:** arrastar e soltar (drag-and-drop).
   - **Editar cada foto:** modal com Cropper.js — proporções 1:1, 1.91:1, 4:5, original; rotação, zoom; texto alternativo.
   - **Lightbox:** clicar na imagem para ver em tela cheia.
   - **Adicionar/remover:** voltar à seleção ou remover itens do rascunho.
   - **Conta e destinos:** escolher uma ou mais integrações Meta (lista vem de `meta_integrations`); marcar **Instagram** e/ou **Facebook** como destino.
   - **Texto da postagem:** campo de legenda.
   - **Quando publicar:** "Publicar agora" ou "Programar postagem" (data e hora).
   - Botão **Publicar** com spinner "Publicando...".

3. **Após publicar**
   - Sucesso: rascunho é limpo; redirecionamento para **Painel de publicações** (`/admin/instagram/posts`).
   - Se programado: mensagem de confirmação (ex.: "Postagem agendada."); o post entra na lista de programadas e será publicado no horário (ou ao clicar "Processar fila agora").

### 4.2 Componentes do módulo de post

| Componente | Função |
|------------|--------|
| **PhotoPickerGrid** | Grid de fotos na seleção (checkboxes). |
| **PhotoPickerToolbar** | Barra com contador e "Confirmar seleção". |
| **MediaManager** | Grid reordenável de mídia no create; adicionar, editar, remover, lightbox. |
| **EditPhotoModal** | Edição com Cropper.js (proporções, rotação, zoom, alt text). |
| **SortableMediaGrid** | Reordenação com @dnd-kit. |
| **ImageLightbox** | Visualização em tela cheia (yet-another-react-lightbox). |
| **PostComposer** | Seleção de conta, destinos (Instagram/Facebook), texto, botão Publicar. |
| **PostPreview** | Preview da postagem. |
| **usePostDraft** | Hook que persiste rascunho no localStorage (mídia, texto, conta, destinos). |

### 4.3 Validações na interface

- Pelo menos uma plataforma (Instagram ou Facebook) deve estar marcada.
- Instagram: no máximo 10 imagens por post (carrossel).
- Programar: data/hora obrigatória e no futuro.
- Pelo menos uma conta Meta com checklist concluído; caso contrário, a interface orienta a conectar em "Configurações do Instagram/Facebook".

---

## 5. API de publicação – POST /api/social/publish

### 5.1 Corpo da requisição (JSON)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| albumId | string | Sim | ID do álbum (galeria). |
| instanceIds | string[] | Sim | IDs de instância no formato `meta_ig:<integration_id>` ou `meta_fb:<integration_id>`. |
| destinations | object | Sim | `{ instagram: boolean, facebook: boolean }` — pelo menos um true. |
| text | string | Sim | Legenda da postagem. |
| mediaEdits | array | Sim | Para cada mídia: `{ id, cropMode?, altText?, croppedUrl? }`. `id` = fileId do Drive. |
| scheduled_at | string (ISO) | Não | Se enviado e no futuro, **programa** a postagem em vez de publicar na hora. |

### 5.2 Comportamento

- **Sem `scheduled_at` (ou no passado):** chama `executeMetaPublish` e publica imediatamente no Meta; retorna `ok`, `message`, `metaResults` (por conta/publicação).
- **Com `scheduled_at` no futuro:** grava um registro em **scheduled_social_posts** (album_id, created_by, scheduled_at, instance_ids, destinations, caption, media_specs, status = 'pending'); não publica na hora; retorna `ok: true`, `scheduled: true`, `scheduledAt`, `id`.

### 5.3 Respostas de erro (exemplos)

- 400: albumId obrigatório; nenhuma conta; nenhuma mídia; nenhuma plataforma (Instagram/Facebook) escolhida; apenas integrações Meta são aceitas.
- 404: galeria não encontrada.
- 500: falha ao agendar (insert em scheduled_social_posts) ou falha na publicação Meta.

---

## 6. Publicação no Meta – lógica (lib/publish-meta.ts)

### 6.1 Visão geral

A função **executeMetaPublish**:

1. Valida mídias e monta as “seleções” Meta (Instagram e/ou Facebook por integração).
2. Busca as integrações em **meta_integrations** (ativas, do usuário).
3. Para cada mídia: se houver `croppedUrl` (base64), usa; senão baixa do Drive. Aplica **crop** conforme `cropMode` (sharp), converte para JPEG e faz upload para o bucket Supabase **instagram_posts**.
4. Obtém URLs públicas dessas imagens.
5. **Instagram:** uma imagem → container de mídia → publicar; várias → containers de itens de carrossel → container de carrossel → publicar (Graph API).
6. **Facebook:** uma imagem → POST na página (photos); várias → upload de cada foto como não publicada, depois POST no feed com `attached_media`.

### 6.2 Proporções de crop

- `original` — mantém proporção.
- `1:1` — quadrado (recomendado Instagram).
- `1.91:1` — horizontal.
- `4:5` — vertical.

### 6.3 Resultado

Retorno: `{ metaResults: Array<{ instanceId, provider: 'instagram'|'facebook', ok, error? }> }`. Cada conta selecionada gera um item; se alguma falhar, `ok: false` e `error` com mensagem (ex.: integração não encontrada, token expirado).

---

## 7. Postagens programadas

### 7.1 Tabela scheduled_social_posts

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK. |
| album_id | uuid | FK galleries. |
| created_by | uuid | FK profiles (quem agendou). |
| scheduled_at | timestamptz | Data/hora para publicar. |
| instance_ids | jsonb | Array de IDs (ex.: ["meta_ig:uuid"]). |
| destinations | jsonb | { instagram: true, facebook: false }. |
| caption | text | Legenda. |
| media_specs | jsonb | Array de { id, cropMode, altText } (fileIds do Drive). |
| status | text | pending | publishing | published | failed. |
| published_at | timestamptz | Preenchido quando status = published. |
| error_message | text | Preenchido quando status = failed. |
| created_at, updated_at | timestamptz | Auditoria. |

RLS: leitura para autenticados; insert/update apenas para editores/admins e `created_by = auth.uid()` quando aplicável.

### 7.2 Processar fila – POST /api/social/run-scheduled

- **Quem pode chamar:** usuário com permissão de edição no recurso Instagram (painel) **ou** cron com header `x-cron-secret: <CRON_SECRET>`.
- **O que faz:** busca registros em **scheduled_social_posts** com `status = 'pending'` e `scheduled_at <= now()`, até 20 por vez. Para cada um: atualiza status para `publishing`, chama **executeMetaPublish** com os dados salvos (album_id, created_by, instance_ids, destinations, caption, media_specs), depois atualiza para `published` (e preenche published_at) ou `failed` (e preenche error_message).

### 7.3 Listar programadas – GET /api/social/scheduled

- Retorna as postagens programadas (pending, published, failed) com dados do álbum (galleries.id, title, type, date). Usado pelo **Painel de publicações** para exibir a seção "Postagens programadas".

---

## 8. Painel de publicações

- **Rota:** `/admin/instagram/posts`
- **Conteúdo:**
  - **Abas:** Lista | Calendário | Fluxo de aprovação.
  - **Lista:**
    - **Filtros:** status (Todos, Programadas, Publicadas, Falhas), período (últimos 7/30 dias, mês atual, mês passado), conta Meta.
    - **Postagens programadas:** cards com miniatura (primeira mídia do álbum), título (galeria), data/hora, legenda, status, link "Editar / reprogramar" para postagens pendentes.
    - **Publicações da fila:** jobs legado (instagram_post_jobs); cards com miniatura, status, link "Ver no Instagram" quando publicado.
  - **Calendário:** visualização **Mês** (react-calendar com contagem de postagens por dia), **Semana** (arrastar e soltar para reprogramar; `PATCH /api/social/scheduled/[id]` com `scheduled_at`), **Dia** (lista por hora com link Editar).
  - **Fluxo de aprovação:** diagrama React Flow com as 7 etapas (Demanda → Artes → Copywriting → Aprovação interna → Aprovação externa → Programação → Publicada). Tabela `social_post_demands` (migration `20260212_social_post_demands_workflow.sql`) para demandas com workflow_step; e-mails automáticos por etapa podem ser implementados via Edge Function.
  - Botão **Processar fila agora:** chama `POST /api/admin/instagram/jobs/run-due` e `POST /api/social/run-scheduled`; exibe spinner "Processando…"; toast de sucesso ou erro.
  - Link **Nova postagem** para `/admin/galeria`.

---

## 9. Galeria pública (site)

- **Rotas:** `/galeria`, `/galeria/[tipo]/[slug]/[date]` (ex.: culto, evento).
- **Dados:** álbuns e arquivos vêm do Supabase/Drive; imagens servidas via `GET /api/gallery/image?fileId=...&mode=thumb|full`.
- **Texto de erro:** "Não conseguimos localizar a galeria." quando o álbum não existe ou não está acessível.

---

## 10. Variáveis de ambiente relevantes

| Variável | Uso |
|----------|-----|
| GOOGLE_DRIVE_ROOT_FOLDER_ID | Pasta raiz da galeria no Drive. |
| GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS | Autenticação Drive. |
| META_APP_ID, META_APP_SECRET | App Meta. |
| NEXT_PUBLIC_META_REDIRECT_URI / META_REDIRECT_URI | Callback OAuth. |
| META_SCOPES | Scopes (pages_show_list, instagram_content_publish, etc.). |
| META_STATE_SECRET | Estado OAuth. |
| CRON_SECRET | Chamada segura a POST /api/social/run-scheduled (cron). |

---

## 11. Documentação relacionada

- **app/admin/galeria/[id]/post/README.md** — Estrutura de arquivos, funcionalidades e uso do módulo de post.
- **app/admin/galeria/[id]/post/FLUXO_POSTAGEM.md** — Componentes (ImageUploader, EditPhotoModal, SortableMediaGrid, MediaManager, etc.) e fluxo passo a passo.
- **DOCUMENTACAO_PLATAFORMA.md** — Visão geral da plataforma, APIs e integrações.
- **supabase/migrations/20260211_scheduled_social_posts.sql** — Definição da tabela de postagens programadas.

---

*Última atualização: Fevereiro 2026.*
