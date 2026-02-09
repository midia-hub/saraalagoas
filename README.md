# Sara Sede Alagoas - Site Institucional

Site institucional da Igreja Sara Nossa Terra - Sede Alagoas. Desenvolvido com **Next.js 14**, TypeScript e TailwindCSS.

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Lucide React (ícones)

## Como rodar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev
```

Acesse: **http://localhost:3000** (ou a porta indicada no terminal)

## Configuração

1. **Dados do site:** edite `config/site.ts` (WhatsApp, redes sociais, endereço, textos).
2. **Variáveis de ambiente:** copie `.env.example` para `.env` e preencha se usar Supabase/outros serviços.

## Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build`| Build para produção    |
| `npm run start`| Rodar build de produção |
| `npm run lint` | Verificar código       |

## Estrutura principal

```
├── app/           # Páginas e layout (Next.js App Router)
├── components/    # Componentes React
├── config/        # Dados do site (site.ts)
├── lib/           # Utilitários (ex.: WhatsApp)
└── public/        # Imagens e arquivos estáticos
```

## Deploy automático (GitHub → Vercel)

Para cada **push** na branch escolhida (ex.: `main` ou `geral`) gerar um deploy na Vercel:

### 1. Repositório no GitHub

- Código do projeto em um repositório GitHub (ex.: `midia-hub/saraalagoas` ou o que você usar).
- Faça push da branch que será usada em produção (ex.: `main` ou `geral`).

### 2. Conectar no Vercel

1. Acesse **[vercel.com](https://vercel.com)** e entre na sua conta (ou crie uma com **Continue with GitHub**).
2. Clique em **Add New…** → **Project**.
3. Em **Import Git Repository**, escolha **GitHub**. Se pedir, autorize o Vercel a acessar seus repositórios.
4. Selecione o repositório do projeto (ex.: `midia-hub/saraalagoas`).
5. Clique em **Import**.

### 3. Configurar o projeto

- **Framework Preset:** Next.js (já detectado).
- **Root Directory:** deixe em branco (raiz do repo).
- **Build Command:** `npm run build` (padrão).
- **Output Directory:** deixe o padrão (Next.js).
- **Install Command:** `npm install` (padrão).

### 4. Variáveis de ambiente

Em **Environment Variables**, adicione as mesmas que você usa no `.env` local (sem commitar o `.env`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- E as que forem necessárias para Google Drive (ex.: `GOOGLE_SERVICE_ACCOUNT_JSON` ou as da Opção 1/2 do `.env.example`).

**Não** defina `NEXT_PUBLIC_BASE_PATH` (deixe em branco) para o site na raiz do domínio (ex.: saraalagoas.com).

### 5. Deploy

- Clique em **Deploy**. O primeiro build será feito na hora.
- Depois, **cada push** na branch conectada (ex.: `main`) fará um novo deploy automaticamente.

### 6. Domínio (saraalagoas.com)

- No projeto na Vercel: **Settings** → **Domains**.
- Adicione **saraalagoas.com** (e **www.saraalagoas.com** se quiser).
- Siga as instruções da Vercel para configurar DNS no seu provedor (registro A ou CNAME conforme indicado).

## Antes de subir no Git

- **Nunca** commite o arquivo `.env` (já está no `.gitignore`).
- Copie `.env.example` para `.env` e preencha com suas chaves apenas no seu ambiente.

## Licença

© Sara Sede Alagoas. Todos os direitos reservados.
