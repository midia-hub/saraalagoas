# Design System — Sara Sede Alagoas

> ## ⚠️ CONSULTA OBRIGATÓRIA
> Este documento **deve ser lido antes de qualquer trabalho de UI** na plataforma — seja criar uma nova tela, adicionar um campo a um formulário existente ou criar um componente.
>
> Nenhum dropdown, campo de data, input, botão ou label deve ser implementado sem seguir as regras aqui definidas.
>
> **Arquivo de instruções da IA:** [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)

---

## 1. Tokens de Design

### 1.1 Cores

| Token Tailwind       | Hex        | Uso                                                      |
|----------------------|------------|----------------------------------------------------------|
| `sara-red`           | `#c62737`  | Cor primária — foco, CTA, seleção ativa, destaque        |
| `sara-red-dark`      | `#9e1f2e`  | Hover de botões primários, gradientes                    |
| `slate-900`          | `#0f172a`  | Texto principal (títulos)                                |
| `slate-700`          | `#334155`  | Labels de formulário (admin)                             |
| `slate-600`          | `#475569`  | Texto secundário, descrições                             |
| `slate-400`          | `#94a3b8`  | Placeholder, ícones, texto auxiliar                      |
| `slate-200`          | `#e2e8f0`  | Borda padrão (repouso)                                   |
| `slate-300`          | `#cbd5e1`  | Borda hover (repouso com cursor sobre)                   |
| `white`              | `#ffffff`  | Fundo de inputs e dropdowns                              |
| `slate-50`           | `#f8fafc`  | Fundo desabilitado, fundo de listas de opções            |

> ⚠️ **Proibido** usar `purple-*`, `blue-*`, `emerald-*` ou qualquer outra cor de foco nos componentes de formulário. A cor de foco da plataforma é **sempre `#c62737`** (sara-red).

### 1.2 Bordas e Arredondamento

| Contexto                            | Classe                |
|-------------------------------------|-----------------------|
| Inputs de texto (admin e público)   | `rounded-xl`          |
| Dropdowns / selects customizados    | `rounded-xl`          |
| Painel flutuante do dropdown        | `rounded-2xl`         |
| Botões primários e secundários      | `rounded-xl`          |
| Cards / seções de formulário        | `rounded-xl`          |
| Espessura de borda padrão           | `border` (1 px)       |
| Espessura de borda em selects       | `border-2` (2 px)     |

### 1.3 Anel de Foco

```
focus:border-[#c62737]
focus:ring-2 focus:ring-[#c62737]/20
outline-none
```

Ring de foco ao abrir dropdowns customizados:
```
border-[#c62737]
shadow-[0_0_0_4px_rgba(198,39,55,0.15)]
```

### 1.4 Tipografia

| Elemento              | Classes                                                        |
|-----------------------|----------------------------------------------------------------|
| Título de seção       | `text-lg font-semibold text-slate-800`                        |
| Label (admin)         | `block text-xs font-medium text-slate-700 mb-1`               |
| Label (público)       | `block text-sm font-semibold text-slate-800 mb-2`             |
| Label capslock (raro) | `block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5` |
| Placeholder           | `text-slate-400` (definido via prop, não em CSS direto)       |
| Texto de item selecionado | `text-sm font-medium text-slate-800`                      |
| Texto de placeholder no trigger | `text-sm text-slate-400`                           |

---

## 2. Componentes de Formulário

### 2.1 Input de Texto

**Arquivo canônico:** inline nos formulários (sem componente dedicado separado — usar as classes abaixo diretamente).

```tsx
<input
  type="text"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  placeholder="Digite aqui..."
  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
             focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all
             placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
/>
```

**Com ícone à esquerda:**
```tsx
<div className="relative">
  <IconComponent
    size={16}
    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
  />
  <input
    type="text"
    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
               focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none transition-all"
  />
</div>
```

---

### 2.2 Lista Suspensa (Dropdown / Select)

#### Componente canônico: `<CustomSelect />`
> **Caminho:** `components/ui/CustomSelect.tsx`  
> **Usar em:** todas as telas administrativas e públicas onde o usuário escolhe uma opção de uma lista fixa.

```tsx
import { CustomSelect } from '@/components/ui/CustomSelect'

<CustomSelect
  value={value}
  onChange={setValue}
  options={[
    { value: 'a', label: 'Opção A' },
    { value: 'b', label: 'Opção B' },
  ]}
  placeholder="Selecione..."
/>
```

**Props disponíveis:**

