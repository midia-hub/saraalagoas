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

## Deploy

Deploy recomendado na **Vercel**. Configure as variáveis de ambiente no painel da Vercel (use `.env.example` como referência).

## Licença

© Sara Sede Alagoas. Todos os direitos reservados.
