# Instruções para GitHub Copilot — Sara Sede Alagoas

## ⚠️ Regra obrigatória — Design System

**Antes de criar ou editar qualquer componente de UI, formulário, tela ou página, o arquivo `docs/DESIGN-SYSTEM.md` DEVE ser consultado.**

Isso se aplica especialmente a:
- Listas suspensas / dropdowns / selects
- Campos de data e hora
- Inputs de texto
- Labels e placeholders
- Botões
- Tabelas
- Badges de status
- Modais de confirmação / exclusão

### Resumo das regras mais críticas

1. **Dropdowns:** sempre usar `<CustomSelect>` (`components/ui/CustomSelect.tsx`). Nunca usar `<select>` nativo sem estilização.
2. **Datas:** sempre usar `<DatePickerInput>` (`components/ui/DatePickerInput.tsx`). Nunca usar `<input type="date">` direto.
3. **Cor de foco:** sempre `#c62737` (sara-red). Nunca usar `purple-*`, `emerald-*` ou `blue-*` como cor de foco em campos de formulário.
4. **Bordas em repouso:** `border-slate-200`. Hover: `border-slate-300`.
5. **Arredondamento:** `rounded-xl` para inputs/selects, `rounded-2xl` para painéis flutuantes.
6. **`overflow-hidden` em cards:** NUNCA colocar `overflow-hidden` no wrapper de um card que contenha `<CustomSelect>`, `<DatePickerInput>` ou qualquer painel flutuante. O `overflow-hidden` corta painéis `position: absolute`. Use `overflow-hidden` apenas no elemento de header interno (com `rounded-t-xl` ou `rounded-t-2xl`), nunca no card pai. Ver seção 3.2 do Design System.
7. **Exclusão / confirmação:** sempre usar `<ConfirmDialog>` (`components/admin/ConfirmDialog.tsx`). Nunca usar `window.confirm()`, `alert()` ou modais de confirmação montados inline na página. Ver seção 5 do Design System.

Consulte o documento completo em [`docs/DESIGN-SYSTEM.md`](../docs/DESIGN-SYSTEM.md) para todos os tokens, componentes canônicos, exemplos de código e checklist de revisão.
