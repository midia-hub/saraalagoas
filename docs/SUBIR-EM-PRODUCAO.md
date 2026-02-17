# O que fazer para subir em produção

Passos gerais para colocar o projeto no ar (app Next.js + Supabase + Mercado Pago).

---

## 1. Hospedar o app (Next.js)

- **Onde:** Vercel, Railway, VPS, ou outro host que rode Node.js.
- **Build:** `npm run build` (ou `pnpm build` / `yarn build`).
- **Start:** `npm run start` (ou o comando que seu host usar para produção).
- Configure o **domínio** (ex.: `https://seu-dominio.com`) no painel do provedor.

**Vercel:** Não defina `NEXT_PUBLIC_USE_BASEPATH=true` nas variáveis de ambiente. Esse flag ativa export estático (GitHub Pages) e desativa as API routes; na Vercel o app deve rodar em modo Node (serverless) para as rotas `/api/*` funcionarem.

---

## 2. Variáveis de ambiente em produção

No painel do seu host (ex.: Vercel → Settings → Environment Variables), configure **todas** as variáveis necessárias. Use o `.env.example` como base. Em produção:

| Variável | Uso em produção |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase (pode ser o mesmo de dev ou outro). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role do Supabase (nunca expor no frontend). |
| `NEXT_PUBLIC_APP_URL` | **URL pública do app**, ex.: `https://seu-dominio.com`. Usada em e-mails, convites, OAuth, etc. |
| `ADMIN_SECRET` | (Opcional) Segredo para acesso admin; em produção use um valor forte. |
| **Mercado Pago** | Ver seção 4 abaixo. |
| Outras | Google Drive, Meta, etc., conforme você usa no projeto. |

---

## 3. Supabase

- Se já usa um projeto Supabase, pode continuar com o mesmo em produção (recomendado usar outro projeto ou pelo menos outro schema/backup para dados reais).
- Garanta que **todas as migrations** foram aplicadas no projeto Supabase de produção (Dashboard → SQL Editor ou CLI).
- Em produção, confira **RLS** e permissões; não use apenas a anon key com permissões amplas demais.

---

## 4. Mercado Pago em produção

Para a livraria/PDV e QR no caixa funcionarem com **pagamentos reais**:

### 4.1 Credenciais

1. [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) → sua aplicação → **Credenciais de produção**.
2. Ative as credenciais de produção (Indústria, aceite de termos, reCAPTCHA).
3. Copie o **Access Token de produção** (começa com `APP_USR-`) e o **User ID** do vendedor.
4. No servidor de produção (variáveis de ambiente), defina:

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_COLLECTOR_ID=1234567890
```

Não use mais o token de **teste** (`TEST-...`) em produção.

### 4.2 Loja e caixa

- No **admin** do app em produção: **Livraria → Loja e Caixa (MP)**.
- Crie a **loja** e o(s) **caixa(s)** de novo (os de teste não servem para produção).
- Abra a sessão do caixa quando for usar QR no caixa.

### 4.3 Webhook (notificações)

1. [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) → sua aplicação → **Webhooks** → **Configurar notificações**.
2. **Modo de produção**: URL de notificação em HTTPS **com barra no final** (ex.: `https://seu-dominio.com/api/webhooks/mercadopago/`), para evitar 308 e garantir que o webhook seja recebido e a venda marcada como paga.

3. Marque o evento **Order (Mercado Pago)**.
4. Salve. Opcional: copie a **assinatura secreta** e defina no `.env` de produção:

```env
MERCADOPAGO_WEBHOOK_SECRET=...
```

Detalhes: [docs/MERCADOPAGO-PRODUCAO.md](./MERCADOPAGO-PRODUCAO.md).

---

## 5. URLs de retorno (Mercado Pago)

Se o app usar URLs de sucesso/falha/pendente para o checkout, configure-as para o domínio de produção, por exemplo no `.env`:

```env
MERCADOPAGO_SUCCESS_URL=https://seu-dominio.com/admin/livraria/vendas/mercadopago/retorno
MERCADOPAGO_FAILURE_URL=https://seu-dominio.com/admin/livraria/vendas/mercadopago/retorno
MERCADOPAGO_PENDING_URL=https://seu-dominio.com/admin/livraria/vendas/mercadopago/retorno
```

(Ajuste os caminhos se o seu fluxo for outro.)

---

## 6. Checklist rápido

- [ ] App buildando e rodando em produção (`npm run build` + `npm run start` ou deploy automático).
- [ ] Domínio configurado (ex.: `https://seu-dominio.com`).
- [ ] Variáveis de ambiente de produção preenchidas (Supabase, `NEXT_PUBLIC_APP_URL`, admin, etc.).
- [ ] Migrations do Supabase aplicadas no projeto de produção.
- [ ] Mercado Pago: **Access Token de produção** e **COLLECTOR_ID** no `.env` de produção.
- [ ] Mercado Pago: **loja e caixa** criados de novo no admin em produção.
- [ ] Mercado Pago: **webhook** em modo produção com URL `https://seu-dominio.com/api/webhooks/mercadopago` e evento Order (Mercado Pago).
- [ ] (Opcional) `MERCADOPAGO_WEBHOOK_SECRET` e URLs de retorno (success/failure/pending) configuradas.

Depois disso, a aplicação e a integração com Mercado Pago estarão em produção.
