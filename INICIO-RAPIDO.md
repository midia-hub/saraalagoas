# 🚀 Início Rápido - Sara Sede Alagoas

Guia rápido para colocar o site no ar em 30 minutos!

---

## ⚡ Setup em 5 Passos

### 1️⃣ Instalar Dependências (2 minutos)

```bash
# Renomear o arquivo package
# (Pode fazer manualmente ou usar o comando abaixo)
# Windows PowerShell:
Rename-Item package-nextjs.json package.json

# Instalar
npm install
```

---

### 2️⃣ Configurar Dados Básicos (5 minutos)

Abra o arquivo `config/site.ts` e altere:

```typescript
// OBRIGATÓRIO: Altere o número do WhatsApp
whatsappNumber: "5582999999999", // ← ALTERE AQUI

// URLs das redes sociais
social: {
  instagram: "https://www.instagram.com/seuperfil", // ← ALTERE
  youtube: "https://www.youtube.com/seucanal",      // ← ALTERE
},

// Endereço
address: {
  full: "Seu endereço completo aqui", // ← ALTERE
  mapUrl: "https://maps.app.goo.gl/...", // ← ALTERE
},
```

**💡 Dica**: Por enquanto, deixe as outras configurações como estão. Você pode personalizá-las depois.

---

### 3️⃣ Adicionar Imagens (10 minutos)

Os placeholders já foram criados! Agora substitua pelos arquivos reais:

**OBRIGATÓRIO:**
- `public/brand/logo.png` - Logo da igreja
- `public/hero.jpg` - Banner principal
- `public/leadership/frank.jpg` - Foto Bispo Frank
- `public/leadership/betania.jpg` - Foto Bispa Betânia

**OPCIONAL (pode usar os placeholders por enquanto):**
- `public/revisao/photo-1.jpg` até `photo-6.jpg`
- `public/kids/photo-1.jpg` e `photo-2.jpg`
- `public/favicon.svg`

**📋 Consulte `IMAGENS.md` para dimensões e detalhes**

---

### 4️⃣ Testar Localmente (2 minutos)

```bash
npm run dev
```

Abra http://localhost:3000 no navegador

**Teste:**
- ✅ Site carrega
- ✅ Imagens aparecem
- ✅ Menu funciona
- ✅ WhatsApp abre (testado no celular)

---

### 5️⃣ Publicar na Vercel (10 minutos)

#### Opção A: Via GitHub (Recomendado)

```bash
# 1. Inicializar Git
git init
git add .
git commit -m "Site Sara Sede Alagoas"

# 2. Criar repositório no GitHub
# Acesse github.com e crie um novo repositório

# 3. Enviar código
git remote add origin https://github.com/SEU-USUARIO/sara-sede-alagoas.git
git branch -M main
git push -u origin main

# 4. Deploy na Vercel
# Acesse vercel.com
# Conecte seu GitHub
# Importe o repositório
# Clique em "Deploy"
```

#### Opção B: Via Vercel CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

---

## ✅ Pronto!

Seu site está no ar! 🎉

**URL**: `sara-sede-alagoas.vercel.app` (ou a URL que a Vercel forneceu)

---

## 🎯 Próximos Passos (Opcional)

### Curto Prazo

1. **Personalizar Textos**
   - Edite `config/site.ts`
   - Revise descrições, títulos, etc.

2. **Adicionar Fotos Restantes**
   - Revisão/Imersão
   - Sara Kids
   - Outras seções

3. **Testar em Dispositivos**
   - Mobile
   - Tablet
   - Desktop

### Médio Prazo

4. **Configurar Domínio Próprio**
   - Compre um domínio (.com.br)
   - Configure na Vercel
   - Veja `DEPLOY.md` para detalhes

5. **Adicionar Analytics**
   - Vercel Analytics (grátis)
   - Google Analytics (opcional)

6. **Otimizar SEO**
   - Google Search Console
   - Submeter sitemap
   - Melhorar meta tags

### Longo Prazo

7. **Funcionalidades Extras**
   - Blog/Notícias
   - Sistema de eventos
   - Transmissão ao vivo
   - Área de downloads

---

## 📚 Documentação Completa

- **README-NEXTJS.md** - Documentação técnica completa
- **DEPLOY.md** - Guia detalhado de deploy
- **IMAGENS.md** - Lista de todas as imagens necessárias
- **FAQ.md** - Perguntas frequentes
- **CHECKLIST.md** - Checklist completo pré-deploy

---

## 🆘 Ajuda Rápida

### Site não carrega

```bash
# Reinstalar dependências
rm -rf node_modules
npm install
npm run dev
```

### Imagens não aparecem

- Verifique se os arquivos estão em `public/`
- Nomes devem ser exatamente como em `config/site.ts`
- Use lowercase (minúsculas)

### WhatsApp não abre

- Verifique o formato: `5582999999999`
- Sem espaços, hífens ou parênteses
- Teste no celular

### Erro ao fazer deploy

```bash
# Testar build localmente
npm run build

# Se houver erros, corrija antes de fazer deploy
```

---

## 💡 Dicas de Ouro

1. **Comece Simples**: Publique com o mínimo necessário e vá melhorando
2. **Teste Muito**: Principalmente no celular
3. **Peça Feedback**: Mostre para outras pessoas antes de divulgar
4. **Backup**: Mantenha cópias das imagens originais
5. **Atualize**: Mantenha o conteúdo sempre atualizado

---

## 🎨 Personalizações Rápidas

### Mudar Cores

Edite `tailwind.config.ts`:

```typescript
colors: {
  'sara-red': '#c62737', // ← Mude para sua cor
}
```

### Adicionar Rede Social

Edite `config/site.ts`:

```typescript
social: {
  instagram: "...",
  youtube: "...",
  facebook: "...", // ← Adicione aqui
}
```

E depois atualize os componentes que usam redes sociais.

### Alterar Horários dos Cultos

Edite `config/site.ts` → seção `services`:

```typescript
{
  name: "Culto de Fé e Milagres",
  time: "19h30", // ← Mude aqui
}
```

---

## 🤝 Suporte

### Documentação
- Leia os arquivos .md na pasta do projeto
- Consulte [Next.js Docs](https://nextjs.org/docs)
- Consulte [Vercel Docs](https://vercel.com/docs)

### Comunidade
- Stack Overflow
- Discord do Next.js
- Reddit r/nextjs

### Problemas Técnicos
- GitHub Issues
- Fórum da Vercel

---

## 🙏 Mensagem Final

Este site foi criado com muito carinho para ajudar a Sara Sede Alagoas a alcançar e transformar mais vidas através do amor de Cristo.

Que Deus abençoe este projeto e use-o poderosamente para Sua glória! 🙌

**Dúvidas?** Consulte os arquivos de documentação ou busque ajuda na comunidade.

**Sugestões?** Contribuições são bem-vindas!

---

**Criado em**: 08/02/2026  
**Versão**: 1.0.0  
**Tecnologia**: Next.js 14 + TypeScript + TailwindCSS

---

## 📞 Contato

Para suporte relacionado ao conteúdo do site, entre em contato com a equipe da Sara Sede Alagoas:

- Instagram: [@sarasedealagoas](https://instagram.com/sarasedealagoas)
- YouTube: [Sara Alagoas](https://youtube.com/saraalagoas)
- WhatsApp: Configure o número em `config/site.ts`

---

**Última atualização**: 08/02/2026
