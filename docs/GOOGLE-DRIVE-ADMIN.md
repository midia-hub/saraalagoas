# Configurar Google Drive para Upload e Galeria do Admin

As páginas **Upload** e **Galeria** do painel Admin usam a **API do Google Drive**. As imagens são enviadas e listadas de uma pasta no Drive, não do bucket Supabase.

## 1. Criar projeto e ativar a API

1. Acesse [Google Cloud Console](https://console.cloud.google.com).
2. Crie um projeto (ou use um existente).
3. No menu, vá em **APIs e serviços** → **Biblioteca**.
4. Pesquise por **Google Drive API** e clique em **Ativar**.

## 2. Criar uma Service Account

1. Em **APIs e serviços** → **Credenciais**, clique em **Criar credenciais** → **Conta de serviço**.
2. Dê um nome (ex.: `sara-admin-drive`) e conclua.
3. Na lista de contas de serviço, clique na que você criou.
4. Aba **Chaves**: **Adicionar chave** → **Criar nova chave** → **JSON**. O arquivo será baixado.
5. Guarde o JSON em local seguro (nunca commite no repositório).

O JSON contém, entre outros, `client_email` e `private_key`. Você usará isso nas variáveis de ambiente.

## 3. Pasta no Google Drive

1. No [Google Drive](https://drive.google.com), crie uma pasta para as imagens do site (ex.: **Sara – Imagens Admin**).
2. Abra a pasta e pegue o **ID da pasta** na URL:  
   `https://drive.google.com/drive/folders/ESTE_E_O_ID`  
   Copie o valor `ESTE_E_O_ID`.
3. **Compartilhe a pasta** com o e-mail da service account (está no JSON, campo `client_email`; algo como `nome@projeto.iam.gserviceaccount.com`).  
   Dê permissão **Editor** para que a API possa criar arquivos nessa pasta.

## 4. Variáveis de ambiente no servidor

No **.env.local** (desenvolvimento) ou nas variáveis de ambiente do servidor (ex.: Vercel), configure:

### Opção A: JSON completo

- **GOOGLE_DRIVE_FOLDER_ID** – ID da pasta (passo 3).
- **GOOGLE_SERVICE_ACCOUNT_JSON** – Conteúdo completo do arquivo JSON da service account, em **uma única linha** (minificado).  
  Em alguns provedores você pode colar o JSON com quebras de linha; em outros é mais seguro minificar ou codificar em base64.

### Opção B: E-mail e chave separados

- **GOOGLE_DRIVE_FOLDER_ID** – ID da pasta.
- **GOOGLE_CLIENT_EMAIL** – Valor de `client_email` do JSON.
- **GOOGLE_PRIVATE_KEY** – Valor de `private_key` do JSON.  
  Se o provedor não aceitar quebra de linha, use `\n` no lugar de cada Enter (ex.: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`).

## 5. Testar

1. Rode o projeto (`npm run dev`) e acesse **/admin** (faça login se precisar).
2. Vá em **Upload**, escolha uma imagem e envie. Deve aparecer a confirmação e o link para abrir no Drive.
3. Vá em **Galeria**. Deve listar as imagens da pasta (incluindo a que você enviou).

Se aparecer erro do tipo “Google Drive não configurado”, confira se todas as variáveis estão definidas no ambiente que está rodando (servidor/API routes).

## 6. Exibir imagens na Galeria

As miniaturas e links da Galeria vêm da API do Drive (`thumbnailLink`, `webViewLink`, e um link direto `uc?export=view&id=...`). Para que as imagens abram ou apareçam para quem acessa o site:

- **Compartilhe a pasta** (ou cada arquivo) como **“Qualquer pessoa com o link”** se quiser que os links abram sem login no Google.  
- Ou mantenha a pasta restrita e use a Galeria apenas para quem já está logado no Admin (links do Drive podem pedir login).

## Resumo

| Item | Onde |
|------|------|
| API ativada | Google Cloud Console → Drive API |
| Credenciais | Service Account (JSON) |
| Pasta | Criada no Drive e compartilhada com o `client_email` da service account |
| Variáveis | `GOOGLE_DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` (ou `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`) |

Documentação da plataforma: **docs/PLATAFORMA-COMPLETA.md** (seção 7 e 8).
