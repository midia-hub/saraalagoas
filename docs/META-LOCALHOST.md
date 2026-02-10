# Usar o app Meta de teste no localhost

Para testar a conexão "Conectar conta Meta" no seu PC (localhost), siga estes passos.

## 1. No Meta for Developers (app de teste)

No painel do app **Mídia_sara_alagoas - Test1** (ou o app de teste que você está usando):

### 1.1 Dados do app (já vistos na tela)
- **ID do Aplicativo**: use no `.env.local` como `META_APP_ID`
- **Chave Secreta do Aplicativo**: use como `META_APP_SECRET` (nunca commite)

### 1.2 Domínios do aplicativo
**Deixe em branco** ou use só o domínio de produção (ex.: `saraalagoas.com`). O Meta não aceita `localhost` nesse campo (ele exige um TLD como `.com`). Para desenvolvimento local isso não é necessário.

### 1.3 URIs de redirecionamento OAuth
O redirect do OAuth é configurado em outro lugar:

1. No menu lateral, abra **Facebook Login** (ou **Produtos** → **Facebook Login**).
2. Clique em **Configurações** (Settings).
3. Em **"URIs de redirecionamento OAuth válidos"** (Valid OAuth Redirect URIs), adicione exatamente:
   ```text
   http://localhost:3000/api/meta/oauth/callback
   ```
4. Salve as alterações.

Se o app Next.js rodar em outra porta (ex.: 3001), use:
```text
http://localhost:3001/api/meta/oauth/callback
```

---

## 2. No seu projeto (variáveis de ambiente)

Crie ou edite o arquivo **`.env.local`** na raiz do projeto (o mesmo nível do `package.json`). **Não** commite esse arquivo (ele já está no `.gitignore`).

Adicione ou preencha com os dados do **app de teste**:

```env
# Meta (app de teste) — só para desenvolvimento local
META_APP_ID=1920567681914383
META_APP_SECRET=e9fc1b68825d96c430ae74c555301def
META_REDIRECT_URI=http://localhost:3000/api/meta/oauth/callback
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic
META_STATE_SECRET=um_texto_longo_aleatorio_32_caracteres_minimo
```

- **META_APP_ID** e **META_APP_SECRET**: os mesmos da tela do app (ID do Aplicativo e Chave Secreta).
- **META_REDIRECT_URI**: deve ser **exatamente** a mesma URL que você colocou em "URIs de redirecionamento OAuth válidos" (incluindo a porta, em geral `3000`).
- **META_SCOPES**: escopos mínimos para listar páginas e Instagram; em produção você pode adicionar mais (ex.: `instagram_content_publish`).
- **META_STATE_SECRET**: qualquer string longa e aleatória (32+ caracteres); pode ser a mesma que você usa em produção ou outra só para local.

Garanta também que o **Supabase** está configurado no `.env.local` (para o callback salvar a integração):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 3. Rodar o projeto

1. Na raiz do projeto:
   ```bash
   npm run dev
   ```
2. Acesse no navegador: **http://localhost:3000**
3. Faça login no Admin e vá em **Instagram** → **Instâncias (Meta)**.
4. Clique em **Conectar conta Meta**: a janela do Facebook deve abrir e, após autorizar, o redirect deve voltar para `http://localhost:3000/api/meta/oauth/callback` e depois para a página de instâncias.

---

## 4. Checklist rápido

| Onde | O quê |
|------|--------|
| Meta for Developers → App → **Configurações básicas** | Anotar **ID do Aplicativo** e **Chave Secreta**. Deixe **Domínios do aplicativo** em branco (localhost não é aceito ali). |
| Meta for Developers → **Facebook Login** → **Configurações** | Em **URIs de redirecionamento OAuth válidos** adicionar `http://localhost:3000/api/meta/oauth/callback` |
| Projeto → **`.env.local`** | Definir `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_SCOPES`, `META_STATE_SECRET` e Supabase |
| Terminal | `npm run dev` e testar em **http://localhost:3000** |

---

## 5. Se der erro

- **"redirect_uri mismatch"**: a URL em **Valid OAuth Redirect URIs** no Meta e o valor de **META_REDIRECT_URI** no `.env.local` devem ser **idênticos** (incluindo `http://`, porta e caminho).
- **"Configuração Meta incompleta"**: todas as variáveis `META_*` acima precisam estar definidas no `.env.local`. Reinicie o servidor (`npm run dev`) após alterar o arquivo.
- **Outra porta**: se você usa `npm run dev -- -p 3001`, coloque `http://localhost:3001/api/meta/oauth/callback` tanto no Meta quanto em `META_REDIRECT_URI`.
