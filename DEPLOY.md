# Guia de Deploy - Sara Sede Alagoas

Este guia mostra como fazer o deploy do site na Vercel, a plataforma recomendada para projetos Next.js.

## 🚀 Por que Vercel?

- Deploy gratuito para projetos pessoais
- Integração perfeita com Next.js
- HTTPS automático
- CDN global (site rápido no mundo todo)
- Deploy automático a cada commit
- Domínio personalizado gratuito

---

## 📋 Pré-requisitos

Antes de fazer o deploy:

- [ ] Código finalizado e testado localmente
- [ ] Todas as imagens adicionadas
- [ ] Número do WhatsApp configurado
- [ ] Dados do site atualizados em `config/site.ts`
- [ ] Build funcionando (`npm run build`)

---

## 🌐 Método 1: Deploy via GitHub (Recomendado)

### Passo 1: Criar Repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em "New repository"
3. Nome: `sara-sede-alagoas`
4. Deixe como **Private** (opcional)
5. Não inicialize com README
6. Clique em "Create repository"

### Passo 2: Enviar Código para o GitHub

Abra o terminal na pasta do projeto:

```bash
# Inicializar Git (se ainda não foi feito)
git init

# Adicionar todos os arquivos
git add .

# Fazer o primeiro commit
git commit -m "Initial commit: Sara Sede Alagoas website"

# Conectar com o repositório remoto (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/sara-sede-alagoas.git

# Enviar código
git branch -M main
git push -u origin main
```

### Passo 3: Conectar Vercel ao GitHub

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Sign Up" (ou "Login" se já tiver conta)
3. Escolha "Continue with GitHub"
4. Autorize a Vercel a acessar seus repositórios

### Passo 4: Importar Projeto

1. No dashboard da Vercel, clique em "Add New..."
2. Selecione "Project"
3. Encontre o repositório `sara-sede-alagoas`
4. Clique em "Import"

### Passo 5: Configurar Projeto

**Framework Preset**: Next.js (detectado automaticamente)

**Root Directory**: `./` (deixar padrão)

**Build Command**: `npm run build` (padrão)

**Output Directory**: `.next` (padrão)

**Install Command**: `npm install` (padrão)

Clique em "Deploy"

### Passo 6: Aguardar Deploy

- O primeiro deploy leva 2-3 minutos
- Você verá o progresso em tempo real
- Quando concluído, receberá uma URL: `sara-sede-alagoas.vercel.app`

### Passo 7: Testar o Site

1. Acesse a URL fornecida
2. Teste em desktop e mobile
3. Verifique todas as seções
4. Teste os botões do WhatsApp

---

## 🌍 Configurar Domínio Personalizado

### Opção 1: Usar Domínio Próprio

Se você já tem um domínio (ex: `sarasedealagoas.com.br`):

1. No dashboard da Vercel, vá em "Settings"
2. Clique em "Domains"
3. Clique em "Add"
4. Digite seu domínio
5. Siga as instruções para configurar DNS

**Configuração DNS:**

Adicione os seguintes registros no seu provedor de domínio:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Opção 2: Usar Subdomínio Vercel

O site já está disponível em:
```
https://sara-sede-alagoas.vercel.app
```

Você pode mudar o nome do projeto nas configurações.

---

## 🔄 Deploy Automático

Depois do primeiro deploy, cada vez que você fizer push no GitHub:

```bash
git add .
git commit -m "Atualização do site"
git push
```

A Vercel fará o deploy automaticamente! 🎉

---

## ⚙️ Método 2: Deploy via Vercel CLI

Se preferir fazer deploy direto do terminal:

### Passo 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Login

```bash
vercel login
```

### Passo 3: Deploy

```bash
# Na pasta do projeto
vercel
```

Responda as perguntas:

- Set up and deploy? **Y**
- Which scope? (sua conta)
- Link to existing project? **N**
- What's your project's name? **sara-sede-alagoas**
- In which directory is your code located? **.**

### Passo 4: Deploy para Produção

```bash
vercel --prod
```

---

## 📊 Monitoramento e Analytics