| Prop              | Tipo                          | Padrão          | Descrição                                 |
|-------------------|-------------------------------|-----------------|-------------------------------------------|
| `value`           | `string`                      | —               | Valor selecionado (controlado)            |
| `onChange`        | `(v: string) => void`         | —               | Callback de mudança                       |
| `options`         | `{ value, label, description? }[]` | —          | Lista de opções                           |
| `placeholder`     | `string`                      | `'Selecione...'`| Texto quando nenhuma opção está selecionada |
| `disabled`        | `boolean`                     | `false`         | Desabilita o componente                   |
| `allowEmpty`      | `boolean`                     | `true`          | Permite limpar a seleção                  |
| `searchPlaceholder` | `string`                    | `'Pesquisar...'`| Placeholder da busca interna              |
| `showIcon`        | `boolean`                     | `true`          | Exibe ícone de usuário na opção vazia     |
| `id`              | `string`                      | —               | ID para acessibilidade                    |
| `aria-label`      | `string`                      | —               | Label acessível                           |

**Aparência do trigger (estado de repouso):**
```
rounded-2xl border-2 border-slate-200 bg-white
```

**Aparência do trigger (estado aberto/foco):**
```
border-[#c62737] shadow-[0_0_0_4px_rgba(198,39,55,0.15)]
```

**Item selecionado na lista:**
```
bg-[#c62737]/10 text-[#c62737] font-semibold
```

---

#### Quando usar `<NativeDropdown />`
> **Caminho:** `components/ui/NativeDropdown.tsx`  
> **Usar em:** formulários públicos simples (ex.: inscrições, formulários de visitante) onde o visual mais elaborado do `CustomSelect` é desnecessário, ou dentro do `DateSelectInput`.

> ⚠️ **Atenção:** O `NativeDropdown` atualmente usa `border-purple-500` no foco. **Isso é uma inconsistência conhecida.** Ao modificar ou criar novos usos, substitua as classes de foco purple pelas canônicas:
> ```diff
> - border-purple-500 ring-4 ring-purple-500/10
> + border-[#c62737] shadow-[0_0_0_4px_rgba(198,39,55,0.15)]
> ```
> e nos itens da lista:
> ```diff
> - bg-purple-50 text-purple-700
> - text-purple-600   (ícone Check)
> + bg-[#c62737]/10 text-[#c62737]
> + text-[#c62737]
> ```

---

#### ❌ Proibido — `<select>` nativo sem estilização
Não usar `<select>` HTML nativo com estilos ad hoc. Se o `CustomSelect` ou `NativeDropdown` não atenderem ao caso, crie um novo componente que siga os tokens deste documento.

```tsx
// ❌ NÃO FAZER
<select className="px-3 py-2 rounded-lg border border-slate-300 ...">

// ✅ FAZER
<CustomSelect value={v} onChange={setV} options={opts} />
```

---

### 2.3 Campo de Data

#### Componente canônico: `<DatePickerInput />`
> **Caminho:** `components/ui/DatePickerInput.tsx`  
> **Usar em:** qualquer campo que precise receber uma data com seleção via calendário.

```tsx
import { DatePickerInput } from '@/components/ui/DatePickerInput'

<DatePickerInput
  value={date}          // formato interno: 'YYYY-MM-DD'
  onChange={setDate}
  placeholder="dd/mm/aaaa"
/>
```

**Props disponíveis:**

| Prop             | Tipo                        | Padrão           | Descrição                                       |
|------------------|-----------------------------|------------------|-------------------------------------------------|
| `value`          | `string`                    | `''`             | Data no formato `YYYY-MM-DD`                    |
| `onChange`       | `(v: string) => void`       | —                | Callback; retorna `YYYY-MM-DD` ou `''`          |
| `placeholder`    | `string`                    | `'dd/mm/aaaa'`   | Texto de placeholder                            |
| `required`       | `boolean`                   | `false`          | Campo obrigatório                               |
| `minDate`        | `Date`                      | —                | Data mínima selecionável                        |
| `maxDate`        | `Date`                      | —                | Data máxima selecionável                        |
| `isDateDisabled` | `(date: Date) => boolean`   | —                | Função para desabilitar datas específicas       |
| `className`      | `string`                    | `''`             | Classe extra no wrapper                         |
| `inputClassName` | `string`                    | `''`             | Classe extra no `<input>` interno               |
| `id`             | `string`                    | —                | ID para `<label htmlFor>`                       |

