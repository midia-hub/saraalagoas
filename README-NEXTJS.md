# Sara Sede Alagoas - Site Institucional

Site institucional da Igreja Sara Nossa Terra - Sede Alagoas, desenvolvido com Next.js 14, TypeScript e TailwindCSS.

## 🚀 Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Lucide React** (ícones)
- **Next/Image** (otimização de imagens)

## 📁 Estrutura do Projeto

```
projeto/
├── app/                      # Rotas e páginas Next.js
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx             # Página inicial
│   ├── globals.css          # Estilos globais
│   ├── sitemap.ts           # Sitemap
│   └── privacidade/         # Página de privacidade
├── components/              # Componentes React
├── config/                  # Configurações
│   └── site.ts             # Dados do site
├── lib/                     # Utilitários
│   └── whatsapp.ts         # Helper do WhatsApp
└── public/                  # Arquivos estáticos
    ├── brand/              # Logo
    ├── leadership/         # Fotos liderança
    ├── revisao/           # Fotos revisão
    ├── kids/              # Fotos kids
    └── hero.jpg           # Banner principal
```

## 🎨 Identidade Visual

### Cores

- **Cinza Claro**: #B6B8BA (40%)
- **Cinza Escuro**: #252525 (40%)
- **Branco**: #FFFFFF (10%)
- **Vermelho**: #c62737 (10% - cor de acento)

### Tipografia

- **Fonte**: Poppins (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700

## ⚙️ Instalação e Configuração

### 1. Instalar Dependências

```bash
# Renomear package-nextjs.json para package.json
mv package-nextjs.json package.json

# Instalar dependências
npm install
```

### 2. Configurar Dados do Site

Edite o arquivo `config/site.ts`:

- Altere o número do WhatsApp (campo `whatsappNumber`)
- Atualize URLs das redes sociais
- Configure o endereço e URL do mapa
- Personalize textos e descrições

### 3. Adicionar Imagens

Coloque as imagens nas pastas indicadas:

```
public/
├── brand/
│   └── logo.png          # Logo da igreja (120x50px recomendado)
├── leadership/
│   ├── frank.jpg         # Foto Bispo Frank (500x500px recomendado)
│   └── betania.jpg       # Foto Bispa Betânia (500x500px)
├── revisao/
│   ├── photo-1.jpg       # 6 fotos da Revisão/Imersão
│   └── ...               # (800x800px recomendado)
├── kids/
│   ├── photo-1.jpg       # 2 fotos do Sara Kids
│   └── photo-2.jpg       # (800x800px recomendado)
├── hero.jpg              # Banner principal (1920x1080px recomendado)
└── favicon.svg           # Ícone do site
```

### 4. Rodar Localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

### 5. Build para Produção

```bash
npm run build
npm start
```

## 📱 WhatsApp

O site possui integração com WhatsApp em vários pontos:

1. **Botão Flutuante**: Canto inferior direito com 3 opções
2. **CTAs nas Seções**: Célula, Oração, Revisão

Para alterar o número do WhatsApp, edite `config/site.ts`:

```typescript
whatsappNumber: "5582999999999", // Formato: 55 + DDD + número
```

## 🎯 Personalização

### Alterar Cores

Edite `tailwind.config.ts`:

```typescript
colors: {
  'sara-gray-light': '#B6B8BA',
  'sara-gray-dark': '#252525',
  'sara-white': '#FFFFFF',
  'sara-red': '#c62737',
}
```

### Adicionar Nova Seção

1. Crie o componente em `components/NovaSecao.tsx`
2. Importe e adicione em `app/page.tsx`
3. Adicione o item no menu em `config/site.ts` (menuItems)

### Alterar Textos

Todos os textos estão centralizados em `config/site.ts` para facilitar manutenção.

## 📦 Deploy na Vercel

### Método 1: Via GitHub

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Conecte seu repositório
4. Configure o domínio
5. Deploy automático!

### Método 2: Via Vercel CLI

```bash
npm i -g vercel
vercel
```

## 🔧 Manutenção

### Atualizar Horários dos Cultos

Edite `config/site.ts` → `services`

### Atualizar Fotos

Substitua as imagens em `public/` mantendo os mesmos nomes

### Adicionar Link de Ofertas

Edite `config/site.ts`:

```typescript
offerings: {
  url: "https://seu-link-de-ofertas.com",
}
```

## 📋 Checklist Pré-Deploy

- [ ] Número do WhatsApp configurado
- [ ] Todas as imagens adicionadas
- [ ] Logo da igreja inserido
- [ ] URLs das redes sociais atualizadas
- [ ] Link do Google Maps configurado
- [ ] Textos revisados
- [ ] Cores personalizadas (se necessário)
- [ ] Testado em mobile
- [ ] Testado em desktop
- [ ] SEO verificado (title, description)

## 🐛 Troubleshooting

### Imagens não aparecem

- Verifique se as imagens estão em `public/`
- Nomes dos arquivos devem corresponder aos em `config/site.ts`
- Formato suportado: jpg, png, webp

### WhatsApp não abre

- Verifique o formato do número: 55 + DDD + número
- Exemplo correto: `5582999999999`

### Erro ao buildar

```bash
# Limpar cache e reinstalar
rm -rf .next node_modules
npm install
npm run build
```

## 📞 Suporte

Para dúvidas ou problemas, entre em contato através das redes sociais da Sara Sede Alagoas.

## 📄 Licença

© 2026 Sara Sede Alagoas. Todos os direitos reservados.