### Vercel Analytics (Gratuito)

1. No dashboard da Vercel, vá em "Analytics"
2. Clique em "Enable"
3. Veja visitantes, pageviews, etc.

### Google Analytics (Opcional)

Para adicionar Google Analytics:

1. Crie uma conta em [analytics.google.com](https://analytics.google.com)
2. Obtenha seu ID de medição (formato: G-XXXXXXXXXX)
3. Adicione no `app/layout.tsx`:

```tsx
// Adicionar no <head>
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

---

## 🔧 Variáveis de Ambiente

Se precisar adicionar variáveis de ambiente:

1. Na Vercel, vá em "Settings" → "Environment Variables"
2. Adicione as variáveis necessárias
3. Faça um novo deploy

**Exemplo:**
```
NEXT_PUBLIC_WHATSAPP=5582999999999
```

**No código:**
```typescript
const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP
```

---

## 📱 Preview de Pull Requests

Se usar GitHub:

1. Crie um branch: `git checkout -b nova-feature`
2. Faça as mudanças e commit
3. Push: `git push origin nova-feature`
4. Crie um Pull Request no GitHub
5. A Vercel cria um preview automático!

---

## 🐛 Troubleshooting

### Deploy falhou - Erro de Build

**Problema**: Build falha na Vercel

**Solução**:
```bash
# Testar build localmente
npm run build

# Se houver erros, corrija-os antes
```

### Imagens não aparecem no deploy

**Problema**: Imagens aparecem localmente mas não no deploy

**Causas comuns**:
- Nomes de arquivo com letra maiúscula (use lowercase)
- Imagens não commitadas no Git
- Caminho errado no código

**Solução**:
```bash
# Verificar se imagens estão no Git
git status

# Adicionar se necessário
git add public/
git commit -m "Adicionar imagens"
git push
```

### Site está desatualizado

**Problema**: Mudanças não aparecem

**Solução**:
1. Verifique se fez commit e push
2. Na Vercel, vá em "Deployments"
3. Veja se o último deploy está "Ready"
4. Limpe cache do navegador (Ctrl+F5)

### Erro 404 em algumas páginas

**Problema**: Página de privacidade dá erro 404

**Solução**:
- Verifique estrutura de pastas em `app/`
- Deve existir `app/privacidade/page.tsx`

---

## 🎯 Otimizações Pós-Deploy

### Performance

1. **Vercel Speed Insights**
   - Habilite em Settings → Speed Insights
   - Veja métricas de performance

2. **Compressão de Imagens**
   - Next.js otimiza automaticamente
   - Mas envie imagens já otimizadas

### SEO

1. **Sitemap**
   - Já configurado em `app/sitemap.ts`
   - Acesse: `seu-site.com/sitemap.xml`

2. **Robots.txt**
   - Já configurado em `public/robots.txt`
   - Acesse: `seu-site.com/robots.txt`

3. **Google Search Console**
   - Cadastre seu site em [search.google.com/search-console](https://search.google.com/search-console)
   - Submeta o sitemap

---

## 🔐 Segurança

### HTTPS

- Automático na Vercel ✅
- Certificado SSL gratuito

### Headers de Segurança

Adicione em `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
      ],
    },
  ]
}
```

---

## 📞 Suporte

### Documentação Oficial

- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)

### Problemas?

Se encontrar problemas no deploy, verifique:

1. Logs no dashboard da Vercel
2. Documentação do erro
3. Stack Overflow
4. GitHub Issues do Next.js

---

## ✅ Checklist Final

Antes de publicar:

- [ ] Build funciona localmente
- [ ] Todas as páginas testadas
- [ ] Links verificados
- [ ] WhatsApp testado
- [ ] Imagens todas carregando
- [ ] Mobile testado
- [ ] SEO configurado (title, description)
- [ ] Domínio configurado (se aplicável)
- [ ] Analytics instalado (opcional)

---

## 🎉 Parabéns!

Seu site está no ar! 🚀

Compartilhe com sua congregação:
- Instagram
- YouTube  
- WhatsApp
- Grupos da célula

---

**Última atualização**: 08/02/2026
