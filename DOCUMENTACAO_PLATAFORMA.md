# Documentação Geral da Plataforma

Atualizado em: **01/03/2026**

Este documento consolida o estado atual do sistema com foco em:
- funcionalidades por módulo;
- páginas e APIs existentes;
- tabelas e funções de banco;
- fluxos de registro/atualização de dados;
- uso completo da API de disparos (WhatsApp/templates).

---

## 1) Visão geral técnica

- **Framework:** Next.js (App Router) + React + TypeScript.
- **Dados:** Supabase (Postgres, Auth, Storage, RLS).
- **Infra:** Vercel + rotas serverless + jobs assíncronos em `background_jobs`.
- **Integrações externas:**
  - Meta (Instagram/Facebook OAuth e publicação);
  - Mercado Pago (PDV e pagamentos);
  - Google Drive (galeria/upload);
  - API de disparos (templates WhatsApp).

---

## 2) Módulos funcionais (o que existe hoje)

## 2.1 Público
- Home, galeria pública, cultos/eventos.
- Formulário de conversão com gravação em `people` + `conversoes`.
- Reserva de salas (consulta disponibilidade + envio de solicitação).
- Escalas públicas por token (visualização, disponibilidade, solicitação de troca).
- Sara Kids público (`/api/public/sara-kids`).
- Revisão de Vidas: inscrição e anamnese pública por token.
- XP26: pesquisa e resultados.

## 2.2 Admin
- Dashboard e configurações gerais.
- RBAC (roles, resources, permissions, app_permissions).
- Pessoas (CRUD, merge, importação, vínculo com usuário, disparo individual).
- Consolidação (conversões, followups, cadastros base, mensagens, disparos on/off).
- Células (cadastro, realizações, presença, aprovação de PD).
- Escalas (cadastro, geração, publicação, preview de destinatários, disparos e lembretes).
- Reservas de salas (aprovar/reprovar/cancelar + templates de mensagem).
- Sara Kids (check-in/out, responsáveis, notificações em lote).
- Mídia/Instagram/Meta (demandas, etapas, disparos, rascunhos, jobs, publicação).
- Livraria/PDV (produtos, estoque, vendas, fiado, cupons, importação, Mercado Pago).
- Liderança/Discipulado e presença de culto.
- Revisão de Vidas (eventos, inscrições, anamneses, logs).

---

## 3) Autenticação e autorização

- **Auth:** Supabase Auth (email/senha, recuperação, convite/link mágico).
- **Snapshot de acesso:** `POST /api/auth/admin-check` retorna permissões e flags (`canAccessAdmin`, `isAdmin`).
- **RBAC principal:** tabelas `roles`, `role_permissions`, `resources`, `permissions`, `app_permissions`.
- **Controle de API admin:** `requireAccess`, `requireAccessAny`, `requireAdmin` em `lib/admin-api.ts`.
- **Compatibilidade legado:** ainda há leitura/uso de `access_profiles` e `access_profile_permissions` em partes do sistema.

---

## 4) Fluxos de registro (como cada módulo grava dados)

## 4.1 Pessoas e conversões
- **Público:** `POST /api/public/consolidacao/conversao`
  - grava em `people` (quando necessário) e `conversoes`;
  - cria followup automático em `consolidation_followups`;
  - se `consolidation_settings.disparos_api_enabled`, dispara template e registra em `disparos_log`.
- **Admin:** `POST /api/admin/consolidacao/upsert-person-and-conversion`
  - mesma lógica de cadastro/upsert;
  - cria followup automático;
  - registra disparo em `disparos_log` quando habilitado.

## 4.2 Reservas de salas
- **Solicitação pública:** `POST /api/public/reservas/submit`
  - grava reserva em `room_reservations`;
  - dispara para solicitante (`reserva_recebida`) e aprovador (`reserva_pendente_aprovacao`) quando habilitado;
  - registra retornos em `disparos_log`.
- **Ações admin:**
  - aprovar: `POST /api/admin/reservas/reservations/[id]/approve`;
  - reprovar: `POST /api/admin/reservas/reservations/[id]/reject`;
  - cancelar: `POST /api/admin/reservas/reservations/[id]/cancel`.
- Todas as transições com disparo registram status em `disparos_log`.

## 4.3 Escalas
- Criação/edição: `/api/admin/escalas` e sub-rotas.
- Publicação sincroniza em tabelas de escala (incluindo `escalas_assignments`).
- Disparos:
  - manual por escala: `POST /api/admin/escalas/[id]/disparar` (job em `background_jobs`);
  - manual por data/tipo: `POST /api/admin/escalas/disparar-lembretes`;
  - cron: `GET /api/cron/escalas-lembretes`.
- Logs: todos os envios entram em `disparos_log`.

## 4.4 Sara Kids
- Check-in: `POST /api/admin/kids-checkin` grava em `kids_checkin` e dispara `kids_checkin`.
- Checkout: `PATCH /api/admin/kids-checkin/[id]` atualiza `kids_checkin` e dispara `kids_checkout`.
- Notificações em massa: `POST /api/admin/kids-checkin/notifications` (job em `background_jobs`) para `kids_alerta` e `kids_encerramento`.
- Logs de envio em `disparos_log`.

