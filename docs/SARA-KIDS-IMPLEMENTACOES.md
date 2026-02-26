# Sara Kids — Documentação das Implementações

Data de referência: 26/02/2026

## 1) Objetivo do módulo

O módulo Sara Kids cobre:

- Cadastro e vínculo entre crianças e responsáveis
- Check-in de crianças por culto
- Check-out na saída
- Registro de responsável que deixou a criança
- Consulta operacional de crianças presentes no culto
- Ação rápida para chamar responsáveis (individual e em lote)

---

## 2) Páginas administrativas implementadas

### 2.1 Painel Sara Kids

Rota: `/admin/sara-kids`

Arquivo: `app/admin/sara-kids/page.tsx`

Implementado:

- Card de acesso à ficha pública `/sara-kids` (copiar link + abrir)
- Atalho para Pessoas (`/admin/pessoas`)
- Atalho para Check-in (`/admin/sara-kids/checkin`)
- Atalho para Crianças no Culto (`/admin/sara-kids/presentes`)
- Tabela de cadastros recentes (criança, idade, responsável, parentesco, data)

### 2.2 Check-in Sara Kids

Rota: `/admin/sara-kids/checkin`

Arquivo: `app/admin/sara-kids/checkin/page.tsx`

Implementado:

- Seleção de culto (`CustomSelect`) e data (`DatePickerInput`)
- Busca de criança por nome
- Seleção de responsável vinculado à criança (pai/mãe/outro)
- Campo de observações
- Registro de check-in com auditoria de usuário que registrou
- Checkout por registro
- Listagem do dia (desktop + mobile)
- Coluna/indicador de responsável que trouxe a criança
- Modal de histórico/detalhes por check-in com:
  - Criança, idade e culto
  - Data/hora de entrada e saída
  - Duração de permanência (quando houver saída)
  - Observações
  - Auditoria (registrado por, data do registro e ID do registro)
- Ação no header para abrir página de presentes

### 2.3 Crianças no Culto (presentes)

Rota: `/admin/sara-kids/presentes`

Arquivo: `app/admin/sara-kids/presentes/page.tsx`

Implementado:

- Filtro por culto e data
- Lista somente check-ins ativos (sem `checked_out_at`)
- Autoatualização a cada 30s
- Seleção múltipla de crianças (individual + selecionar todos)
- Chamar responsável individualmente via WhatsApp
- Chamada em lote via modal com progresso de envio
- Check-out direto da criança na lista
- Indicador de ausência de telefone do responsável
- Layout responsivo (tabela no desktop e cards no mobile)

---

## 3) APIs implementadas/atualizadas

### 3.1 Check-in principal

Rota: `/api/admin/kids-checkin`

Arquivo: `app/api/admin/kids-checkin/route.ts`

- `GET`:
  - Filtros por `service_id` e `date`
  - Retorna dados do check-in + criança + responsável (incluindo telefone do responsável)
- `POST`:
  - Registra check-in com:
    - `child_id`, `service_id`, `service_name`
    - `guardian_id`, `guardian_name`
    - `notes`
  - Salva auditoria de usuário (`registered_by`, `registered_by_name`)

### 3.2 Busca de crianças para check-in

Rota: `/api/admin/kids-checkin/children`

Arquivo: `app/api/admin/kids-checkin/children/route.ts`

- Busca por nome (`q`)
- Retorna apenas crianças (`is_child = true`)

### 3.3 Responsáveis vinculados por criança

Rota: `/api/admin/kids-checkin/children/[childId]/guardians`

Arquivo: `app/api/admin/kids-checkin/children/[childId]/guardians/route.ts`

- Retorna adultos vinculados à criança em `people_kids_links`
- Retorno normalizado com `id`, `full_name`, `relationship_type`

### 3.4 Atualização/remoção por check-in

Rota: `/api/admin/kids-checkin/[id]`

Arquivo: `app/api/admin/kids-checkin/[id]/route.ts`

- `PATCH`: checkout (`checked_out_at`) e atualização de notas
- `DELETE`: remove check-in (endpoint mantido, mas ação removida da UI de check-in)

### 3.5 Ajuste no vínculo de crianças

Rota: `/api/admin/pessoas/[id]/kids-links`

Arquivo: `app/api/admin/pessoas/[id]/kids-links/route.ts`

- Ao criar cadastro de criança via vínculo, salva `is_child: true`

---

## 4) Banco de dados

### 4.1 Tabela `kids_checkin`

Alterações aplicadas:

- `guardian_id uuid` (FK para `people.id`, `ON DELETE SET NULL`)
- `guardian_name text`

### 4.2 Correção de dados existentes

Backfill executado para marcar crianças vinculadas em `people_kids_links` com `is_child = true` quando nulo/falso.

---

## 5) Navegação/menu administrativo

### 5.1 Sidebar admin

Arquivo: `app/admin/menu-config.ts`

Módulo **Sara Kids** contém:

- `/admin/sara-kids` — Painel Sara Kids
- `/admin/sara-kids/checkin` — Check-in Culto Kids
- `/admin/sara-kids/presentes` — Crianças no Culto

### 5.2 Título dinâmico da aba

Arquivo: `app/admin/layout.tsx`

Títulos adicionados:

- `Crianças no Culto — Sara Kids`
- `Check-in — Sara Kids`
- `Sara Kids`

---

## 6) UX e design system aplicado

Padrões seguidos nas telas novas/ajustadas:

- Selects usando `CustomSelect`
- Datas usando `DatePickerInput`
- Foco em componentes com cor `#c62737`
- Inputs/selects com borda base `border-slate-200`

Observação aplicada em documentação: evitar `overflow-hidden` em contêiner pai de dropdown absoluto para não cortar lista.

---

## 7) Segurança e permissão

As rotas usam `requireAccess` com `pageKey: 'pessoas'` e ações conforme operação:

- `view` para consultas
- `create` para check-in
- `edit` para checkout/edição
- `delete` para exclusão

No frontend administrativo, as chamadas utilizam `adminFetchJson`, garantindo envio do token Bearer da sessão.

---

## 8) Fluxos operacionais (resumo)

### Fluxo A — Registrar entrada

1. Escolher culto/data
2. Buscar criança
3. Selecionar responsável vinculado
4. Informar observações (opcional)
5. Confirmar check-in

### Fluxo B — Chamar para buscar criança

1. Abrir `/admin/sara-kids/presentes`
2. Chamar individualmente ou selecionar várias crianças
3. Acionar botão de chamada (WhatsApp)

### Fluxo C — Registrar saída

1. Na página de presentes (ou lista do check-in), clicar em **Check-out**
2. Registro sai automaticamente da lista de presentes

---

## 9) Itens de validação rápida

- [ ] Criança aparece na busca do check-in
- [ ] Responsáveis vinculados carregam ao selecionar a criança
- [ ] Check-in salva responsável + usuário que registrou
- [ ] Modal de detalhes mostra dados completos
- [ ] Página de presentes lista somente check-ins ativos
- [ ] Chamada individual abre WhatsApp com mensagem preenchida
- [ ] Chamada em lote permite percorrer todos selecionados
- [ ] Check-out remove criança da lista de presentes
- [ ] Item “Crianças no Culto” aparece no menu lateral do admin
