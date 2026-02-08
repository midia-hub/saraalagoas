# FAQ - Perguntas Frequentes

Respostas para as dúvidas mais comuns sobre o site Sara Sede Alagoas.

---

## 🎨 Personalização

### Como alterar as cores do site?

Edite o arquivo `tailwind.config.ts`:

```typescript
colors: {
  'sara-gray-light': '#B6B8BA',  // Altere aqui
  'sara-gray-dark': '#252525',   // Altere aqui
  'sara-white': '#FFFFFF',       // Altere aqui
  'sara-red': '#c62737',         // Altere aqui
}
```

Depois rode:
```bash
npm run dev
```

---

### Como alterar o número do WhatsApp?

Edite `config/site.ts`:

```typescript
whatsappNumber: "5582999999999", // Formato: 55 + DDD + número
```

**Importante**: Não use espaços, hífens ou parênteses.

✅ Correto: `5582999999999`  
❌ Errado: `55 (82) 99999-9999`

---

### Como alterar os textos do site?

Todos os textos estão centralizados em `config/site.ts`.

Exemplo para alterar a descrição da célula:

```typescript
cell: {
  title: "Faça parte de uma Célula",
  description: "SEU NOVO TEXTO AQUI",
  // ...
}
```

---

### Como adicionar mais cultos?

Edite `config/site.ts` → seção `services`:

```typescript
services: [
  // ... cultos existentes
  {
    id: "novo-culto",
    name: "Nome do Culto",
    day: "Quinta-feira",
    time: "20h00",
    type: "Presencial",
    description: "Descrição do culto",
  },
]
```

---

### Como trocar as fotos da liderança?

1. Coloque as novas fotos em `public/leadership/`
2. Mantenha os mesmos nomes (`frank.jpg` e `betania.jpg`)
3. Ou altere em `config/site.ts`:

```typescript
leadership: [
  {
    name: "Novo Nome",
    image: "/leadership/nova-foto.jpg", // Novo caminho
    // ...
  },
]
```

---

## 📱 WhatsApp

### O botão do WhatsApp não abre nada

**Possíveis causas:**

1. **Número errado**: Verifique o formato em `config/site.ts`
   - Deve ser: `55` + DDD + número
   - Exemplo: `5582999999999`

2. **WhatsApp não instalado**: No computador, instale o WhatsApp Desktop ou use WhatsApp Web

---

### Posso usar mais de um número de WhatsApp?

Sim! Você pode configurar números diferentes para cada seção.

Em `config/site.ts`:

```typescript
whatsappNumber: "5582999999999", // Número geral

// Em cada seção, você pode sobrescrever:
cell: {
  whatsappNumber: "5582988888888", // Número específico da célula
}
```

E no componente, use o número específico.

---

### Como mudar as mensagens pré-preenchidas?

Edite `config/site.ts` → `whatsappMessages`:

```typescript
whatsappMessages: {
  general: "Sua nova mensagem aqui",
  prayer: "Sua nova mensagem aqui",
  cell: "Sua nova mensagem aqui",
  immersion: "Sua nova mensagem aqui",
}
```

---

## 🖼️ Imagens

### As imagens não aparecem

**Checklist:**

1. ✅ Imagens estão na pasta `public/`?
2. ✅ Nomes dos arquivos estão corretos?
3. ✅ Formato é JPG, PNG ou WebP?
4. ✅ Você rodou `npm run dev` novamente?

**Atenção**: Nomes de arquivo são case-sensitive!
- ✅ `frank.jpg`
- ❌ `Frank.jpg` ou `FRANK.jpg`

---

### Como otimizar imagens grandes?

Use ferramentas online gratuitas:

1. [TinyPNG](https://tinypng.com/) - Comprimir JPG/PNG
2. [Squoosh](https://squoosh.app/) - Comprimir e converter
3. [ImageOptim](https://imageoptim.com/) - App para Mac

Recomendado: manter imagens < 500KB

---

### Posso usar fotos de banco de imagens?

Sim, desde que tenha direito de uso. Sites recomendados:

**Gratuitos:**
- [Unsplash](https://unsplash.com/)
- [Pexels](https://pexels.com/)
- [Pixabay](https://pixabay.com/)

**Pagos:**
- [Shutterstock](https://shutterstock.com/)
- [Adobe Stock](https://stock.adobe.com/)

---

## 🚀 Deploy e Hospedagem

### Preciso pagar para hospedar o site?

Não! A Vercel oferece plano gratuito que inclui:

- ✅ Hospedagem gratuita
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Deploy ilimitado
- ✅ Domínio Vercel (.vercel.app)

Você só paga se quiser recursos avançados ou domínio personalizado.

---

### Quanto custa um domínio personalizado?

Domínios `.com.br` custam cerca de R$ 40/ano.

Onde comprar:
- [Registro.br](https://registro.br/) - Oficial para .br
- [GoDaddy](https://godaddy.com/)
- [Hostinger](https://hostinger.com.br/)

---

### Como atualizar o site depois do deploy?

```bash
# Fazer mudanças no código
# Depois:

git add .
git commit -m "Descrição da mudança"
git push
```

A Vercel faz o deploy automático! 🎉

---

### Quanto tempo leva para o site atualizar?

- Deploy na Vercel: **2-3 minutos**
- Propagação no mundo todo: **instantâneo**
- Cache do navegador: limpe com **Ctrl+F5**

---

## 🎯 Funcionalidades

### Como adicionar uma nova seção?

1. **Crie o componente:**

```tsx
// components/MinhaNovaSecao.tsx
import SectionWrapper from './SectionWrapper'

export default function MinhaNovaSecao() {
  return (
    <SectionWrapper id="minha-secao" bgColor="white">
      <h2>Minha Nova Seção</h2>
      <p>Conteúdo...</p>
    </SectionWrapper>
  )
}
```

2. **Importe em `app/page.tsx`:**

```tsx
import MinhaNovaSecao from '@/components/MinhaNovaSecao'

// Adicione no return:
<MinhaNovaSecao />
```

3. **Adicione no menu em `config/site.ts`:**

```typescript
menuItems: [
  // ... outros itens
  { id: "minha-secao", label: "Minha Seção" },
]
```

---

### Como adicionar vídeos?

**Opção 1: YouTube Embed**

```tsx
<iframe
  width="100%"
  height="400"
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="Título do Vídeo"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>
```

**Opção 2: Vídeo Local**

```tsx
<video controls width="100%">
  <source src="/video.mp4" type="video/mp4" />
</video>
```

---

### Como adicionar Google Maps?

Já está configurado! Apenas atualize a URL do embed em `config/site.ts`:

```typescript
address: {
  embedUrl: "SUA_URL_DO_GOOGLE_MAPS_EMBED",
}
```

**Como obter a URL do embed:**

1. Abra Google Maps
2. Busque seu endereço
3. Clique em "Compartilhar"
4. Clique em "Incorporar mapa"
5. Copie o código (use apenas a URL do `src`)

---

### Como adicionar formulário de contato?

Recomendamos usar serviços externos:

**Opção 1: Google Forms**
- Gratuito
- Fácil de usar
- Respostas em planilha

**Opção 2: Formspree**
- Gratuito até 50 envios/mês
- Integração simples
- [formspree.io](https://formspree.io/)

**Opção 3: Tally**
- Gratuito
- Visual moderno
- [tally.so](https://tally.so/)

---

## 🔧 Problemas Técnicos

### Erro: "Module not found"

**Solução:**

```bash
# Reinstalar dependências
rm -rf node_modules
npm install
```

---

### Erro: "Port 3000 is already in use"

**Solução:**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill
```

Ou use outra porta:

```bash
npm run dev -- -p 3001
```

---

### Build falha com erro de TypeScript

**Solução:**

```bash
# Verificar erros
npm run build

# Se houver erros de tipo, corrija-os ou:
# (não recomendado para produção)
# Desabilite verificação no next.config.js:

typescript: {
  ignoreBuildErrors: true,
}
```

---

### Site está lento

**Checklist:**

1. ✅ Imagens otimizadas?
2. ✅ Usando next/image?
3. ✅ Menos de 20 imagens por página?
4. ✅ Vercel Analytics mostra problemas?

**Melhorias:**

- Comprimir imagens
- Lazy loading (automático no Next.js)
- Usar WebP em vez de PNG

---

## 📱 Mobile

### Site não está responsivo

O site já é responsivo! Se algo não estiver correto:

1. Teste no navegador com DevTools (F12)
2. Teste em dispositivo real
3. Verifique classes Tailwind:
   - Use `md:` para desktop
   - Use classes base para mobile

---

### Botões muito pequenos no mobile

Aumente o tamanho do botão:

```tsx
<Button size="lg"> // Em vez de "md" ou "sm"
```

---

## 🔐 Segurança

### Posso adicionar login/área restrita?

Sim, mas requer desenvolvimento adicional. Opções:

1. **NextAuth.js** - Autenticação gratuita
2. **Clerk** - Mais fácil, plano gratuito limitado
3. **Auth0** - Robusto, plano gratuito disponível

---

### Como proteger contra spam no WhatsApp?

O site não coleta dados, apenas redireciona para o WhatsApp.

Para evitar spam:
1. Monitore mensagens
2. Configure resposta automática
3. Use WhatsApp Business
4. Considere usar chatbot

---

## 📊 Analytics

### Como ver quantas pessoas visitam?

**Opção 1: Vercel Analytics** (Grátis)
- Habilite em Settings → Analytics
- Veja visitantes em tempo real

**Opção 2: Google Analytics** (Grátis)
- Mais detalhado
- Veja FAQ de deploy para instalação

---

### Como saber de onde vêm os visitantes?

Com Google Analytics você vê:
- Origem (Google, Instagram, direto, etc.)
- Localização geográfica
- Dispositivo (mobile, desktop)
- Tempo no site
- Páginas mais visitadas

---

## ❓ Outras Perguntas

### Posso vender produtos no site?

Sim! Você pode:

1. **Integrar loja externa**: Adicione links para Hotmart, Monetizze, etc.
2. **Criar loja própria**: Use Shopify, WooCommerce, etc.
3. **Usar API de pagamento**: Stripe, Mercado Pago, etc.

---

### Como adicionar blog/notícias?

Você pode:

1. **WordPress separado**: Link externo
2. **Next.js CMS**: Contentful, Sanity, etc.
3. **Markdown**: Crie posts em arquivos .md

---

### Posso traduzir o site para inglês?

Sim! Você precisaria:

1. Instalar `next-intl` ou similar
2. Criar arquivos de tradução
3. Adicionar seletor de idioma

---

### Como adicionar reCAPTCHA?

Se adicionar formulários:

```bash
npm install react-google-recaptcha
```

Veja docs: [react-google-recaptcha](https://www.npmjs.com/package/react-google-recaptcha)

---

## 📞 Suporte

### Onde buscar ajuda?

1. **Documentação**: README.md, DEPLOY.md, etc.
2. **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
3. **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
4. **Stack Overflow**: [stackoverflow.com](https://stackoverflow.com/)
5. **GitHub Issues**: Reporte bugs

---

### Como contratar desenvolvimento personalizado?

Para funcionalidades avançadas, procure:

- Desenvolvedores Next.js freelancers
- Agências de desenvolvimento web
- Plataformas: Workana, 99Freelas, Upwork

---

**Última atualização**: 08/02/2026

---

**Não encontrou sua dúvida?**

Abra uma issue no GitHub ou entre em contato com a equipe técnica.