## 4.5 Mídia / Demandas
- Disparo por etapa: `POST /api/admin/midia/demandas/[id]/steps/[stepId]/disparo`.
- Grava histórico específico em `media_demand_disparos` e também log unificado em `disparos_log`.

## 4.6 Livraria/PDV
- Produtos, estoque, vendas, itens, cupons, clientes e pagamentos gravam nas tabelas `bookstore_*`.
- Fluxos Mercado Pago sincronizam pagamento e estoque (`mark-sale-paid-from-order`, webhook MP).

---

## 5) API de disparos (documentação completa)

## 5.1 Configuração obrigatória
- `DISPAROS_WEBHOOK_URL`
- `DISPAROS_WEBHOOK_BEARER`

## 5.2 Biblioteca central
Arquivo: `lib/disparos-webhook.ts`

Funções:
- `getNomeExibicao(nome)`
- `sendDisparoRaw({ phone, messageId, variables })`
- `callDisparosWebhook({ phone, nome, conversionType, variables? })`

Comportamentos:
- normaliza telefone para E.164 (`55...`);
- envia `channel_id` fixo do ambiente atual;
- falha de webhook **não quebra** fluxo de negócio (retorna resultado para log);
- para reservas e conversões usa `conversionType` para mapear template.

## 5.3 Templates/Message IDs usados

### Conversão
- `accepted` → `d3d770e5-6c68-4c91-b985-ceb920768a61`
- `reconciled` → `8f32bd0d-ae13-4261-af91-4845284ab1fe`

### Reservas
- `reserva_recebida` → `589eb419-039e-479b-8def-13c99b63055d`
- `reserva_pendente_aprovacao` → `ec0fba84-6657-405f-ad19-1c978e254c9c`
- `reserva_aprovada` → `6532739c-c972-481f-bdf3-c707dfabe3e5`
- `reserva_reprovada` → `0d9a3be9-a8d4-4eb1-b6f0-c6aa7b37ca93`
- `reserva_cancelada` → `d03afd1c-ccd7-4907-a2a3-97353dea71a4`

### Escalas
- `MESSAGE_ID_ESCALA_MES` → `4519f7f2-f890-42be-a660-69baec1b1dc5`
- `MESSAGE_ID_ESCALA_LEMBRETE_3` → `91915ca1-0419-43b5-a70c-df0c0b92379f`
- `MESSAGE_ID_ESCALA_LEMBRETE_1` → `96a161e3-087c-4755-b31e-0c127c36d6b9`
- `MESSAGE_ID_ESCALA_DIA` → `27eb5277-f8d8-45b3-98cc-15f9e0b55d0c`

### Mídia (parametrizável por env)
- `MESSAGE_ID_DEMANDA_ARTE` → `process.env.MESSAGE_ID_DEMANDA_ARTE`
- `MESSAGE_ID_DEMANDA_VIDEO` → `process.env.MESSAGE_ID_DEMANDA_VIDEO`

### Sara Kids
- `MESSAGE_ID_KIDS_CHECKIN` → `7f9fb081-bb8f-4db7-9b9c-25df8c3b110a`
- `MESSAGE_ID_KIDS_CHECKOUT` → `02b7e040-2655-4547-942e-a9814ad96bf5`
- `MESSAGE_ID_KIDS_ALERTA` → `0db51837-8f01-4b69-a6c6-d369bd4801b4`
- `MESSAGE_ID_KIDS_ENCERRAMENTO` → `851978a9-e0d2-4202-b332-4b144476a247`

### Disparo individual (cadastro pessoa)
- `MESSAGE_ID_CULTO` → `16155aa7-ce8f-4bba-a37a-b4d60c04782f`
- `MESSAGE_ID_ARENA` → `bfaa202b-e385-4c2f-9fe5-ce0b026b80c5`
- `MESSAGE_ID_MOMENTO_DEUS` → `fc1e2ddf-dea2-4422-abf8-f36df567e678`

## 5.4 Onde a API de disparos é usada
- Conversão pública: `/api/public/consolidacao/conversao`
- Conversão admin: `/api/admin/consolidacao/upsert-person-and-conversion`
- Reservas: `/api/public/reservas/submit`, `/api/admin/reservas/reservations/[id]/approve|reject|cancel`
- Escalas: `/api/admin/escalas/[id]/disparar`, `/api/admin/escalas/disparar-lembretes`, `/api/cron/escalas-lembretes`, `lib/escalas-notificacoes.ts`
- Sara Kids: `/api/admin/kids-checkin`, `/api/admin/kids-checkin/[id]`, `/api/admin/kids-checkin/notifications`
- Mídia: `/api/admin/midia/demandas/[id]/steps/[stepId]/disparo`
- Pessoa individual: `/api/admin/pessoas/[id]/disparar`

## 5.5 Log unificado de disparos
Tabela: `disparos_log`

Campos usados no código:
- `phone`
- `nome`
- `conversion_type`
- `status_code`
- `source`
- `created_at`

Consulta e auditoria:
- `GET /api/admin/disparos-log` (retorna logs + jobs + status de cron).

---

## 6) Banco de dados

## 6.1 Tabelas detectadas nas migrations ativas (`supabase/migrations`, excluindo `_old`)