**Comportamento esperado:**
- Digitação direta com máscara automática `dd/mm/aaaa`
- Calendário abre ao focar ou clicar no ícone
- Botão "Hoje" seleciona a data atual (fuso Brasília)
- Botão "Limpar" (ícone lixeira) limpa o campo
- Fecha ao clicar fora

---

#### Componente secundário: `<DateSelectInput />`
> **Caminho:** `components/ui/DateSelectInput.tsx`  
> **Usar quando:** o campo de data de nascimento precisa de três selects separados (Dia / Mês / Ano) — especialmente em formulários de inscrição pública onde a digitação é problemática em mobile.

```tsx
import { DateSelectInput } from '@/components/ui/DateSelectInput'

<DateSelectInput
  value={birthDate}   // formato: 'YYYY-MM-DD' ou ''
  onChange={setBirthDate}
/>
```

---

#### ❌ Proibido — `<input type="date">` sem componente
Não usar o input nativo `type="date"` pois o visual varia entre sistemas operacionais e não segue o design system.

```tsx
// ❌ NÃO FAZER
<input type="date" className="border border-slate-300 rounded-lg ..." />

// ✅ FAZER
<DatePickerInput value={date} onChange={setDate} />
```

**Exceção:** O painel de upload de mídia (`/admin/upload`) pode manter `<input type="date">` até refatoração, pois é uma tela interna de baixo tráfego. Caso seja refatorada, migrar para `<DatePickerInput>`.

---

### 2.4 Campo de Hora

#### Componente canônico: `<TimeSelect />`
> **Caminho:** `components/admin/ImprovedSelects.tsx`  
> **Usar em:** formulários administrativos que exijam seleção de horário.

```tsx
import { TimeSelect } from '@/components/admin/ImprovedSelects'

<TimeSelect
  value={time}       // formato 'HH:MM'
  onChange={setTime}
  label="Horário de início"
/>
```

---

### 2.5 Seletor de Dia da Semana

#### Componente canônico: `<DayOfWeekSelect />`
> **Caminho:** `components/admin/ImprovedSelects.tsx`

```tsx
import { DayOfWeekSelect } from '@/components/admin/ImprovedSelects'

<DayOfWeekSelect
  value={dayOfWeek}   // 0 = Domingo … 6 = Sábado
  onChange={setDayOfWeek}
  label="Dia da semana"
/>
```

---

### 2.6 Label Padrão

Todo campo de formulário deve ter um `<label>` associado.

**Contexto admin:**
```tsx
<label className="block text-xs font-medium text-slate-700 mb-1">
  Nome do campo <span className="text-[#c62737]">*</span>
</label>
```

**Contexto público (formulários de inscrição/conversão):**
```tsx
<label htmlFor="fieldId" className="block text-sm font-semibold text-slate-800 mb-2">
  Nome do campo <span className="text-[#c62737]">*</span>
</label>
```

O asterisco de obrigatoriedade usa sempre `text-[#c62737]`.

---

## 3. Estrutura de Formulários

### 3.1 Card de Seção

```tsx
<div className="bg-white rounded-xl border border-slate-200 p-6">
  <h2 className="text-lg font-semibold text-slate-800 mb-4">Título da Seção</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* campos */}
  </div>
</div>
```

### 3.2 ⚠️ Regra crítica — `overflow-hidden` e dropdowns

**Nunca use `overflow-hidden` em um container que contém (direta ou indiretamente) um dropdown, select ou qualquer painel flutuante posicionado com `absolute`.**

O `overflow-hidden` corta tudo que ultrapassa o limite do container — incluindo painéis absolutamente posicionados como listas de opções e calendários.

**❌ Errado — dropdown será cortado:**
```tsx
<div className="rounded-xl border border-slate-200 overflow-hidden">
  <CustomSelect ... />  {/* ← painel flutuante será cortado */}
  <DatePickerInput ... />  {/* ← calendário será cortado */}
</div>
```

**✅ Correto — `overflow-hidden` aplicado somente no header separado:**
```tsx
{/* Card sem overflow-hidden no wrapper */}
<div className="rounded-xl border border-slate-200 bg-white">
  {/* overflow-hidden apenas no header, para clipar o background arredondado */}
  <div className="px-6 py-4 border-b bg-slate-50/60 rounded-t-xl overflow-hidden">
    <h2>Título</h2>
  </div>
  <div className="p-6">
    <CustomSelect ... />  {/* ← painel flutua livremente */}
  </div>
</div>
```

