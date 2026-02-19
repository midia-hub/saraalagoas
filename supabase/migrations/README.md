# Migrações do Banco de Dados

Este diretório contém as migrações consolidadas do sistema. As migrações antigas foram movidas para `_old/` como backup.

## 📋 Ordem de Execução

As migrações devem ser executadas **na ordem numérica**:

### 1️⃣ **001_base_schema.sql** - Schema Base
Cria a estrutura fundamental do sistema:
- ✅ Tabela `people` (cadastro central de pessoas)
- ✅ Tabela `profiles` (ligação com auth.users)
- ✅ Sistema RBAC completo (`resources`, `permissions`, `roles`, `role_permissions`, `app_permissions`)
- ✅ Função `get_user_permissions()` para consulta de permissões
- ✅ Bucket `avatars` no Storage
- ✅ Seeds: Permissions, Resources, Role Admin

**Tabelas criadas:** `people`, `profiles`, `resources`, `permissions`, `roles`, `role_permissions`, `app_permissions`

---

### 2️⃣ **002_consolidacao_module.sql** - Módulo de Consolidação
Sistema completo de conversões e células:
- ✅ Tabela `churches` (igrejas/locais)
- ✅ Tabela `cells` (células/grupos)
- ✅ Tabela `cell_members` (membros de células)
- ✅ Tabela `teams` (equipes de consolidação)
- ✅ Tabela `arenas` (locais de consolidação)
- ✅ Tabela `conversoes` (formulário de conversão)
- ✅ Tabela `consolidation_messages` (mensagens de boas-vindas)
- ✅ Tabela `cell_realizations` (realizações de células)
- ✅ Tabela `cell_attendances` (presenças em células)
- ✅ Seeds: Churches, Teams, Arenas, Messages

**Tabelas criadas:** `churches`, `cells`, `cell_members`, `teams`, `arenas`, `conversoes`, `consolidation_messages`, `cell_realizations`, `cell_attendances`

---

### 3️⃣ **003_livraria_module.sql** - Módulo Livraria/PDV
Sistema completo de gestão de produtos e vendas:
- ✅ Tabela `product_categories` (categorias de produtos)
- ✅ Tabela `products` (produtos)
- ✅ Tabela `stock_movements` (movimentações de estoque)
- ✅ Tabela `sales` (vendas)
- ✅ Tabela `sale_items` (itens da venda)
- ✅ Tabela `mercadopago_webhooks` (logs de webhooks do MercadoPago)
- ✅ Função `generate_sale_number()` (gera número de venda)
- ✅ Trigger `set_sale_number()` (auto-gera número ao inserir venda)
- ✅ Trigger `update_stock_on_sale()` (atualiza estoque automaticamente)
- ✅ Seeds: Categorias de produtos

**Tabelas criadas:** `product_categories`, `products`, `stock_movements`, `sales`, `sale_items`, `mercadopago_webhooks`

---

### 4️⃣ **004_gallery_social_module.sql** - Galeria e Redes Sociais
Sistema de galeria e integração com Instagram/Meta:
- ✅ Tabela `galleries` (álbuns de fotos)
- ✅ Tabela `gallery_files` (arquivos da galeria)
- ✅ Tabela `instagram_accounts` (contas do Instagram)
- ✅ Tabela `instagram_posts` (posts do Instagram)
- ✅ Tabela `social_posts` (posts genéricos de redes sociais)
- ✅ Tabela `meta_tokens` (tokens do Meta/Facebook)
- ✅ Bucket `gallery-images` no Storage
- ✅ Bucket `social-media` no Storage

**Tabelas criadas:** `galleries`, `gallery_files`, `instagram_accounts`, `instagram_posts`, `social_posts`, `meta_tokens`

---