- `app_permissions`
- `arenas`
- `background_jobs`
- `cell_attendances`
- `cell_members`
- `cell_realizations`
- `cells`
- `churches`
- `consolidation_followups`
- `consolidation_messages`
- `conversoes`
- `discipulados`
- `disparos_webhook`
- `escalas_links`
- `escalas_respostas`
- `escalas_slots`
- `galleries`
- `gallery_files`
- `instagram_accounts`
- `instagram_posts`
- `kids_checkin`
- `media_agenda_event_days`
- `media_agenda_events`
- `media_agenda_items`
- `media_demands`
- `mercadopago_webhooks`
- `meta_tokens`
- `ministries`
- `offerings`
- `people`
- `people_kids_links`
- `people_ministries`
- `permissions`
- `prayer_requests`
- `product_categories`
- `products`
- `profiles`
- `resources`
- `revisao_vidas_anamneses`
- `revisao_vidas_events`
- `revisao_vidas_inscricao_logs`
- `revisao_vidas_payment_validations`
- `revisao_vidas_registration_statuses`
- `revisao_vidas_registrations`
- `role_permissions`
- `roles`
- `room_message_templates`
- `room_reservations`
- `rooms`
- `sale_items`
- `sales`
- `site_config`
- `social_posts`
- `stock_movements`
- `teams`
- `worship_attendance`
- `worship_attendance_visitors`
- `worship_services`
- `worship_sessions`
- `xp26_feedback`

## 6.2 Funções SQL detectadas nas migrations ativas
- `calculate_revisao_registration_status`
- `generate_sale_number`
- `get_my_disciples_attendance`
- `get_user_permissions`
- `set_sale_number`
- `set_updated_at`
- `trg_update_anamnese_completed`
- `update_stock_on_sale`
- `update_updated_at_column`

## 6.3 Tabelas referenciadas no código (inclui legado/compatibilidade)
Além das tabelas acima, o código também referencia:
- `access_profiles`
- `access_profile_permissions`
- `arena_leaders`
- `bookstore_*` (`bookstore_products`, `bookstore_stock_movements`, `bookstore_sales`, etc.)
- `church_pastors`
- `escalas_assignments`
- `escalas_publicadas`
- `media_demand_disparos`, `media_demand_step_assignees`, `media_demand_step_tags`
- `team_leaders`
- outras tabelas de apoio de módulos específicos.

---

## 7) Inventário completo de páginas (App Router)

```text
/
/(public)/reservar-sala
/(public)/sara-kids
/admin
/admin/acesso-negado
/admin/celulas
/admin/celulas/[id]
/admin/celulas/dashboard
/admin/celulas/pd-management
/admin/completar-cadastro
/admin/configuracoes
/admin/consolidacao/acompanhamento
/admin/consolidacao/cadastros
/admin/consolidacao/cadastros/api-disparos
/admin/consolidacao/cadastros/arenas
/admin/consolidacao/cadastros/celulas
/admin/consolidacao/cadastros/equipes
/admin/consolidacao/cadastros/igrejas
/admin/consolidacao/cadastros/igrejas/[id]
/admin/consolidacao/cadastros/mensagens-conversao
/admin/consolidacao/cadastros/pessoas
/admin/consolidacao/conversoes
/admin/consolidacao/conversoes/sucesso
/admin/consolidacao/lista
/admin/consolidacao/relatorios
/admin/conta
/admin/criar-acesso
/admin/escalas
/admin/escalas/[id]
/admin/escalas/[id]/trocas
/admin/escalas/[id]/voluntarios
/admin/galeria
/admin/galeria/[id]
/admin/galeria/[id]/post/create
/admin/galeria/[id]/post/select
/admin/instagram
/admin/instagram/instances
/admin/instagram/post/editor
/admin/instagram/post/new
/admin/instagram/post/publish
/admin/instagram/posts
/admin/instancias
/admin/instancias/add-page
/admin/instancias/oauth-done
/admin/instancias/select
/admin/instancias/youtube-done
/admin/lideranca
/admin/lideranca/estrutura
/admin/lideranca/meu-discipulado
/admin/lideranca/rede-completa
/admin/livraria/clientes
/admin/livraria/clientes/[id]
/admin/livraria/cupons
/admin/livraria/dashboard
/admin/livraria/estoque
/admin/livraria/fiado
/admin/livraria/fiado/relatorio
/admin/livraria/importacao
/admin/livraria/loja-caixa
/admin/livraria/movimentacoes
/admin/livraria/produtos
/admin/livraria/vendas
/admin/livraria/vendas/[id]/recibo
/admin/livraria/vendas/historico
/admin/livraria/vendas/mercadopago/retorno
/admin/login
/admin/midia/agenda-social
/admin/midia/demandas
/admin/midia/demandas/[id]
/admin/midia/ia-config
/admin/midia/nova-postagem
/admin/pessoas
/admin/pessoas/[id]
/admin/pessoas/novo
/admin/reservas
/admin/reservas/salas
/admin/reservas/salas/[id]
/admin/reset-senha
/admin/revisao-vidas
/admin/revisao-vidas/[id]
/admin/revisao-vidas/[id]/anamneses
/admin/revisao-vidas/anamneses
/admin/revisao-vidas/inscritos
/admin/roles
/admin/roles/[id]
/admin/sara-kids
/admin/sara-kids/checkin
/admin/sara-kids/presentes
/admin/settings
/admin/upload
/admin/usuarios
/admin/xp26-pesquisa-resultados
/cultos
/escalas/[token]
/escalas/[token]/escala
/eventos
/formulario-conversao
/formulario-conversao/sucesso
/galeria
/galeria/[tipo]/[slug]/[date]
/lideranca/presenca-culto
/privacidade
/redefinir-senha
/revisao-vidas/anamnese/[token]
/revisao-vidas/inscricao/[eventId]
/upload
/upload-fotos
/xp26-pesquisa
/xp26-resultados
```

