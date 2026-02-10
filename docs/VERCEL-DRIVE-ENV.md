# Google Drive: variáveis na Vercel (Galeria e Upload)

Para as páginas **Galeria** e **Upload** do Admin funcionarem na Vercel (listar e enviar fotos dos álbuns), as credenciais do Google Drive precisam estar configuradas no projeto. Sem elas, a API `/api/gallery/[id]/files` retorna fallback (arquivos já salvos no Supabase) em vez de listar do Drive — a página não quebra, mas álbuns novos ou sem sync ficam com "0 fotos".

## Onde cada variável é usada

O código em **`lib/drive.ts`** usa:

| Variável | Uso |
|----------|-----|
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ID da pasta raiz no Drive (obrigatório para criar/listar pastas). Aceita também `GOOGLE_DRIVE_FOLDER_ID` como alias. |
| Credenciais (uma das opções abaixo) | Autenticação na API do Drive. |

### Credenciais – ordem de leitura no código

1. **Arquivo no servidor** (não recomendado na Vercel):
   - `GOOGLE_APPLICATION_CREDENTIALS` ou `GOOGLE_SERVICE_ACCOUNT_JSON_FILE`  
   Caminho do JSON. Na Vercel o filesystem é efêmero, então **não use** essa opção em produção.

2. **JSON em variável** (recomendado na Vercel):
   - `GOOGLE_SERVICE_ACCOUNT_JSON`  
   Conteúdo completo do JSON da Service Account em **uma linha** (minificado). É a forma mais prática na Vercel.

3. **E-mail + chave separados**:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` ou `GOOGLE_CLIENT_EMAIL`  
   - `GOOGLE_PRIVATE_KEY`  
   Valor de `client_email` e `private_key` do JSON. Na chave, use `\n` no lugar de quebras de linha se o painel não aceitar múltiplas linhas.

---

## O que configurar na Vercel

Vercel → Projeto → **Settings** → **Environment Variables**.

### Opção A (recomendada): JSON em uma variável

| Nome | Valor | Ambientes |
|------|-------|-----------|
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ID da pasta raiz (ex.: `1tH-N4iJ_GHIV8yOkvTsJbD2QK-OhD2W4`) | Production, Preview |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Conteúdo do arquivo JSON da Service Account, **minificado em uma linha** | Production, Preview |

Para minificar o JSON: abra o arquivo baixado do Google Cloud, copie e use um minificador (ou remova quebras de linha manualmente). Cole o valor inteiro no campo da variável.

### Opção B: E-mail e chave separados

| Nome | Valor | Ambientes |
|------|-------|-----------|
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ID da pasta raiz | Production, Preview |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Valor de `client_email` do JSON (ex.: `...@....iam.gserviceaccount.com`) | Production, Preview |
| `GOOGLE_PRIVATE_KEY` | Valor de `private_key` do JSON. Use `\n` no lugar de cada Enter. | Production, Preview |

---

## Checklist rápido

- [ ] Google Cloud: projeto criado, **Drive API** ativada.
- [ ] Service Account criada e chave JSON baixada.
- [ ] Pasta no Drive criada e **compartilhada com o e-mail da Service Account** (Editor).
- [ ] ID da pasta copiado da URL (`.../folders/ESTE_ID`).
- [ ] Na Vercel: `GOOGLE_DRIVE_ROOT_FOLDER_ID` + uma das opções de credencial (JSON ou e-mail+chave).
- [ ] **Redeploy** após salvar as variáveis (Deployments → ⋯ → Redeploy).

---

## Comportamento sem variáveis na Vercel

Se as variáveis do Drive **não** estiverem configuradas (ou estiverem incorretas):

- **GET /api/gallery/[id]/files** não retorna mais 500. A rota usa **fallback**: devolve os arquivos já salvos na tabela `gallery_files` do Supabase. Álbuns que nunca foram sincronizados ou que dependem só do Drive aparecem com "0 fotos".
- **POST /api/gallery/[id]/upload** continua falhando com erro de credenciais ao tentar enviar para o Drive.

Ou seja: a listagem de álbuns deixa de quebrar; para listar do Drive e fazer upload em produção, é necessário configurar as variáveis acima na Vercel e fazer redeploy.

---

## Referência

- Configuração geral do Drive no projeto: **docs/GOOGLE-DRIVE-ADMIN.md**
- Variáveis e arquitetura: **docs/PLATAFORMA-COMPLETA.md** (seção 10 e tabela de env).
