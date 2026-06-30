# Spec: Módulo de Formulários — midia.saraalagoas.com

**Data:** 2026-06-30  
**Status:** Aprovado  
**Módulo:** Mídia (`midia.saraalagoas.com` → `/admin/midia/`)

---

## 1. Visão geral

Criação de um sistema completo de formulários dentro do módulo de mídia, permitindo que administradores criem formulários de uso geral com um builder drag-and-drop, compartilhem via link público com usuários externos, e visualizem as respostas em um dashboard com gráficos.

---

## 2. Casos de uso

- Admin cria um formulário de inscrição para evento
- Admin compartilha o link público com a congregação
- Membros e visitantes preenchem o formulário sem necessidade de login
- Admin visualiza as respostas em dashboard com gráficos e exporta CSV
- Admin fecha o formulário por prazo ou limite de respostas

---

## 3. Páginas e rotas

### Admin (protegidas por `PageAccessGuard` com `pageKey="instagram"` — mesmo do módulo mídia)

| Rota | Descrição |
|------|-----------|
| `/admin/midia/formularios` | Lista de formulários com status e métricas |
| `/admin/midia/formularios/novo` | Criação de novo formulário (nome, descrição, config) |
| `/admin/midia/formularios/[id]/editar` | Builder drag-and-drop |
| `/admin/midia/formularios/[id]/respostas` | Dashboard de respostas |

### Pública (sem autenticação)

| Rota | Descrição |
|------|-----------|
| `/f/[slug]` | Formulário público para preenchimento externo |

---

## 4. Banco de dados

### Tabela `formularios`

```sql
create table formularios (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descricao   text,
  slug        text not null unique,
  schema      jsonb not null default '{"campos": []}',
  config      jsonb not null default '{}',
  -- config: { limite_respostas: number|null, data_encerramento: string|null, mensagem_sucesso: string }
  ativo       boolean not null default true,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

### Tabela `formulario_respostas`

```sql
create table formulario_respostas (
  id             uuid primary key default gen_random_uuid(),
  formulario_id  uuid not null references formularios(id) on delete cascade,
  dados          jsonb not null default '{}',
  -- dados: { [campo_id]: valor }
  created_at     timestamptz not null default now()
);
```

### Índices

```sql
create index on formularios (slug);
create index on formulario_respostas (formulario_id);
create index on formulario_respostas (created_at);
```

### RLS

- `formularios`: leitura/escrita apenas para usuários autenticados com acesso admin
- `formulario_respostas`: INSERT público (sem autenticação) para o slug ativo; leitura apenas para admin

---

## 5. Schema JSON dos campos

```ts
type TipoCampo =
  | 'texto_curto'
  | 'texto_longo'
  | 'email'
  | 'telefone'
  | 'numero'
  | 'data'
  | 'multipla_escolha'   // radio
  | 'checkbox'           // múltipla seleção
  | 'dropdown'
  | 'arquivo'
  | 'secao'              // divisor visual com título

interface CampoFormulario {
  id: string              // uuid gerado no cliente
  tipo: TipoCampo
  label: string
  obrigatorio: boolean
  placeholder?: string
  descricao?: string      // texto de ajuda abaixo do campo
  opcoes?: string[]       // para multipla_escolha, checkbox, dropdown
  condicional?: {
    campo_id: string
    operador: 'igual' | 'diferente' | 'preenchido' | 'vazio'
    valor?: string        // não usado para 'preenchido' e 'vazio'
  } | null
}