---

## 8) Inventário completo de APIs (rota + métodos)

```text
/api/admin/app-permissions :: GET
/api/admin/celulas :: GET, POST
/api/admin/celulas/attendance/[id] :: DELETE
/api/admin/celulas/attendance-toggle :: POST
/api/admin/celulas/check-duplicates :: GET, DELETE
/api/admin/celulas/confirmar-pd :: POST
/api/admin/celulas/pd-config :: GET, PATCH
/api/admin/celulas/pd-management :: GET
/api/admin/celulas/pd-management/[id]/approve :: POST
/api/admin/celulas/pd-management/[id]/reject :: POST
/api/admin/celulas/realizacoes :: GET, POST
/api/admin/celulas/realizacoes/[id] :: PATCH
/api/admin/celulas/realizacoes/[id]/approve-edit :: POST
/api/admin/celulas/[id] :: GET, PATCH, DELETE
/api/admin/celulas/[id]/people :: GET, POST, PATCH, DELETE
/api/admin/celulas/[id]/people/[personId] :: DELETE
/api/admin/consolidacao/arenas :: GET, POST
/api/admin/consolidacao/arenas/[id] :: PATCH, DELETE
/api/admin/consolidacao/attendance :: GET, POST
/api/admin/consolidacao/cadastros/arenas :: GET
/api/admin/consolidacao/cells :: GET, POST
/api/admin/consolidacao/cells/[id] :: GET, PATCH, DELETE
/api/admin/consolidacao/churches :: GET, POST
/api/admin/consolidacao/churches/[id] :: GET, PATCH, DELETE
/api/admin/consolidacao/conversion-messages :: GET, PATCH
/api/admin/consolidacao/conversoes :: GET
/api/admin/consolidacao/disparos-settings :: GET, PATCH
/api/admin/consolidacao/followups :: GET, POST
/api/admin/consolidacao/followups/[id] :: GET, PATCH, DELETE
/api/admin/consolidacao/lookups/arenas :: GET
/api/admin/consolidacao/lookups/cells :: GET
/api/admin/consolidacao/lookups/children :: GET
/api/admin/consolidacao/lookups/churches :: GET
/api/admin/consolidacao/lookups/people :: GET
/api/admin/consolidacao/lookups/teams :: GET
/api/admin/consolidacao/my-disciples :: GET
/api/admin/consolidacao/people :: GET, POST
/api/admin/consolidacao/people/[id] :: PATCH, DELETE
/api/admin/consolidacao/pessoas :: GET
/api/admin/consolidacao/pessoas/[id] :: GET
/api/admin/consolidacao/revisao/anamneses :: GET
/api/admin/consolidacao/revisao/events :: GET, POST
/api/admin/consolidacao/revisao/events/[id] :: GET, PATCH, DELETE
/api/admin/consolidacao/revisao/inscricao-logs :: GET
/api/admin/consolidacao/revisao/registrations :: GET, POST
/api/admin/consolidacao/revisao/registrations/[id] :: PATCH, DELETE
/api/admin/consolidacao/teams :: GET, POST
/api/admin/consolidacao/teams/[id] :: GET, PATCH, DELETE
/api/admin/consolidacao/upsert-person-and-conversion :: POST
/api/admin/consolidacao/worship-services :: GET, POST
/api/admin/consolidacao/worship-services/[id] :: GET, PATCH, DELETE
/api/admin/dashboard/stats :: GET
/api/admin/disparos-log :: GET
/api/admin/escalas :: GET, POST
/api/admin/escalas/disparar-lembretes :: POST
/api/admin/escalas/[id] :: GET, PATCH, DELETE
/api/admin/escalas/[id]/disparar :: POST, GET
/api/admin/escalas/[id]/gerar :: POST
/api/admin/escalas/[id]/preview-disparos :: GET
/api/admin/escalas/[id]/publicada :: GET, POST
/api/admin/escalas/[id]/respostas :: GET
/api/admin/escalas/[id]/slots :: GET, POST
/api/admin/escalas/[id]/trocas :: GET, PUT
/api/admin/escalas/[id]/voluntarios :: GET, PUT
/api/admin/health/worship-services :: GET
/api/admin/ia-config :: GET, PUT
/api/admin/instagram/drafts :: POST
/api/admin/instagram/drafts/[id] :: GET, PUT
/api/admin/instagram/drafts/[id]/assets :: PUT
/api/admin/instagram/instances :: GET, POST
/api/admin/instagram/instances/[id] :: GET, PUT, DELETE
/api/admin/instagram/jobs :: POST
/api/admin/instagram/jobs/run-due :: POST
/api/admin/instagram/posts :: GET
/api/admin/kids-checkin :: GET, POST
/api/admin/kids-checkin/children :: GET
/api/admin/kids-checkin/children/[childId]/guardians :: GET
/api/admin/kids-checkin/notifications :: POST, GET
/api/admin/kids-checkin/[id] :: PATCH, DELETE
/api/admin/kids-checkin/[id]/guardians :: GET
/api/admin/lideranca/cultos :: GET
/api/admin/lideranca/meu-discipulado :: GET
/api/admin/lideranca/meu-discipulado/presencas :: POST
/api/admin/lideranca/presenca-externa/context :: GET
/api/admin/lideranca/presenca-externa/discipulos :: GET
/api/admin/lideranca/presenca-externa/registrar :: POST
/api/admin/lideranca/rede-completa :: GET
/api/admin/lideranca/rede-completa/presencas :: POST
/api/admin/livraria/categorias :: GET, POST
/api/admin/livraria/clientes :: GET, POST
/api/admin/livraria/clientes/[id] :: GET, PATCH, DELETE
/api/admin/livraria/clientes/[id]/compras :: GET
/api/admin/livraria/clientes/[id]/pagamentos :: GET, POST
/api/admin/livraria/config/payment-methods :: GET, PATCH
/api/admin/livraria/cupons :: GET, POST
/api/admin/livraria/cupons/validar :: GET
/api/admin/livraria/cupons/[id] :: GET, PATCH, DELETE
/api/admin/livraria/dashboard :: GET
/api/admin/livraria/estoque/bulk-update :: POST
/api/admin/livraria/estoque/movimentar :: POST
/api/admin/livraria/exportacao :: GET
/api/admin/livraria/fiado :: GET
/api/admin/livraria/fornecedores :: GET
/api/admin/livraria/importacao/modelo :: GET
/api/admin/livraria/importacao/processar :: POST
/api/admin/livraria/importacao/validar :: POST
/api/admin/livraria/mercadopago/caixas :: GET, POST
/api/admin/livraria/mercadopago/config :: GET
/api/admin/livraria/mercadopago/lojas :: GET, POST
/api/admin/livraria/mercadopago/lojas/[id] :: PATCH, DELETE
/api/admin/livraria/mercadopago/orders :: POST
/api/admin/livraria/mercadopago/orders/[id] :: GET
/api/admin/livraria/mercadopago/orders/[id]/cancel :: POST
/api/admin/livraria/mercadopago/orders/[id]/refund :: POST
/api/admin/livraria/mercadopago/orders/[id]/sync-sale :: POST
/api/admin/livraria/mercadopago/sessoes :: GET, POST
/api/admin/livraria/mercadopago/sessoes/close-mine :: POST
/api/admin/livraria/mercadopago/sessoes/[id] :: PATCH
/api/admin/livraria/movimentacoes :: GET
/api/admin/livraria/pdv/barcode :: GET
/api/admin/livraria/pdv/pagamentos/mercadopago :: POST
/api/admin/livraria/pdv/pagamentos/status :: GET
/api/admin/livraria/pdv/produtos :: GET
/api/admin/livraria/pdv/reservas :: POST
/api/admin/livraria/pdv/vendas :: POST
/api/admin/livraria/pdv/vendas/[id]/recibo :: GET
/api/admin/livraria/produtos :: GET, POST
/api/admin/livraria/produtos/[id] :: GET, PATCH, DELETE
/api/admin/livraria/produtos/[id]/images/[imageId] :: DELETE
/api/admin/livraria/produtos/[id]/upload-image :: POST
/api/admin/livraria/relatorios/fiado :: GET
/api/admin/livraria/vendas :: POST
/api/admin/livraria/vendas/historico :: GET
/api/admin/livraria/vendas/reservas :: GET
/api/admin/livraria/vendas/reservas/[id] :: PATCH
/api/admin/midia/agenda/events :: GET, POST, DELETE
/api/admin/midia/agenda/items :: GET, POST, DELETE
/api/admin/midia/demandas :: GET
/api/admin/midia/demandas/[id] :: GET, PATCH
/api/admin/midia/demandas/[id]/comments :: GET, POST, DELETE
/api/admin/midia/demandas/[id]/steps :: GET, POST
/api/admin/midia/demandas/[id]/steps/[stepId] :: PATCH, DELETE
/api/admin/midia/demandas/[id]/steps/[stepId]/disparo :: GET, POST
/api/admin/midia/demandas/[id]/steps/[stepId]/files :: GET, POST, PATCH, DELETE
/api/admin/midia/gerar-arte :: POST
/api/admin/midia/gerar-prompt-arte :: POST
/api/admin/ministries :: GET, POST
/api/admin/people :: GET, POST
/api/admin/people/importacao/modelo :: GET
/api/admin/people/importacao/preview :: POST
/api/admin/people/importacao/processar :: POST
/api/admin/people/leadership-tree :: GET
/api/admin/people/merge :: POST
/api/admin/people/[id] :: GET, PATCH, DELETE
/api/admin/people/[id]/user-link :: GET, PATCH
/api/admin/permissions :: GET
/api/admin/pessoas/[id]/cells :: GET
/api/admin/pessoas/[id]/conversao :: GET
/api/admin/pessoas/[id]/disparar :: POST
/api/admin/pessoas/[id]/kids-links :: GET, PUT
/api/admin/pessoas/[id]/send-invite :: POST
/api/admin/rbac :: GET, POST
/api/admin/reservas/list :: GET
/api/admin/reservas/reservations/[id]/approve :: POST
/api/admin/reservas/reservations/[id]/cancel :: POST
/api/admin/reservas/reservations/[id]/reject :: POST
/api/admin/reservas/rooms :: GET, POST
/api/admin/reservas/rooms/[id] :: GET, PATCH, DELETE
/api/admin/reservas/templates :: GET, POST
/api/admin/reservas/templates/[id] :: PATCH, DELETE
/api/admin/resources :: GET
/api/admin/roles :: GET, POST
/api/admin/roles/[id] :: GET, PATCH, DELETE
/api/admin/roles/[id]/users :: GET, POST, DELETE
/api/admin/sara-kids/list :: GET
/api/admin/settings :: GET, PUT
/api/admin/site-config :: GET, PUT
/api/admin/storage/upload-avatar :: POST
/api/admin/users/make-admin :: POST
/api/admin/users/reconcile-person-links :: POST
/api/admin/users/[id] :: GET, PATCH, DELETE
/api/admin/users/[id]/assign-role :: POST
/api/admin/users/[id]/send-reset-password :: POST
/api/admin/xp26-feedback :: GET
/api/admin/youtube/integrations :: GET
/api/admin/youtube/integrations/[id] :: PATCH, DELETE
/api/admin/youtube/post :: POST
/api/auth/admin-check :: POST
/api/auth/check-email :: POST
/api/auth/self/create-person :: POST
/api/auth/self/link-person :: POST
/api/auth/self/person :: GET, PATCH
/api/auth/set-admin-cookie :: POST
/api/cron/escalas-lembretes :: GET
/api/debug/my-profile :: GET
/api/gallery/create :: POST
/api/gallery/image :: GET
/api/gallery/list :: GET
/api/gallery/prepare :: POST
/api/gallery/recent-photos :: GET
/api/gallery/[id] :: GET, DELETE, PATCH
/api/gallery/[id]/files :: GET
/api/gallery/[id]/files/[fileId] :: DELETE
/api/gallery/[id]/upload :: POST
/api/gallery/[id]/upload-from-storage :: POST
/api/meta/account-posts :: GET
/api/meta/add-page :: POST
/api/meta/check-config :: GET
/api/meta/collaboration :: GET, POST
/api/meta/instagram/messages :: GET, POST
/api/meta/instagram/publish :: POST
/api/meta/integrations :: GET
/api/meta/integrations/[id] :: PATCH, DELETE
/api/meta/oauth/callback :: GET
/api/meta/oauth/start :: GET
/api/meta/pages :: GET
/api/meta/recent-posts :: GET
/api/meta/select-page :: POST
/api/midia/gerar-legenda :: POST
/api/midia/nova-postagem :: POST
/api/public/consolidacao/cells :: GET
/api/public/consolidacao/churches :: GET
/api/public/consolidacao/conversao :: POST
/api/public/consolidacao/conversion-messages :: GET
/api/public/consolidacao/people :: GET
/api/public/consolidacao/teams :: GET
/api/public/escalas/[token] :: GET
/api/public/escalas/[token]/disponibilidade :: POST
/api/public/escalas/[token]/escala :: GET
/api/public/escalas/[token]/troca :: POST
/api/public/gallery/prepare :: POST
/api/public/gallery/[id]/upload :: POST
/api/public/lookups/people :: GET
/api/public/reservas/check-availability :: GET
/api/public/reservas/rooms :: GET
/api/public/reservas/submit :: POST
/api/public/revisao-vidas/anamnese/[token] :: GET, POST
/api/public/revisao-vidas/anamnese/[token]/photo :: POST
/api/public/sara-kids :: POST
/api/public/services :: GET
/api/public/xp26-feedback :: POST
/api/public/xp26-resultados :: GET
/api/revisao-vidas/inscricao/[eventId] :: GET, POST
/api/revisao-vidas/ministries :: GET
/api/revisao-vidas/teams :: GET
/api/services :: GET
/api/social/demands :: GET
/api/social/publish :: POST
/api/social/run-scheduled :: GET, POST
/api/social/scheduled :: GET
/api/social/scheduled/[id] :: GET, PATCH
/api/webhooks/mercadopago :: POST
/api/youtube/oauth/callback :: GET
/api/youtube/oauth/start :: GET
```