**Quando `overflow-hidden` é necessário no wrapper** (ex: tabelas, galerias de imagens), e ainda assim há um dropdown no mesmo bloco, use `createPortal` para renderizar o painel flutuante diretamente em `document.body`.

> 🔴 **Este foi um bug real**: cards de formulário criados com `overflow-hidden` cortaram o painel do `<CustomSelect>` na página `/admin/midia/nova-postagem`. Ao criar qualquer card com header colorido + formulário, separe o `overflow-hidden` do wrapper pai (veja o padrão correto acima).

### 3.3 Espaçamento entre seções

```tsx
<div className="space-y-6">
  <CardSecao1 />
  <CardSecao2 />
</div>
```

### 3.4 Grupo campo + label

```tsx
<div>
  <label className="block text-xs font-medium text-slate-700 mb-1">
    Campo
  </label>
  <CustomSelect ... />
</div>
```

---

## 4. Botões

### 4.1 Primário (ação principal)
```tsx
<button
  type="submit"
  className="px-5 py-2.5 rounded-xl bg-[#c62737] text-white text-sm font-semibold
             hover:bg-[#9e1f2e] active:scale-[0.98] transition-all shadow-sm
             disabled:opacity-50 disabled:cursor-not-allowed"
>
  Salvar
</button>
```

### 4.2 Secundário / Cancelar
```tsx
<button
  type="button"
  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold
             hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
>
  Cancelar
</button>
```

### 4.3 Destrutivo (excluir)
```tsx
<button
  type="button"
  className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold
             border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all"
>
  Excluir
</button>
```

### 4.4 Ícone (somente ícone)
```tsx
<button
  type="button"
  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
  title="Ação"
>
  <IconComponent size={16} />
</button>
```

---

## 5. Modal de Confirmação / Exclusão

### 5.1 Componente canônico: `<ConfirmDialog />`
> **Caminho:** `components/admin/ConfirmDialog.tsx`  
> **Usar em:** toda ação destrutiva (excluir registro) ou que exija confirmação explícita do usuário antes de executar.

```tsx
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

<ConfirmDialog
  open={!!deleteTarget}
  title="Excluir item"
  message={`Confirma a exclusão de "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
  variant="danger"
  loading={deleteLoading}
  onConfirm={confirmDelete}
  onCancel={() => setDeleteTarget(null)}
/>
```

**Props disponíveis:**

| Prop             | Tipo                     | Padrão         | Descrição                                                         |
|------------------|--------------------------|----------------|-------------------------------------------------------------------|
| `open`           | `boolean`                | —              | Controla a visibilidade do modal                                  |
| `title`          | `string`                 | —              | Título em destaque (ex.: "Excluir escala")                        |
| `message`        | `string`                 | —              | Descrição completa da ação e suas consequências                   |
| `confirmLabel`   | `string`                 | `'Excluir'` / `'Confirmar'` | Texto do botão de ação principal              |
| `cancelLabel`    | `string \| null`         | `'Cancelar'`  | Texto do botão cancelar. `null` ou `''` oculta o botão           |
| `onConfirm`      | `() => void`             | —              | Chamado ao clicar no botão de confirmação                        |
| `onCancel`       | `() => void`             | —              | Chamado ao cancelar (Esc, botão Cancelar, clique no overlay)     |
| `variant`        | `'danger' \| 'primary'`  | `'primary'`   | `danger` = ação destrutiva; `primary` = confirmação geral        |
| `loading`        | `boolean`                | `false`        | Spinner no botão e desabilita interações durante a chamada à API |

**Variantes:**

| Variante    | Ícone       | Cor do botão confirm                 | Uso                             |
|-------------|-------------|--------------------------------------|---------------------------------|
| `danger`    | `Trash2`    | `bg-red-600 hover:bg-red-700`        | Exclusão irreversível           |
| `primary`   | `AlertCircle` | `bg-[#c62737] hover:bg-[#9e1f2e]` | Confirmações sem risco crítico  |

**Comportamento:**
- Overlay com `backdrop-blur-sm` + `bg-black/40`
- Fecha com `Esc` (desde que `loading` seja `false`)
- Clique no overlay fecha o modal (se não carregando)
- Botão `×` no canto superior direito
- Scroll do `body` bloqueado enquanto aberto
- API totalmente retrocompatível com o componente anterior

**Padrão de uso com estado local:**
```tsx
const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
const [deleteLoading, setDeleteLoading] = useState(false)

async function confirmDelete() {
  if (!deleteTarget) return
  setDeleteLoading(true)
  try {
    await adminFetchJson(`/api/admin/recursos/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    reload()
  } finally {
    setDeleteLoading(false)
  }
}

