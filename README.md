# Sara Sede Alagoas - Site Institucional

Site institucional da Igreja Sara Nossa Terra - Sede Alagoas. Next.js 14, TypeScript e TailwindCSS.

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Supabase (auth, storage, banco)
- Lucide React (ícones)
- Integração Meta (Instagram e Facebook) para publicações

## Como rodar

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000**

## Configuração

1. **Dados do site:** edite `config/site.ts` (WhatsApp, redes sociais, endereço, textos).
2. **Variáveis de ambiente:** copie `.env.example` para `.env` e preencha (Supabase, Meta, Google, etc.).

## Painel administrativo

- **Login:** `/admin/login` — com modais **Primeiro login** (magic link) e **Redefinir senha** na própria tela. Páginas separadas: `/admin/criar-acesso`, `/admin/reset-senha`, `/admin/completar-cadastro`.
- **Início:** `/admin`
- **Galeria:** `/admin/galeria` — álbuns e fotos (Drive).
- **Upload:** `/admin/upload` — fluxo em 3 etapas (informações, imagens, confirmação).
- **Consolidação:** `/admin/consolidacao/lista` (lista de convertidos), `/admin/consolidacao/conversoes` (formulário de conversão).
- **Publicações:** `/admin/instagram/posts` — painel de postagens (Instagram/Facebook).
- **Instâncias (Meta):** `/admin/instancias` — conectar contas Instagram/Facebook via OAuth.

### Fluxo de publicação (Instagram/Facebook)

1. Em **Galeria**, abra um álbum e clique em **Criar post**.
2. Em **Seleção de fotos**, escolha as imagens (até 10 para Instagram).
3. Em **Criar post**, edite as fotos (crop, ordem), escreva o texto, escolha a conta e os destinos (Instagram e/ou Facebook).
4. Escolha **Publicar agora** ou **Programar postagem** (data e hora).
5. Após publicar (ou programar), você é redirecionado ao **Painel de publicações**.

### Postagens programadas

- Na tela de criar post, use **Programar postagem** e defina data/hora.
- As programadas aparecem no **Painel de publicações** (seção “Postagens programadas”).
- **Processar fila agora** no painel dispara a publicação das programadas em atraso.
- Para publicação automática no horário: configure um cron (ex.: Vercel Cron) chamando `POST /api/social/run-scheduled` com header `x-cron-secret: <CRON_SECRET>`. Defina `CRON_SECRET` nas variáveis de ambiente.

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
│   └── admin/    # Painel (galeria, publicações, instâncias Meta, usuários, roles)
├── components/    # Componentes React
├── config/       # Dados do site (site.ts)
├── lib/          # Utilitários e integrações (meta, drive, publish-meta, etc.)
├── public/       # Imagens e estáticos
└── supabase/     # Migrations e Edge Functions
```

## Variáveis de ambiente (resumo)

Além das variáveis do Supabase e do Google Drive (galeria), para **publicações no Meta** (Instagram/Facebook):

- **META_APP_ID**, **META_APP_SECRET** — App Meta (developers.facebook.com).
- **NEXT_PUBLIC_META_REDIRECT_URI** — URL de callback OAuth (ex.: `https://seu-dominio.com/admin/instancias/oauth-done`).
- **CRON_SECRET** (opcional) — Para o cron de postagens programadas (`/api/social/run-scheduled`).

Consulte `.env.example` para a lista completa.

## Git (primeiro push)

O projeto já está pronto para versionamento. **Nunca commite** o arquivo `.env` (ele está no `.gitignore`).

```bash
git init
git add .
git status   # confira: .env não deve aparecer
git commit -m "chore: estado inicial do projeto"
git remote add origin <URL_DO_SEU_REPOSITORIO>
git branch -M main
git push -u origin main
```

Antes do primeiro push, confira que variáveis sensíveis (Supabase, Meta, Google) estão apenas em `.env` e que `.env` está ignorado.

## Deploy (Vercel)

Configure no painel da Vercel (Settings → Environment Variables) as mesmas variáveis do `.env.example`.

- **Galeria (Google Drive):** `GOOGLE_DRIVE_ROOT_FOLDER_ID` e `GOOGLE_SERVICE_ACCOUNT_JSON`. Sem elas, `/api/gallery/image` retorna 503.
- **Publicações Meta:** `META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_META_REDIRECT_URI`.
- **Postagens programadas (cron):** defina `CRON_SECRET` e configure um Cron Job para `POST /api/social/run-scheduled` com header `x-cron-secret`.

## Documentação adicional

- **Documentação completa da plataforma:** `DOCUMENTACAO_PLATAFORMA.md` — tecnologias, funcionalidades, autenticação (login, primeiro login, redefinir senha, completar cadastro), menu modular, consolidação, integrações, APIs, banco e variáveis de ambiente.
- **Menu admin:** `app/admin/README_MENU_MODULAR.md` e `app/admin/menu-config.ts`.
- **Consolidação:** `app/admin/IMPLEMENTACAO_CONSOLIDACAO.md` (se existir).
- **Módulo de postagem:** `app/admin/galeria/[id]/post/README.md` e `FLUXO_POSTAGEM.md`.
- **Templates de e-mail:** `supabase/email-templates/README.md`.

## Licença

© Sara Sede Alagoas. Todos os direitos reservados.