### 5️⃣ **005_auxiliary_modules.sql** - Módulos Auxiliares
Módulos complementares e configurações:
- ✅ Tabela `xp26_feedback` (pesquisa de experiência XP26)
- ✅ Tabela `site_config` (configurações do site)
- ✅ Tabela `disparos_webhook` (logs de webhooks genéricos)
- ✅ Tabela `offerings` (ofertas/dízimos)
- ✅ Tabela `prayer_requests` (pedidos de oração)
- ✅ Função `update_updated_at_column()` (atualiza campo updated_at)
- ✅ Triggers `updated_at` em todas as tabelas principais
- ✅ Extensão `unaccent` para buscas normalizadas
- ✅ Seeds: Configurações básicas do site

**Tabelas criadas:** `xp26_feedback`, `site_config`, `disparos_webhook`, `offerings`, `prayer_requests`

---

## 🚀 Como Executar

### Opção 1: Supabase CLI (Recomendado)
```bash
# Executar todas as migrações pendentes
supabase db push

# Ou executar uma por vez
supabase db execute --file supabase/migrations/001_base_schema.sql
supabase db execute --file supabase/migrations/002_consolidacao_module.sql
supabase db execute --file supabase/migrations/003_livraria_module.sql
supabase db execute --file supabase/migrations/004_gallery_social_module.sql
supabase db execute --file supabase/migrations/005_auxiliary_modules.sql
```

### Opção 2: SQL Editor do Supabase
1. Acesse o **SQL Editor** no Dashboard do Supabase
2. Execute cada arquivo **na ordem numérica**
3. Verifique se não há erros antes de prosseguir

### Opção 3: Script PowerShell (Windows)
```powershell
# Execute da raiz do projeto
.\scripts\run-migrations.ps1
```

---

## 🔍 Verificação Pós-Migração

Após executar todas as migrações, verifique:

```sql
-- Listar todas as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar roles criadas
SELECT * FROM public.roles;

-- Verificar recursos do RBAC
SELECT * FROM public.resources ORDER BY sort_order;

-- Verificar igrejas
SELECT * FROM public.churches;

-- Verificar categorias de produtos
SELECT * FROM public.product_categories;

-- Verificar buckets do Storage
SELECT * FROM storage.buckets;
```

---

## 📦 Backup das Migrações Antigas

As 52 migrações antigas foram movidas para `_old/` e estão organizadas por data:
- `20260210_*.sql` - Migrações de fevereiro
- `20260219_*.sql` - Migrações mais recentes
- `create_consolidacao_module.sql` - Primeira migração do módulo

**⚠️ Importante:** As migrações antigas NÃO devem ser executadas. Elas estão preservadas apenas para referência histórica.

---

## 🛠️ Troubleshooting

### Erro: "already exists"
Se você receber erros de objetos já existentes, é porque o banco já tem algumas tabelas criadas. Você pode:
1. Criar um novo projeto Supabase (recomendado para produção limpa)
2. Ou adicionar `IF NOT EXISTS` nas definições (já incluído nas migrações)

### Erro: "permission denied"
Verifique se você está executando com as credenciais corretas do Supabase.

### Erro: "foreign key constraint"
As migrações devem ser executadas **na ordem exata**. Verifique se executou todas as anteriores.

---

## 📚 Documentação Relacionada

- [DOCUMENTACAO_PLATAFORMA.md](../../DOCUMENTACAO_PLATAFORMA.md) - Documentação completa da plataforma
- [README.md](../../README.md) - Guia de instalação e deploy
- [DEPLOY-CHECKLIST.md](../../DEPLOY-CHECKLIST.md) - Checklist de deploy

---

## 🎯 Próximos Passos

Após executar as migrações:
1. ✅ Configurar variáveis de ambiente (`.env.local`)
2. ✅ Criar primeiro usuário admin
3. ✅ Atribuir role admin ao usuário
4. ✅ Configurar permissões RBAC
5. ✅ Popular dados iniciais (igrejas, células, etc.)

---

**Data de Consolidação:** 19 de fevereiro de 2026  
**Status:** ✅ Pronto para produção
