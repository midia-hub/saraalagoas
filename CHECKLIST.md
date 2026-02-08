# Checklist Pré-Deploy - Sara Sede Alagoas

Use este checklist para garantir que tudo está pronto antes de publicar o site.

---

## ✅ Configuração Inicial

### Instalação

- [ ] Node.js instalado (versão 18 ou superior)
- [ ] Dependências instaladas (`npm install`)
- [ ] Projeto roda localmente (`npm run dev`)
- [ ] Build funciona sem erros (`npm run build`)

---

## 📝 Conteúdo e Dados

### Informações Gerais (config/site.ts)

- [ ] Nome da igreja correto
- [ ] Descrição atualizada
- [ ] URL do site configurada (se já tiver domínio)

### WhatsApp

- [ ] Número do WhatsApp configurado (formato: 5582999999999)
- [ ] Mensagens pré-preenchidas personalizadas
- [ ] Testado em dispositivo mobile
- [ ] Testado em desktop

### Redes Sociais

- [ ] URL do Instagram correta
- [ ] URL do YouTube correta
- [ ] Links testados (abrem em nova aba)

### Endereço e Localização

- [ ] Endereço completo e correto
- [ ] URL do Google Maps atualizada
- [ ] URL do embed do mapa funcionando
- [ ] Mapa carregando corretamente

### Liderança

- [ ] Nome do Bispo Frank correto
- [ ] Nome da Bispa Betânia correto
- [ ] Cargos atualizados
- [ ] Links do Instagram corretos
- [ ] Fotos adicionadas e carregando

### Cultos

- [ ] Culto de terça (Fé e Milagres) - horário correto
- [ ] Culto de sábado (Arena) - horário correto
- [ ] Culto de domingo manhã - horário correto
- [ ] Culto de domingo noite - horário correto
- [ ] Descrições atualizadas

### Células

- [ ] Título atualizado
- [ ] Descrição revisada
- [ ] Benefícios corretos
- [ ] CTA do WhatsApp funcionando

### Revisão/Imersão

- [ ] Título atualizado
- [ ] Descrição revisada
- [ ] Features listadas
- [ ] 6 fotos adicionadas
- [ ] CTA do WhatsApp funcionando

### Dízimos e Ofertas

- [ ] Descrição atualizada
- [ ] URL do link de contribuição (se houver)
- [ ] Botão aparecendo corretamente

### Sara Kids

- [ ] Descrição atualizada
- [ ] Features listadas
- [ ] 2 fotos adicionadas (com autorização dos pais)
- [ ] Fotos carregando

### Missão e Visão

- [ ] Texto curto atualizado
- [ ] Texto completo revisado
- [ ] Botão "Ler mais" funcionando

---

## 🖼️ Imagens

### Imagens Obrigatórias

- [ ] Logo da igreja (`public/brand/logo.png`)
- [ ] Banner principal (`public/hero.jpg`)
- [ ] Foto Bispo Frank (`public/leadership/frank.jpg`)
- [ ] Foto Bispa Betânia (`public/leadership/betania.jpg`)
- [ ] 6 fotos Revisão (`public/revisao/photo-1.jpg até photo-6.jpg`)
- [ ] 2 fotos Kids (`public/kids/photo-1.jpg e photo-2.jpg`)
- [ ] Favicon (`public/favicon.svg` ou `.ico`)

### Qualidade das Imagens

- [ ] Todas as imagens são de boa qualidade
- [ ] Imagens otimizadas (< 500KB cada)
- [ ] Formatos corretos (JPG, PNG, SVG)
- [ ] Nomes dos arquivos em lowercase
- [ ] Sem espaços nos nomes dos arquivos

### Direitos de Uso

- [ ] Tenho direito de uso de todas as imagens
- [ ] Autorização dos pais para fotos de crianças
- [ ] Autorização das pessoas nas fotos
- [ ] Créditos dados (se necessário)

---

## 🎨 Design e Responsividade

### Desktop

- [ ] Testado no Chrome
- [ ] Testado no Firefox
- [ ] Testado no Safari
- [ ] Testado no Edge
- [ ] Layout correto em 1920px
- [ ] Layout correto em 1366px
- [ ] Layout correto em 1024px

### Mobile

- [ ] Testado no Chrome Mobile
- [ ] Testado no Safari Mobile
- [ ] Layout correto em 375px (iPhone)
- [ ] Layout correto em 414px (iPhone Plus)
- [ ] Layout correto em 360px (Android)
- [ ] Menu hambúrguer funcionando
- [ ] Scroll suave funcionando

### Tablet

- [ ] Testado em iPad
- [ ] Testado em Android Tablet
- [ ] Layout correto em 768px
- [ ] Layout correto em 1024px

---

## 🔗 Funcionalidades

### Navegação

- [ ] Menu desktop funcionando
- [ ] Menu mobile funcionando
- [ ] Scroll suave para seções
- [ ] Header fixo funcionando
- [ ] Logo clicável (volta ao topo)

### Botões e Links

- [ ] Todos os botões clicáveis
- [ ] CTAs do WhatsApp funcionando
- [ ] Links das redes sociais funcionando
- [ ] Link "Como chegar" funcionando
- [ ] Link para privacidade funcionando
- [ ] Hover states funcionando

### WhatsApp Flutuante

- [ ] Botão visível em todas as páginas
- [ ] Menu de opções abrindo
- [ ] 3 opções disponíveis
- [ ] Cada opção com mensagem correta
- [ ] Abre WhatsApp corretamente

### Formulários e Interações

- [ ] Accordion da missão funcionando
- [ ] Animações suaves
- [ ] Sem erros no console
- [ ] Loading rápido

---

## 🔍 SEO e Performance

