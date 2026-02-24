# Atualizações Recentes - Sistema de Reservas de Sala

## Data: 24/02/2026

### ✨ Novas Funcionalidades

#### 1. Sistema Completo de Reservas de Sala
- **Interface Pública Moderna**: Wizard multi-etapas com validação em tempo real e design responsivo.
- **Painel Administrativo**: Gestão completa de reservas (aprovar, rejeitar, cancelar) com modal personalizado para motivo de rejeição.
- **Notificações automáticas via WhatsApp**:
  - Confirmação de solicitação recebida
  - Notificação de aprovação
  - Notificação de rejeição (com motivo)
  - Notificação de cancelamento

#### 2. Importação em Lote de Pessoas
- Upload de planilha Excel/CSV diretamente no painel administrativo
- Mapeamento inteligente de colunas
- Validação automática de dados
- Preview antes da importação
- Tratamento de duplicatas

#### 3. Melhorias no Cadastro de Pessoas
- **Novos campos**: RG, Profissão, Escolaridade, Estado Civil, Nome do Pai, Nome da Mãe
- Validação aprimorada de CPF e RG
- Formulário reorganizado com melhor UX
- Autocomplete inteligente para consolidadores e células

### 🔧 Melhorias Técnicas

#### API de Disparos
- Logs detalhados em console para debugging
- Suporte a múltiplos tipos de conversão:
  - `accepted` / `reconciled` (conversões)
  - `reserva_solicitada` / `reserva_aprovada` / `reserva_rejeitada` / `reserva_cancelada` (reservas)
- Configuração centralizada no painel admin
- Constraint do banco atualizado para aceitar novos tipos

#### Banco de Dados
- **Nova tabela**: `room_reservations` com campos completos de auditoria
- **Nova tabela**: `room_message_templates` para gerenciar templates de mensagens
- **Campos adicionados em `people`**: `rg`, `occupation`, `education_level`, `marital_status`, `father_name`, `mother_name`
- **Constraint atualizado**: `disparos_log.conversion_type` aceita tipos de reserva

#### Segurança e RBAC
- Nova permissão: `consolidacao_config` (gerenciar templates e logs de disparos)
- Permissão: `reservas` (gerenciar reservas de sala)
- Service Account validation aprimorada

### 📋 Arquivos Importantes

#### Migrations (executar no Supabase)
```bash
supabase/migrations/20260223_add_people_missing_registration_fields.sql
supabase/migrations/20260223_reservas_salas_module.sql
```

#### Variáveis de Ambiente (.env)
```env
# Disparos de WhatsApp (opcional)
DISPAROS_WEBHOOK_URL=https://...
DISPAROS_WEBHOOK_BEARER=...
DISPAROS_WEBHOOK_CHANNEL_ID=...  # opcional
```

#### Templates de Mensagens (IDs reais)
- `reserva_solicitada`: `ec0fba84-6657-405f-ad19-1c978e254c9c`
- `reserva_aprovada`: `6532739c-c972-481f-bdf3-c707dfabe3e5`
- `reserva_rejeitada`: `0d9a3be9-a8d4-4eb1-b6f0-c6aa7b37ca93`
- `reserva_cancelada`: `d03afd1c-ccd7-4907-a2a3-97353dea71a4`

### 🚀 Deploy Checklist

Antes de fazer deploy:

1. **Executar Migrations**:
   ```sql
   -- No Supabase SQL Editor
   -- 1. Campos adicionais em people
   -- 2. Tabelas de reservas e templates
   -- 3. Atualizar constraint de disparos_log
   ```

2. **Configurar Variáveis de Ambiente** (Vercel/produção):
   - `DISPAROS_WEBHOOK_URL`
   - `DISPAROS_WEBHOOK_BEARER`
   - `DISPAROS_WEBHOOK_CHANNEL_ID` (se necessário)

3. **Inserir Templates no Banco** (apenas produção):
   ```bash
   node --env-file=.env scripts/seed-reservas-db.mjs
   ```
   Ou manualmente via SQL Editor com os IDs corretos.

4. **Ativar API de Disparos**:
   - Admin → Consolidação → Configurações → API de Disparos
   - Toggle ON

5. **Verificar Permissões RBAC**:
   - Garantir que administradores têm acesso a `reservas` e `consolidacao_config`

### 📝 Notas de Desenvolvimento

#### Debug de Disparos
Os logs agora mostram:
- `[Reserva Submit]` - Fluxo principal da API
- `[Reserva Disparo]` - Processo de notificação
- `[Disparos Webhook]` - Detalhes da chamada HTTP

Para visualizar:
```bash
# Terminal onde roda npm run dev
# Os logs aparecem automaticamente ao criar/aprovar/rejeitar reservas
```

#### Scripts Temporários (não commitados)
Criados para debugging, estão no `.gitignore`:
- `scripts/check-*.mjs` - Verificar estado do banco
- `scripts/seed-*.mjs` - Popular dados iniciais
- `scripts/fix-*.mjs` - Corrigir constraints

### 🎨 UI/UX

#### Reservas Públicas
- Design moderno com Framer Motion
- Validação em tempo real
- Feedback visual claro
- Componentes reutilizáveis (Input, Select, Button)

#### Admin - Gestão de Reservas
- Filtros por status e sala
- Modal elegante para rejeição/cancelamento
- Animações suaves
- Indicadores visuais de status

#### Admin - Importação de Pessoas
- Drag & drop para upload
- Mapeamento visual de colunas
- Preview de dados
- Relatório detalhado de importação

### 🔍 Testes Recomendados

Antes do deploy em produção:

1. **Fluxo Completo de Reserva**:
   - [ ] Criar reserva pública
   - [ ] Receber log no admin
   - [ ] Aprovar reserva
   - [ ] Rejeitar reserva com motivo
   - [ ] Verificar mensagens WhatsApp (se configurado)

2. **Importação de Pessoas**:
   - [ ] Upload de planilha válida
   - [ ] Teste com duplicatas
   - [ ] Verificar campos opcionais

3. **Cadastro Manual**:
   - [ ] Criar pessoa com todos os campos
   - [ ] Validação de CPF/RG
   - [ ] Autocomplete de consolidadores

---

**Desenvolvido com ❤️ para Sara Alagoas**