interface SchemaFormulario {
  campos: CampoFormulario[]
}
```

---

## 6. Builder drag-and-drop

### Layout (3 colunas)

```
┌─────────────────────────────────────────────────────────────┐
│  Header: título + [Pré-visualizar] [Publicar / Fechar]      │
├──────────────┬───────────────────────────┬───────────────────┤
│  Painel      │  Canvas central           │  Painel           │
│  Esquerdo    │  (lista de campos DnD)    │  Direito          │
│              │                           │  (propriedades    │
│  Tipos de    │  Card de campo:           │   do campo        │
│  campo       │  - handle ≡              │   selecionado)    │
│  clicáveis   │  - label + tipo           │                   │
│  para        │  - badge condicional      │  - Label          │
│  adicionar   │  - ações: duplicar/excluir│  - Obrigatório    │
│              │                           │  - Placeholder    │
│              │  Campo selecionado tem    │  - Descrição      │
│              │  outline azul             │  - Opções (lista) │
│              │                           │  - Condicional    │
└──────────────┴───────────────────────────┴───────────────────┘
```

### Biblioteca DnD

`@dnd-kit/core` + `@dnd-kit/sortable` — leve, acessível, sem jQuery, compatível com React 18.

### Interações

1. Clique em tipo no painel esquerdo → adiciona campo ao final do canvas
2. Clique em campo no canvas → seleciona e abre propriedades no painel direito
3. Drag pelo handle `≡` → reordena campos no canvas
4. Hover em campo → exibe botões "Duplicar" e "Excluir"
5. Campos do tipo "Seção" rendem como divisores visuais com título editável
6. Campos condicionais exibem badge amarelo no card indicando a condição

### Auto-save

Schema salvo automaticamente no Supabase após 1s de inatividade (debounce). Indicador de status "Salvo" / "Salvando..." no header.

---

## 7. Formulário público (`/f/[slug]`)

### Comportamento

- Sem header/sidebar do admin — layout limpo e responsivo
- Campos renderizados em sequência; condicionais aparecem/somem dinamicamente conforme respostas
- Formulários com seções: paginado (uma seção por vez) com barra de progresso e botão "Próximo"
- Submissão via `POST /api/public/formularios/[slug]`
- Após envio: exibe `config.mensagem_sucesso` (padrão: "Obrigado pela sua resposta!")

### Estados especiais

| Condição | Exibição |
|----------|----------|
| `ativo = false` | "Este formulário está fechado." |
| `data_encerramento` no passado | "O prazo deste formulário encerrou." |
| Limite de respostas atingido | "Este formulário atingiu o limite de respostas." |

### Upload de arquivo

Arquivos enviados para Supabase Storage no bucket `formulario-uploads` com path `[formulario_id]/[upload_uuid]/[campo_id]`, onde `upload_uuid` é gerado no cliente antes do envio e incluído no JSON de resposta para referência.

---

## 8. Dashboard de respostas

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header: nome + total respostas + status + [Exportar CSV]    │
├─────────────────────────┬────────────────────────────────────┤
│  Gráficos por campo     │  Tabela de respostas               │
│                         │                                    │
│  multipla_escolha /     │  Colunas: data + um por campo      │
│  checkbox / dropdown    │  Paginação (20 por página)         │
│  → gráfico de barras    │  Filtro por intervalo de data      │
│                         │  Click na linha → modal detalhe    │
│  numero → histograma    │                                    │
│                         │                                    │
│  texto / email /        │                                    │
│  telefone → lista das   │                                    │
│  últimas 5 respostas    │                                    │
└─────────────────────────┴────────────────────────────────────┘
```

### Exportação CSV

Inclui cabeçalho com labels dos campos e todas as respostas. Arquivo nomeado `[titulo-do-form]-respostas.csv`.

---

## 9. API routes

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/admin/midia/formularios` | Listar formulários | Admin |
| POST | `/api/admin/midia/formularios` | Criar formulário | Admin |
| GET | `/api/admin/midia/formularios/[id]` | Detalhe | Admin |
| PUT | `/api/admin/midia/formularios/[id]` | Atualizar (schema + config) | Admin |
| DELETE | `/api/admin/midia/formularios/[id]` | Excluir | Admin |
| GET | `/api/admin/midia/formularios/[id]/respostas` | Listar respostas (paginado) | Admin |
| GET | `/api/public/formularios/[slug]` | Dados públicos do form | Público |
| POST | `/api/public/formularios/[slug]` | Submeter resposta | Público |

---

## 10. Integração no dashboard do módulo mídia

Adicionar card "Formulários" na seção do dashboard `/admin/midia/page.tsx` dentro da área "Redes Sociais e Publicações" (ou seção própria "Ferramentas"), com link para `/admin/midia/formularios`.

---

## 11. Dependências novas

- `@dnd-kit/core` — engine de drag-and-drop
- `@dnd-kit/sortable` — abstração de lista sortável sobre o core
- `@dnd-kit/utilities` — utilitários CSS para animação

Recharts já está no projeto — usado para os gráficos do dashboard de respostas.

---

## 12. Fora do escopo (v1)

- CAPTCHA na página pública
- Notificações por e-mail a cada nova resposta
- Lógica de saltar para seção (pular para página X se resposta Y)
- Temas/customização visual do formulário público
- Múltiplos idiomas
