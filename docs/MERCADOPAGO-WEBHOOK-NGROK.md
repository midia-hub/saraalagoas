# URL do webhook Mercado Pago com ngrok

Para o Mercado Pago enviar notificações para seu app em **localhost**, use o ngrok para expor a porta 3000.

A implementação segue a documentação oficial do Mercado Pago:

- **Orders (QR no caixa):** [Criar order](https://www.mercadopago.com.br/developers/pt/reference/in-person-payments/qr-code/orders/create-order/post) (POST `/v1/orders` com `X-Idempotency-Key`, `type: "qr"`, `config.qr.external_pos_id`, `config.qr.mode`).
- **Webhooks:** [Notificações](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks) e [Código QR - notificações](https://www.mercadopago.com.br/developers/pt/docs/qr-code/notifications): evento **Order (Mercado Pago)** (`type: "order"`), ações `order.processed`, `order.expired`, `order.canceled`, `order.refunded`; validação da assinatura via header `x-signature` (HMAC SHA256) com `data.id` em minúsculas; resposta HTTP 200/201 em até 22s.

## 1. Instalar o ngrok

- **Windows:** baixe em [ngrok.com/download](https://ngrok.com/download) ou use: `winget install ngrok`
- **Ou** descompacte o executável e coloque no PATH

## 2. Subir o túnel

O **servidor Next.js** e o **ngrok** precisam estar rodando ao mesmo tempo. Se o túnel cair ou o servidor parar, você verá **ERR_NGROK_3200** ("The endpoint is offline") e as requisições (polling de status, webhooks) falharão com 404.

No plano gratuito do ngrok, a primeira visita a uma URL pode exibir uma página de aviso e responder com **308 Permanent Redirect**. Para que o polling de status de pagamento (e demais chamadas do admin) receba **200 OK** em vez de 308, o cliente já envia o header `ngrok-skip-browser-warning: true` em todas as requisições autenticadas (`lib/admin-client.ts`). Assim o ngrok não exibe a página intersticial e a API responde normalmente.

Com o app rodando na porta 3000 (`npm run dev`), em **outro terminal** execute:

```bash
npm run ngrok
```

Ou diretamente:

```bash
ngrok http 3000
```

## 3. Copiar a URL pública

O ngrok exibe algo como:

```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

A **URL base** é: `https://abc123.ngrok-free.app` (o seu endereço será outro).

## 4. URL do webhook

Use sempre esta rota no final:

```
https://SUA-URL-DO-NGROK/api/webhooks/mercadopago
```

**Exemplo:** se o ngrok mostrou `https://1a2b-2804-14c-xxx.ngrok-free.app`, use:

```
https://1a2b-2804-14c-xxx.ngrok-free.app/api/webhooks/mercadopago
```

Cole essa URL no painel do Mercado Pago em **Webhooks** (ou **Notificações**). Se houver opção de eventos, inclua **payment** (Pix online) e **order** (QR no caixa), para a plataforma marcar a venda como paga quando o pagamento for aprovado.

## 5. Opcional: variável de ambiente

Se quiser que as URLs de retorno (success/failure/pending) usem o ngrok ao testar, no `.env`:

```env
NEXT_PUBLIC_APP_URL=https://SUA-URL-DO-NGROK
MERCADOPAGO_WEBHOOK_URL=https://SUA-URL-DO-NGROK/api/webhooks/mercadopago
```

Reinicie o `npm run dev` após alterar o `.env`.

---

## Testar a integração (QR / Orders)

Antes de ir para produção, use **credenciais de teste** e a **conta de teste comprador** para validar o fluxo sem afetar dados reais.

### 1. Credenciais de teste

- No [Mercado Pago Developers](https://www.mercadopago.com.br/developers), vá em **Suas integrações** e abra sua aplicação.
- Em **Credenciais de teste** (ou **Testes**), copie o **Access Token de teste** (começa com `TEST-`).
- No `.env` use esse token em `MERCADOPAGO_ACCESS_TOKEN`.
- Para pagamentos presenciais (loja/caixa/orders), use também o **User ID** da conta de teste **vendedor** em `MERCADOPAGO_COLLECTOR_ID` (em Credenciais de teste → Dados das credenciais → Seller Test User → User ID).

### 2. Webhooks antes dos testes

Configure a URL de notificações no painel do MP (**Webhooks** ou **Notificações**) com a URL do ngrok (passos acima). Assim você valida que o backend recebe as atualizações de status (pagamento aprovado, etc.).

### 3. Conta de teste comprador

Para simular a compra (escanear o QR e pagar):

1. Em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app), abra a aplicação.
2. No menu lateral, vá em **Contas de teste**.
3. Selecione **Comprador**. Você verá o **User ID**, **usuário** e **senha** da conta de teste comprador.
4. Use esse usuário/senha para entrar no **app do Mercado Pago** (celular ou web) e simular o pagamento escaneando o QR gerado no PDV ou no caixa.

Com isso você pode testar o fluxo completo: finalizar venda com “QR no caixa” ou “Mercado Pago (Pix)” no PDV, escanear com a conta comprador de teste e conferir se o webhook atualiza o status da venda no sistema.