// No JSX:
<ConfirmDialog
  open={!!deleteTarget}
  title="Excluir recurso"
  message={deleteTarget ? `Excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.` : ''}
  variant="danger"
  loading={deleteLoading}
  onConfirm={confirmDelete}
  onCancel={() => setDeleteTarget(null)}
/>
```

### 5.2 ❌ Proibido — `window.confirm()` e modais inline ad hoc

Nunca usar `window.confirm()` ou `alert()` para confirmar exclusões. Nunca montar modais de confirmação inline em páginas sem usar o componente canônico.

```tsx
// ❌ NÃO FAZER
if (confirm('Excluir?')) { ... }

// ❌ NÃO FAZER — modal inline ad hoc
{showDelete && (
  <div className="fixed inset-0 ...">
    <div className="bg-white p-6">
      <p>Confirmar exclusão?</p>
      <button onClick={deleteItem}>Excluir</button>
    </div>
  </div>
)}

// ✅ FAZER
<ConfirmDialog
  open={!!deleteTarget}
  variant="danger"
  title="Excluir item"
  message={...}
  onConfirm={confirmDelete}
  onCancel={() => setDeleteTarget(null)}
  loading={deleteLoading}
/>
```

> ⚠️ **Exceção temporária:** O pipeline de demandas (`app/admin/midia/demandas/[id]/page.tsx`) usa exclusão inline com `confirm()` para ações rápidas dentro de cards de estágio/item. Refatorar para `<ConfirmDialog>` quando a tela for revisada.

---

## 6. Tabelas

```tsx
<div className="overflow-x-auto rounded-xl border border-slate-200">
  <table className="w-full text-sm">
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Coluna
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3 text-slate-700">Dado</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 7. Estados de Feedback

### 6.1 Loading (spinner inline)
```tsx
<div className="flex items-center gap-2 text-slate-500 text-sm">
  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-[#c62737] animate-spin" />
  Carregando...
</div>
```

### 6.2 Estado vazio
```tsx
<div className="flex flex-col items-center justify-center py-16 text-slate-400">
  <IconComponent size={40} className="mb-3 opacity-40" />
  <p className="text-sm font-medium">Nenhum registro encontrado</p>
  <p className="text-xs mt-1">Tente ajustar os filtros</p>
</div>
```

### 6.3 Badge de status

| Status     | Classes                                                  |
|------------|----------------------------------------------------------|
| Ativo      | `bg-emerald-50 text-emerald-700 border border-emerald-200` |
| Inativo    | `bg-slate-100 text-slate-500 border border-slate-200`   |
| Pendente   | `bg-amber-50 text-amber-700 border border-amber-200`    |
| Erro       | `bg-red-50 text-red-700 border border-red-200`          |

```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                 bg-emerald-50 text-emerald-700 border border-emerald-200">
  Ativo
</span>
```

---

## 8. Inventário de Componentes UI

| Componente               | Caminho                                     | Situação        |
|--------------------------|---------------------------------------------|-----------------|
| `CustomSelect`           | `components/ui/CustomSelect.tsx`            | ✅ Canônico      |
| `DatePickerInput`        | `components/ui/DatePickerInput.tsx`         | ✅ Canônico      |
| `DateSelectInput`        | `components/ui/DateSelectInput.tsx`         | ✅ Uso específico (nascimento) |
| `ConfirmDialog`          | `components/admin/ConfirmDialog.tsx`        | ✅ Canônico — exclusão/confirmação |
| `SearchableSelect`       | `components/ui/SearchableSelect.tsx`        | ⚠️ Legado — preferir `CustomSelect` |
| `NativeDropdown`         | `components/ui/NativeDropdown.tsx`          | ⚠️ Foco inconsistente (purple) — corrigir ao editar |
| `DayOfWeekSelect`        | `components/admin/ImprovedSelects.tsx`      | ✅ Canônico (admin) |
| `ArenaSelect`            | `components/admin/ImprovedSelects.tsx`      | ✅ Canônico (admin) |
| `TimeSelect`             | `components/admin/ImprovedSelects.tsx`      | ✅ Canônico (admin) |
| `Button`                 | `components/Button.tsx`                     | ✅ Genérico      |

---

## 9. Inconsistências Conhecidas (Backlog)

