**Módulo de Escala — Implementações (resumo técnico)**

- **Contexto**: documento que resume todas as alterações implementadas no módulo de escalas (geração, criação, página pública e UX de trocas).

**Arquivos Principais Alterados**
- **API - geração de escala (preview)**: [app/api/admin/escalas/[id]/gerar/route.ts](app/api/admin/escalas/[id]/gerar/route.ts)
- **API - criação de escala / slots**: [app/api/admin/escalas/route.ts](app/api/admin/escalas/route.ts)
- **Página pública da escala (visualização)**: [app/escalas/[token]/escala/page.tsx](app/escalas/[token]/escala/page.tsx)
- **Estilos (scrollbar personalizada)**: [app/globals.css](app/globals.css)

**Objetivos Principais**
- Garantir rotatividade justa entre voluntários ao gerar escalas.
- Evitar duplicação de entradas "Arena" vs "Culto Arena" ao gerar/criar slots.
- Redesenhar a página pública para tabela (linhas = cultos/dias, colunas = funções) com tema escuro e melhor usabilidade.
- Remover botões de troca por célula e oferecer um fluxo centralizado "Solicitar troca".
- Exigir que o campo "Substituto sugerido" seja um voluntário (select obrigatório).
- Substituir selects nativos por um componente custom `SearchableSelect` com busca, portal e comportamento aprimorado.

**Resumo das Implementações**
- **Rotatividade / fairness na geração**
  - Em [app/api/admin/escalas/[id]/gerar/route.ts](app/api/admin/escalas/[id]/gerar/route.ts) a lógica de alocação mudou de "pega primeiro elegível" para:
    - Agrupar candidatos por função;
    - Ordenar candidatos por número atual de alocações (menor primeiro) para balancear carga;
    - Usar embaralhamento (Fisher–Yates) para desempates.
  - Resultado: distribuição mais equitativa de vagas entre voluntários.

- **Deduplicação "Arena"**
  - Em [app/api/admin/escalas/route.ts](app/api/admin/escalas/route.ts) e na rota de gerar, foi adicionada normalização (detecta `name.includes('arena')`) e filtragem para garantir que um mesmo evento não crie dois slots (um em `worship_services` e outro em `arenas`).
  - Também existe verificação por `date + time_of_day + label` para evitar duplicatas quando os dados de origem são parecidos.

- **Página pública — redesign**
  - Arquivo: [app/escalas/[token]/escala/page.tsx](app/escalas/[token]/escala/page.tsx).
  - Visuais principais:
    - Tema escuro com gradiente (`slate-900` → `#1a0508`) e vidros translucidos (`bg-white/5`, `backdrop-blur-sm`).
    - Hero com nome do ministério, estatísticas (cultos, voluntários escalados, vagas abertas, data de publicação).
    - Tabela: linhas = cultos/dias, colunas = funções; primeira coluna sticky; células com avatar/iniciais + `Nome Sobrenome` (primeiro + segundo nome).
    - Vaga aberta: badge âmbar com estilo dashed para destacar vagas sem voluntário.
    - Legenda de tipos (Culto / Arena / Evento) com listras coloridas.

- **Alteração na exibição de nomes**
  - Em vez de exibir apenas o primeiro nome, os nomes passaram a mostrar `slice(0,2).join(' ')` (nome + sobrenome) para melhor identificação.

- **Fluxo de trocas (Solicitar troca)**
  - Removidos os botões de troca por célula. Em vez disso, a página inclui uma seção fixa "Solicitar troca" ao final com três passos:
    1. Selecionar seu nome (select buscável).
    2. Selecionar qual escala/funcão será trocada (cartões listando os seus agendamentos).
    3. Escolher o substituto (select buscável obrigatório) e mensagem.
  - Validação: `trocaSubstituto` é obrigatório; botão de envio fica desabilitado até todos os campos obrigatórios serem preenchidos.
  - Envio: POST para `/api/public/escalas/${token}/troca` com `substituto_id`, `slot_id`, `mensagem` (implementação do endpoint de recebimento deve existir/ser compatível no backend).

