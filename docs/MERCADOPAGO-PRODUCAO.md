# Mercado Pago (Código QR) — Subir em produção

Checklist antes de colocar a integração em produção, conforme [documentação do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/qr-code).

---

## 1. Credenciais

Após testar com credenciais de **teste**, troque pelo **Access Token de produção** para processar transações reais.

### Integração própria (uma única conta vendedor)

1. Acesse [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) e selecione sua aplicação.
2. Vá em **Credenciais de produção** no menu lateral.
3. Preencha **Indústria** e, se quiser, **Site**.
4. Aceite a [Declaração de Privacidade](https://www.mercadopago.com.br/privacidade) e os [Termos e condições](https://www.mercadopago.com.br/developers/pt/docs/resources/legal/terms-and-conditions). Conclua o reCAPTCHA e clique em **Ativar credenciais de produção**.
5. Copie o **Access Token de produção** (começa com `APP_USR-`) e use no `.env`:

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
```

6. Em **Credenciais de produção**, anote o **User ID** do vendedor e use em:

```env
MERCADOPAGO_COLLECTOR_ID=1234567890
```

### Integração para terceiros (OAuth)

Se a aplicação vai operar **em nome de outros vendedores**, use o fluxo [Authorization code (OAuth)](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation#bookmark_authorization_code): configure a URL de redirecionamento em **Detalhes da aplicação → Configurações avançadas**, envie o vendedor para a URL de autorização, troque o `code` por Access Token em `POST /oauth/token` e guarde o `refresh_token` para renovação (token vale 180 dias).  
**Este projeto hoje usa integração própria** (um Access Token por ambiente no `.env`). OAuth exigiria armazenar token por vendedor (ex.: tabela + rotas de callback).

---

## 2. Criar e configurar loja e caixa em produção

As lojas e caixas criados em **teste** estão ligados à conta de teste. Em produção é preciso **criar de novo** usando o Access Token de produção.

1. No admin da plataforma: **Livraria → Loja e Caixa (MP)**.
2. Com o `.env` já com **credenciais de produção**, crie a **loja** (nome do estabelecimento).
3. Depois crie o(s) **caixa(s)** e, se for usar QR no caixa, **abra a sessão** do caixa.
4. Não use dados da loja/caixa de teste em produção.

---

## 3. Notificações (Webhooks)

Configure as notificações em **modo produção** na sua conta real e informe uma **URL de produção** (HTTPS).

1. Acesse [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) → sua aplicação.
2. Menu **Webhooks** → **Configurar notificações**.
3. Aba **Modo de produção**: informe a URL que receberá os webhooks **com barra no final** (obrigatório quando o projeto usa `trailingSlash: true`), por exemplo:

```text
https://seu-dominio.com/api/webhooks/mercadopago/
```

Se informar sem a barra final, o servidor pode responder 308 e o Mercado Pago pode não entregar o webhook corretamente; assim a venda não é marcada como paga.

4. Selecione o evento **Order (Mercado Pago)** para receber `order.processed`, `order.expired`, `order.canceled`, `order.refunded`.
5. Clique em **Salvar configuração**. Opcional: use a **assinatura secreta** e defina no `.env`:

```env
MERCADOPAGO_WEBHOOK_SECRET=xxxxxxxx
```

6. Em produção **não use** a URL do ngrok; use o domínio real do app. Ver também [MERCADOPAGO-WEBHOOK-NGROK.md](./MERCADOPAGO-WEBHOOK-NGROK.md) para testes em localhost.

---

## 4. Relatórios (opcional)

Os [relatórios do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/reports/introduction) ajudam a acompanhar saldo, movimentos e liquidez e a conciliar com o seu sistema. São opcionais, mas recomendados para gestão financeira em produção.

---

## Resumo rápido

| Requisito              | O que fazer no projeto |
|------------------------|-------------------------|
| **Credenciais**        | Trocar `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_COLLECTOR_ID` pelas credenciais de produção no `.env` do servidor de produção. |
| **Loja e caixa**       | Em **Loja e Caixa (MP)** do admin, criar novamente loja e caixa já usando o token de produção. |
| **Notificações**       | Em Suas integrações, configurar Webhook em modo produção com URL `https://seu-dominio.com/api/webhooks/mercadopago` e evento Order (Mercado Pago). |
| **Relatórios**         | Opcional: usar relatórios no painel MP para conciliação. |
