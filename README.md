# Sara Sede Alagoas - Site Institucional

Site institucional da Igreja Sara Nossa Terra - Sede Alagoas. Next.js 14, TypeScript e TailwindCSS.

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Supabase (auth, storage, banco)
- Lucide React (ícones)

## Como rodar

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000**

## Configuração

1. **Dados do site:** edite `config/site.ts` (WhatsApp, redes sociais, endereço, textos).
2. **Variáveis de ambiente:** copie `.env.example` para `.env` e preencha (Supabase, etc.).

## Scripts

| Comando        | Descrição                    |
|----------------|------------------------------|
| `npm run dev`  | Desenvolvimento              |
| `npm run build`| Build para produção          |
| `npm run start`| Rodar build de produção      |
| `npm run lint` | Verificar código             |

## Estrutura principal

```
├── app/           # Páginas e layout (Next.js App Router)
├── components/    # Componentes React
├── config/        # Dados do site (site.ts)
├── lib/           # Utilitários e integrações
├── public/        # Imagens e estáticos
└── supabase/      # Migrations e Edge Functions
```

## Deploy (Vercel)

Configure no painel da Vercel (Settings → Environment Variables) as mesmas variáveis do `.env.example`. Para a **galeria de imagens** (Google Drive) funcionar em produção:

1. **GOOGLE_DRIVE_ROOT_FOLDER_ID** – ID da pasta raiz no Drive (ex.: `1abc...xyz`).
2. **GOOGLE_SERVICE_ACCOUNT_JSON** – Conteúdo completo do JSON da Service Account em **uma linha** (o mesmo que está em `config/*-service-account.json` local). No Google Cloud: IAM → Service Accounts → criar chave JSON; copie o arquivo, minifique (uma linha) e cole no valor da variável.

Sem essas duas variáveis, a rota `/api/gallery/image` retorna 503 (Service Unavailable).

## Licença

© Sara Sede Alagoas. Todos os direitos reservados.
