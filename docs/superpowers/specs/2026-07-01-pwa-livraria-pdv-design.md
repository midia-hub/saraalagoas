# Spec: PWA do PDV da Livraria

**Data:** 2026-07-01
**Status:** Aprovado
**Módulo:** Livraria (`/admin/livraria/vendas`)

---

## 1. Visão geral

Tornar a tela de venda do PDV da Livraria (`app/admin/livraria/vendas/page.tsx`) instalável como aplicativo (PWA), para uso em tablets/celulares de caixa. Sem suporte offline — o app continua exigindo conexão com a internet, apenas ganha ícone próprio, abre em tela cheia (sem barra do navegador) e fica restrito à tela de venda.

Hoje não existe infraestrutura de PWA funcional no projeto: há um `public/manifest.json` genérico, mas ele não é referenciado em nenhum `<link>` nem em nenhuma metadata do Next.js, e aponta para um ícone (`/favicon.svg`) que não existe em `public/`. Este spec cria a infraestrutura do zero, escopada apenas ao PDV.

---

## 2. Casos de uso

- Caixa instala o PDV como app no tablet/celular usado no balcão da livraria, ficando com ícone próprio na tela inicial.
- Ao abrir o app instalado, entra direto na tela de venda (`/admin/livraria/vendas`), sem chrome do navegador.
- Se não estiver logado, é redirecionado ao login existente e volta para a tela de venda após autenticar (fluxo já existente, sem mudanças).
- Em navegadores que suportam instalação automática (Chrome/Edge/Android), um botão "Instalar app" aparece na própria tela quando a instalação é possível.
- Em iOS/Safari (sem suporte a instalação automática), é exibida uma instrução para adicionar manualmente à tela de início.
- Rodando como app instalado, a tela de venda esconde o atalho "voltar" que leva à edição de produtos (fora do escopo do PDV), mantendo a experiência focada em vender.
- O banner "Abrir caixa →" (exibido quando não há sessão de caixa aberta) continua visível mesmo instalado, pois é a única forma de abrir uma sessão de caixa a partir do fluxo de venda.

---

## 3. Escopo e não-escopo

**Dentro do escopo:**
- Manifest, ícones e metadata exclusivos da rota `/admin/livraria/vendas` (e subrotas: `historico`, `[id]/recibo`, `mercadopago/retorno`, `reservas`).
- Botão/instrução de instalação na tela de venda.
- Ocultar o atalho de "voltar para produtos" quando rodando em modo standalone.

**Fora do escopo:**
- Suporte offline, service worker, cache de produtos/vendas.
- PWA para qualquer outra tela do admin (dashboard, estoque, clientes, loja-caixa, etc.) — essas continuam acessíveis apenas via navegador normal.
- Redesenho visual do ícone/logo da igreja — reaproveita o ícone atual (`public/favicon.png`), apenas reformatado (quadrado, com padding) para atender aos requisitos de ícone de instalação do Android/iOS.

---

## 4. Arquivos e componentes

| Arquivo | Descrição |
|---|---|
| `public/manifest-livraria.webmanifest` | Manifest estático. `start_url` e `scope` = `/admin/livraria/vendas`, `display: standalone`, `theme_color: #c62737`, `background_color: #ffffff`. |
| `public/icons/livraria-192.png`, `public/icons/livraria-512.png` | Ícones quadrados gerados a partir de `public/favicon.png` (logo centralizada sobre fundo branco), via script one-off com `sharp` (já é dependência do projeto). |
| `app/admin/livraria/vendas/layout.tsx` (novo) | Layout de servidor da rota `vendas`. Exporta `metadata: Metadata` com `manifest: '/manifest-livraria.webmanifest'` e `appleWebApp: { capable: true, statusBarStyle: 'default', title: 'PDV Livraria' }`. Passa `children` adiante sem alterar o layout visual. |
| `lib/use-is-standalone.ts` (novo) | Hook client-side: retorna `true` se `window.matchMedia('(display-mode: standalone)').matches` ou `navigator.standalone === true` (iOS). |
| `components/admin/bookstore/InstallPwaButton.tsx` (novo) | Componente client. Escuta `beforeinstallprompt`, guarda o evento e mostra botão "Instalar app" que chama `.prompt()`. Se `useIsStandalone()` for `true`, não renderiza nada. Em iOS sem instalação nativa disponível, mostra instrução dispensável (guardada em `localStorage`) para "Adicionar à Tela de Início". |
| `app/admin/livraria/vendas/page.tsx` (editado) | Renderiza `<InstallPwaButton />` perto da barra de busca. Usa `useIsStandalone()` para condicionar a exibição do link `ArrowLeft` (que hoje aponta para `/admin/livraria/produtos`) — some quando `true`. O banner "Abrir caixa →" não é alterado. |

---

## 5. Autenticação

Nenhuma mudança necessária. O middleware já protege `/admin/livraria/vendas` e redireciona para `/admin/login?next=/admin/livraria/vendas` quando deslogado, retornando à mesma URL após o login — isso funciona igual dentro da janela do app instalado.

---

## 6. Testes

Não há suíte automatizada aplicável a instalação de PWA. Validação manual:
- `next build && next start` (o dev server pode não servir o manifest com o content-type correto em todos os navegadores).
- DevTools → Application → Manifest: carrega sem erros, ícones resolvem.
- Instalar em um Chrome/Android (ou emulado) e em um iPhone/Safari: confirmar ícone correto, abertura em tela cheia sem barra do navegador, botão/instrução de instalação aparece e some corretamente, link de "voltar para produtos" some quando instalado, banner de abrir caixa permanece visível quando o caixa está fechado.