| Local                                              | Problema                                             | Correção                                      |
|----------------------------------------------------|------------------------------------------------------|-----------------------------------------------|
| `components/ui/NativeDropdown.tsx`                 | Foco usa `purple-500` em vez de `#c62737`            | Substituir classes de foco e seleção          |
| `app/admin/livraria/movimentacoes/page.tsx`        | `<input type="date">` sem componente padronizado      | Migrar para `<DatePickerInput>`               |
| `app/admin/celulas/[id]/page.tsx`                  | `<select>` nativo com borda `emerald-500`            | Migrar para `<CustomSelect>`                  |
| `app/admin/upload/page.tsx`                        | `<input type="date">` direto                          | Migrar para `<DatePickerInput>` (baixa prio.) |
| `app/escalas/[token]/escala/page.tsx`              | `SearchableSelect` local duplicado                   | Extrair e usar `CustomSelect`                 |

> ✅ **Corrigido em 27/02/2026:** `app/admin/livraria/vendas/page.tsx` — `<select>` nativo de categorias migrado para `<CustomSelect>`; input de busca corrigido para tokens canônicos (`rounded-xl`, foco `#c62737`).

---

## 10. Padrões Mobile / PDV

Telas de alto uso em dispositivos móveis (ex: PDV da livraria) requerem atenção especial a tamanho de toque, feedback visual e espaçamento.

### 10.1 Área de toque mínima

Todo elemento interativo (botão, ícone clicável) deve ter área de toque mínima de **44 × 44 px** em contextos mobile.

```
// ✅ Boa prática — botão de quantidade no carrinho
className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center"

// ❌ Ruim — área muito pequena
className="w-6 h-6 rounded border ..."
```

### 10.2 FAB (Floating Action Button)

Para ações prioritárias em mobile (ex: abrir sacola, iniciar venda), use um botão flutuante fixo:

```tsx
<div className="lg:hidden fixed bottom-5 right-4 z-30">
  <button
    type="button"
    onClick={onAction}
    className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#c62737] text-white shadow-xl active:scale-95 transition-transform"
    aria-label="Ação principal"
  >
    <IconComponent size={24} />
    {count > 0 && (
      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-white text-[#c62737] text-xs font-bold flex items-center justify-center px-1">
        {count}
      </span>
    )}
  </button>
</div>
```

> ⚠️ Quando houver um FAB na tela, adicione `pb-24` ao container de conteúdo principal para que o último item não fique oculto atrás do botão.

### 10.3 Drawer lateral (mobile)

Para painéis secundários (ex: sacola, filtros) em mobile, use um drawer com overlay:

```tsx
{open && (
  <div className="lg:hidden fixed inset-0 z-40" aria-modal="true">
    {/* Overlay com blur */}
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden
    />
    {/* Painel */}
    <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col">
      {/* Cabeçalho com área de toque generosa */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200">
        <h3 className="font-bold text-slate-900">Título</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {/* conteúdo */}
      </div>
    </div>
  </div>
)}
```

### 10.4 Padding mínimo em listas/grade no mobile

Em telas com FAB fixo, adicione `pb-24` ao container da lista/grade para que o último item não fique oculto atrás do botão flutuante:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-24 lg:pb-4">
  {items.map(...)}
</div>
```

---

## 11. Checklist de Revisão de UI

Antes de enviar uma PR com nova tela ou componente, confirme:

- [ ] Todos os dropdowns usam `CustomSelect` (ou `NativeDropdown` com foco corrigido)
- [ ] Todos os campos de data usam `DatePickerInput` ou `DateSelectInput`
- [ ] Não há `<input type="date">` sem componente
- [ ] Não há `<select>` nativo sem estilização adequada
- [ ] A cor de foco em todos os campos é `#c62737`
- [ ] O asterisco de campo obrigatório usa `text-[#c62737]`
- [ ] Labels admin seguem `text-xs font-medium text-slate-700`
- [ ] Labels público seguem `text-sm font-semibold text-slate-800`
- [ ] Bordas de inputs/selects usam `border-slate-200` (repouso)
- [ ] Cantos arredondados: `rounded-xl` para inputs/selects, `rounded-2xl` para painéis flutuantes
- [ ] Toda exclusão usa `<ConfirmDialog variant="danger">` — sem `window.confirm()` ou modais ad hoc
- [ ] Telas mobile: elementos interativos com área de toque ≥ 44 × 44 px
- [ ] Telas mobile com FAB: container de conteúdo com `pb-24` para não ocultar último item