---

## 9) Funções exportadas em `lib/` (inventário)

```text
lib/hooks/useRBAC.ts :: useRBAC, usePermission, useIsAdmin
lib/payments/mercadopago/client.ts :: createPreference, getPayment, createPixPayment, isMercadoPagoConfigured
lib/payments/mercadopago/mark-sale-paid-from-order.ts :: markSalePaidFromOrder
lib/payments/mercadopago/orders.ts :: createOrder, getOrder, cancelOrder, refundOrder
lib/payments/mercadopago/stores.ts :: createStore, createPos
lib/validators/person.ts :: normalizeCpf, normalizePhone, normalizeDate, formatDateDisplay
lib/admin-access-context.tsx :: AdminAccessProvider, useAdminAccess
lib/admin-api.ts :: requireAccess, requireAccessAny, requireAdmin
lib/admin-client.ts :: getAccessTokenOrThrow, adminFetchJson
lib/auth-recovery.ts :: clearSupabaseLocalSession, getSessionWithRecovery
lib/auth.ts :: isAdminRequest
lib/background-jobs.ts :: startBackgroundJob, getBackgroundJob
lib/call-disparos-template.ts :: callTemplateDisparosWebhook
lib/cells-elite.ts :: computeEliteCells
lib/cells-people.ts :: maybePromoteCellPeople
lib/cells-schedule.ts :: getNextOccurrence, getEditLockAt
lib/consolidacao-scope.ts :: getVisiblePeopleIdsForLeader, getChurchIdsForPastor
lib/date-utils.ts :: getTodayBrasilia
lib/disparos-webhook.ts :: getNomeExibicao, sendDisparoRaw, callDisparosWebhook
lib/drive.ts :: getOrCreateFolder, deleteFileFromDrive, ensureDrivePath, uploadImageToFolder, listFolderImages, getFileDownloadStream, getFileDownloadBuffer, getFileThumbnailBuffer
lib/escalas-notificacoes.ts :: triggerScalePublishedNotifications
lib/gallery-files-cache.ts :: getCachedFiles, setCachedFiles, invalidateGalleryFilesCache
lib/home-route.ts :: getConfiguredHomeRoute
lib/instagram.ts :: createMediaContainer, createCarousel, publish
lib/loading-overlay.ts :: registerLoadingOverlay, notifyNavigation, completeNavigation, isPageLoadWindow, showLoadingOverlay, hideLoadingOverlay, subscribeLoadingOverlayState
lib/meta-fetch-posts.ts :: getSinceTimestamp, fetchInstagramMediaInsights, fetchInstagramRecentMedia, fetchFacebookRecentPosts
lib/meta.ts :: getMetaConfig, getMetaOAuthUrl, createSignedState, verifySignedState, exchangeCodeForToken, exchangeForLongLivedToken, getUserProfile, listUserPages, listGrantedPermissions, getMissingRequiredInstagramPublishScopes, getPageAccessToken, getInstagramBusinessAccount, getInstagramAccountDetails, createInstagramMediaContainer, publishInstagramMedia, getInstagramMediaContainerStatus, waitForInstagramMediaContainerReady, publishInstagramMediaWithRetry, createInstagramCarouselItemContainer, createInstagramCarouselContainer, createInstagramReelContainer, createInstagramStoryContainer, fetchCollaborationInvites, respondToCollaborationInvite, fetchMediaCollaborators
lib/ministries.ts :: normalizeMinistryNames, ensureMinistryIds, replacePersonMinistries, fetchPersonMinistries
lib/normalize-text.ts :: normalizeForSearch
lib/people-access.ts :: getLeadershipTree, canAccessPerson
lib/people-import.ts :: parsePeopleWorkbook
lib/people.ts :: fetchPeople, fetchPerson, createPerson, updatePerson, deletePerson, fetchPeopleLookup, fetchLeadershipTree, upsertPersonAndConversion
lib/publish-meta.ts :: resolveDriveFileToPublicUrl, executeMetaPublishWithUrls, executeMetaPublish
lib/rbac.ts :: getAccessSnapshotByToken, getAccessSnapshotFromRequest, hasPermission, canView, canCreate, canEdit, canDelete, canManage, hasAppPermission
lib/reservas.ts :: parseTimeToMinutes, isAllowedDay, toUtcIsoFromBrazilDateTime, isWithinRoomWindow, formatDatePtBr, formatTimePtBr
lib/revisao-anamnese.ts :: createEmptyQuestions, createDefaultAnamneseData, normalizeAnamneseData, validateRequiredAnamnese
lib/site-config-context.tsx :: SiteConfigProvider, useSiteConfig
lib/site-config-server.ts :: getSiteConfig
lib/slug.ts :: slugify
lib/storage-url.ts :: getStorageUrl, getStorageBucket
lib/supabase-server.ts :: createSupabaseServiceClient, createSupabaseServerClient, createSupabaseAdminClient
lib/supabase.ts :: isSupabaseConfigured
lib/whatsapp.ts :: getWhatsAppUrl, openWhatsApp
lib/worship-utils.ts :: getRealizedWorshipCount
lib/youtube.ts :: getYouTubeConfig, createYouTubeState, verifyYouTubeState, getYouTubeAuthUrl, exchangeYouTubeCode, refreshYouTubeToken, getYouTubeChannelInfo, uploadVideoToYouTube, getValidAccessToken
```

