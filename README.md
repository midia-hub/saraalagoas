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

## Deploy

O projeto está pronto para deploy na **Vercel** ou em qualquer host que suporte Next.js (Node).

## Antes de subir no Git

- **Nunca** commite o arquivo `.env` (já está no `.gitignore`).
- Copie `.env.example` para `.env` e preencha com suas chaves apenas no seu ambiente.

## Licença

© Sara Sede Alagoas. Todos os direitos reservados.