- **`SearchableSelect` — novo componente**
  - Substitui selects nativos usados em "Seu nome" e "Substituto sugerido".
  - Recursos:
    - Busca com auto-focus ao abrir.
    - Renderiza via `createPortal` no `document.body` para evitar clipping por `overflow` em containers pais.
    - Lógica de flip: abre para cima quando não há espaço suficiente abaixo.
    - Calcula `left`, `width` e `top`/`bottom` com `getBoundingClientRect` para alinhamento exato com o trigger.
    - Scrollbar customizada (classe `dropdown-scrollbar`), thumb arredondado e discreto.
    - Clique fora fecha tanto o wrapper do botão quanto o dropdown portado.

- **Estilos de scrollbar**
  - Em [app/globals.css](app/globals.css) foi adicionada a classe `.dropdown-scrollbar` para estilizar a barra do dropdown (4px, thumb arredondado, hover mais visível) e mantida a `.custom-scrollbar` para sidebar.

- **Ajustes de UX/JS**
  - O dropdown agora recalcula posição ao rolar (`scroll`) e redimensionar a janela, evitando posicionamento incorreto em containers com transforms ou cujo scroll esteja em elementos pai.
  - `z-index` alto (`9999`) para garantir sobreposição de todos os elementos.

**Testes / Validações**
- Após as mudanças, checagem local de erros de build/lint no arquivo alterado não retornou erros (TypeScript/linters limpos para as edições recentes).
- Recomendações de testes funcionais:
  - Gerar uma escala de teste via admin → verificar distribuição entre voluntários (runs multples vezes para validar rotação).
  - Criar entradas com nome contendo "Arena" e validar que apenas um slot aparece na publicação.
  - Publicar escala e testar na UI: abrir select, rolar lista muito longa, abrir em telas pequenas (caixa deve flipar e portal não deve ser cortado).
  - Submeter uma solicitação de troca e verificar recepção no backend/admin.

**Lista de arquivos alterados (detalhada)**
- [app/api/admin/escalas/[id]/gerar/route.ts](app/api/admin/escalas/[id]/gerar/route.ts): algoritmo de rotação + dedup de slots input
- [app/api/admin/escalas/route.ts](app/api/admin/escalas/route.ts): detecção/normalização de "arena" durante criação de slots
- [app/escalas/[token]/escala/page.tsx](app/escalas/[token]/escala/page.tsx): redesign completo da página pública + `SearchableSelect` component (portal, flip, validações, formulário de troca)
- [app/globals.css](app/globals.css): adição de `.dropdown-scrollbar` (estilo de scrollbar do dropdown)

**Decisões arquiteturais e notas**
- O `SearchableSelect` foi implementado como componente local dentro da página pública por simplicidade; se for reutilizado em outras páginas, mover para `components/ui/` é recomendado.
- O endpoint público de trocas (`/api/public/escalas/:token/troca`) deve validar `substituto_id` como voluntário existente — o front-end já exige isso, mas validação server-side é obrigatória.
- A rotação/fairness implementada é simples (contagem de alocações). Para cenários mais complexos (habilidades, restrições, bloqueios de data) é possível estender o algoritmo com pesos e regras.

**Próximos passos sugeridos**
- Mover `SearchableSelect` para `components/ui/SearchableSelect.tsx` e adicionar testes (unit + integration).
- Implementar logs/telemetria para geração de escala (ajuda a auditar problemas de dedup/rotatividade).
- Endpoint/admin para gerenciar solicitações de troca (aprovar/recusar) com notificações por e-mail/WhatsApp.
- Testes end-to-end (Cypress/Playwright) cobrindo geração → publicação → solicitação de troca.


---
Documento gerado automaticamente pelo assistente. Se quiser que eu também:
- gere uma versão resumida para o README; ou
- mova `SearchableSelect` para `components/ui/` criando testes; ou
- adicione exemplos de payloads das APIs;
diga qual opção prefere e eu faço a próxima alteração.