---

## 10) Como registramos cada tabela (mapa técnico de escrita)

> Abaixo está o inventário de operações detectadas (`insert`, `update`, `upsert`, `delete`) no código de API/lib. Serve como referência direta de onde cada tabela é alimentada ou alterada.

```text
access_profile_permissions | delete | app/api/admin/rbac/route.ts
access_profiles | delete | app/api/admin/rbac/route.ts
arena_leaders | insert/delete | app/api/admin/consolidacao/arenas/route.ts, app/api/admin/consolidacao/arenas/[id]/route.ts
arenas | insert/update/delete | app/api/admin/consolidacao/arenas/route.ts, app/api/admin/consolidacao/arenas/[id]/route.ts
background_jobs | insert/update/delete | lib/background-jobs.ts
bookstore_coupons | insert/update/delete | app/api/admin/livraria/cupons/*, app/api/admin/livraria/pdv/vendas/route.ts
bookstore_customers | insert | app/api/admin/livraria/clientes/route.ts
bookstore_payment_allocations | insert | app/api/admin/livraria/clientes/[id]/pagamentos/route.ts
bookstore_payment_transactions | insert | lib/payments/mercadopago/mark-sale-paid-from-order.ts
bookstore_product_images | delete | app/api/admin/livraria/produtos/[id]/images/[imageId]/route.ts
bookstore_products | insert/update | app/api/admin/livraria/produtos/*, importação, vendas, webhook MP, mark-sale-paid
bookstore_reservation_items | insert | app/api/admin/livraria/pdv/reservas/route.ts
bookstore_sale_items | insert | app/api/admin/livraria/pdv/vendas/route.ts, app/api/admin/livraria/vendas/route.ts
bookstore_stock_movements | insert | estoque/movimentar, bulk-update, importação, vendas, webhook MP, mark-sale-paid
cell_attendances | insert/delete | celulas attendance/realizações
cell_lt_members | insert/delete | consolidacao/cells
cell_people | delete | app/api/admin/celulas/[id]/people/route.ts
cell_visitors | insert/delete | celulas/realizacoes
cells | insert/update/delete | consolidacao/cells
church_pastors | insert/delete | consolidacao/churches
churches | insert/update/delete | consolidacao/churches
consolidation_followups | insert | upsert-person-and-conversion (admin e público)
disparos_log | insert | conversão, reservas, escalas, kids, mídia, utilitários de escala
escalas_assignments | insert/delete | app/api/admin/escalas/[id]/publicada/route.ts
escalas_links | delete | app/api/admin/escalas/[id]/route.ts
escalas_slots | insert | app/api/admin/escalas/route.ts
galleries | delete | app/api/gallery/[id]/route.ts
gallery_files | insert | app/api/gallery/[id]/upload-from-storage/route.ts, app/api/public/gallery/[id]/upload/route.ts
instagram_post_assets | insert | app/api/social/publish/route.ts
instagram_post_drafts | delete | app/api/admin/instagram/drafts/route.ts, app/api/social/publish/route.ts
instagram_post_jobs | insert | app/api/social/publish/route.ts
livraria_mp_store | delete | app/api/admin/livraria/mercadopago/lojas/[id]/route.ts
media_agenda_event_days | delete | app/api/admin/midia/agenda/events/route.ts
media_agenda_events | delete | app/api/admin/midia/agenda/events/route.ts
media_agenda_items | delete | app/api/admin/midia/agenda/items/route.ts
media_demand_step_assignees | insert/delete | app/api/admin/midia/demandas/[id]/steps/*
media_demand_step_tags | insert/delete | app/api/admin/midia/demandas/[id]/steps/*
media_demands | insert | app/api/admin/midia/agenda/events/route.ts, app/api/admin/midia/agenda/items/route.ts
people | insert/update/delete | admin people, consolidacao people, importações, revisão vidas
revisao_vidas_events | delete | app/api/admin/consolidacao/revisao/events/[id]/route.ts
revisao_vidas_inscricao_logs | insert | app/api/revisao-vidas/inscricao/[eventId]/route.ts
revisao_vidas_registrations | delete | app/api/admin/consolidacao/revisao/registrations/[id]/route.ts
role_permissions | delete | app/api/admin/roles/[id]/route.ts
roles | delete | app/api/admin/roles/[id]/route.ts
room_message_templates | delete | app/api/admin/reservas/templates/[id]/route.ts
rooms | delete | app/api/admin/reservas/rooms/[id]/route.ts
scheduled_social_posts | insert | app/api/midia/nova-postagem/route.ts, app/api/social/publish/route.ts
site_config | upsert | app/api/admin/livraria/config/payment-methods/route.ts
team_leaders | insert/delete | consolidacao/teams
teams | insert/update/delete | consolidacao/teams
worship_services | delete | app/api/admin/consolidacao/worship-services/[id]/route.ts
xp26_feedback | insert | app/api/public/xp26-feedback/route.ts
```

---

## 11) Variáveis de ambiente (resumo)

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Disparos: `DISPAROS_WEBHOOK_URL`, `DISPAROS_WEBHOOK_BEARER`, `WHATS_LIDER`
- Cron: `CRON_SECRET`
- Site: `NEXT_PUBLIC_SITE_URL`
- Meta/Instagram: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` (ou equivalente)
- Mercado Pago: chaves e configs do módulo `lib/payments/mercadopago/*`
- Google Drive: variáveis de credencial/pasta raiz

---

## 12) Observações finais

- Este documento reflete o inventário atual extraído do código e migrations no estado de 01/03/2026.
- Em caso de dúvida operacional, o log unificado recomendado é `GET /api/admin/disparos-log` para trilha de envio + jobs.
- Para detalhes de design de UI, seguir `docs/DESIGN-SYSTEM.md`.