### Meta Tags

- [ ] Title tag configurado
- [ ] Description configurada
- [ ] Keywords configuradas
- [ ] Open Graph configurado
- [ ] Twitter Card configurado
- [ ] Viewport configurado
- [ ] Theme color configurado

### Arquivos SEO

- [ ] `sitemap.xml` gerado
- [ ] `robots.txt` criado
- [ ] `manifest.json` criado
- [ ] Favicon presente

### Performance

- [ ] Lighthouse Score > 90
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Imagens com lazy loading
- [ ] Sem erros no console
- [ ] Sem warnings no console

---

## 🔐 Segurança e Privacidade

- [ ] HTTPS configurado (automático na Vercel)
- [ ] Política de privacidade criada
- [ ] Link para privacidade no footer
- [ ] Sem dados sensíveis no código
- [ ] Sem API keys expostas
- [ ] `.env` não commitado

---

## 📱 Acessibilidade

- [ ] Todas as imagens com alt text
- [ ] Botões com aria-labels
- [ ] Contraste adequado (WCAG AA)
- [ ] Navegação por teclado funciona
- [ ] Focus visível em elementos interativos
- [ ] Textos legíveis (tamanho mínimo 16px)

---

## 🧪 Testes

### Funcionalidades

- [ ] Todos os links testados
- [ ] Todos os botões testados
- [ ] Scroll suave testado
- [ ] Menu mobile testado
- [ ] WhatsApp testado em diferentes dispositivos

### Browsers

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Chrome Mobile
- [ ] Safari Mobile

### Dispositivos

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Mobile Large (414x896)

---

## 📄 Documentação

- [ ] README.md atualizado
- [ ] DEPLOY.md revisado
- [ ] FAQ.md revisado
- [ ] IMAGENS.md revisado
- [ ] CHECKLIST.md (este arquivo) revisado
- [ ] Comentários no código onde necessário

---

## 🚀 Deploy

### Pré-Deploy

- [ ] Build local funciona (`npm run build`)
- [ ] Sem erros de TypeScript
- [ ] Sem erros de ESLint
- [ ] Sem warnings importantes
- [ ] `.gitignore` configurado
- [ ] Arquivos desnecessários removidos

### Git

- [ ] Repositório GitHub criado
- [ ] `.env` no `.gitignore`
- [ ] Commit inicial feito
- [ ] Push para GitHub feito
- [ ] Branch `main` como padrão

### Vercel

- [ ] Conta Vercel criada
- [ ] Projeto importado
- [ ] Build bem-sucedido
- [ ] Deploy funcionando
- [ ] URL de preview testada

### Domínio (Opcional)

- [ ] Domínio comprado
- [ ] DNS configurado
- [ ] SSL ativo
- [ ] Redirecionamento www funcionando
- [ ] Site acessível via domínio

---

## 📊 Pós-Deploy

### Monitoramento

- [ ] Vercel Analytics habilitado
- [ ] Google Analytics instalado (opcional)
- [ ] Google Search Console configurado
- [ ] Sitemap submetido

### Testes de Produção

- [ ] Site acessível
- [ ] Todas as páginas carregam
- [ ] Imagens carregam corretamente
- [ ] WhatsApp funciona em produção
- [ ] Performance adequada
- [ ] Sem erros 404

### Divulgação

- [ ] URL compartilhada no Instagram
- [ ] URL compartilhada no YouTube
- [ ] URL enviada para membros
- [ ] QR Code criado (opcional)
- [ ] Material gráfico atualizado

---

## 🎯 Otimizações Futuras

### Curto Prazo

- [ ] Adicionar mais fotos
- [ ] Adicionar vídeos
- [ ] Criar eventos/agenda
- [ ] Adicionar testemunhos

### Médio Prazo

- [ ] Sistema de inscrição para eventos
- [ ] Blog/notícias
- [ ] Transmissão ao vivo
- [ ] Área de downloads (material de estudo)

### Longo Prazo

- [ ] Plataforma de ensino (EAD)
- [ ] Sistema de células online
- [ ] App mobile
- [ ] Dashboard administrativo

---

## ✅ Checklist Rápido (Resumo)

**CRÍTICO - Não publicar sem:**

- [ ] Todas as imagens adicionadas
- [ ] WhatsApp configurado e testado
- [ ] Build funciona sem erros
- [ ] Testado em mobile e desktop
- [ ] Sem erros no console

**IMPORTANTE:**

- [ ] SEO configurado
- [ ] Performance > 90
- [ ] Acessibilidade básica
- [ ] Links das redes sociais
- [ ] Política de privacidade

**DESEJÁVEL:**

- [ ] Analytics configurado
- [ ] Domínio personalizado
- [ ] Google Search Console
- [ ] Otimizações de performance

---

## 📝 Notas Finais

### Antes de Publicar

1. Revise este checklist completamente
2. Teste em pelo menos 3 dispositivos diferentes
3. Peça para alguém testar também
4. Corrija todos os problemas encontrados
5. Faça backup do código

### Depois de Publicar

1. Monitore erros nos primeiros dias
2. Colete feedback dos usuários
3. Faça ajustes necessários
4. Mantenha conteúdo atualizado

---

## 🎉 Pronto para Publicar?

Se você marcou todos os itens **CRÍTICO** e **IMPORTANTE**, está pronto!

**Último passo**: Faça uma oração pedindo que Deus abençoe este site e use-o para alcançar e transformar vidas! 🙏

---

**Data de revisão**: ___/___/______

**Revisado por**: _______________________

**Aprovado para deploy**: [ ] Sim [ ] Não

**Observações**:
_______________________________________________
_______________________________________________
_______________________________________________

---

**Última atualização**: 08/02/2026
