# 🔧 Configurar Projeto Next.js

## ⚠️ Situação Atual

Você tem **dois projetos** nesta pasta:

1. **Projeto Vite** (atual) - Sistema de upload facial
2. **Projeto Next.js** (novo) - Site institucional Sara Sede Alagoas

O erro ocorre porque você está tentando rodar o Next.js, mas o `package.json` atual é do Vite.

---

## 🚀 Solução Rápida

Execute o script de configuração:

```powershell
.\setup-nextjs.ps1
```

Este script vai:
1. ✅ Fazer backup do projeto Vite
2. ✅ Configurar o Next.js
3. ✅ Instalar dependências corretas
4. ✅ Deixar tudo pronto para usar

---

## 📋 Passo a Passo Manual (Alternativa)

Se preferir fazer manualmente:

### 1. Backup do Projeto Vite

```powershell
# Fazer backup
Copy-Item package.json package.json.vite-backup
```

### 2. Substituir package.json

```powershell
# Copiar o package.json do Next.js
Copy-Item package-nextjs.json package.json -Force
```

### 3. Limpar e Reinstalar

```powershell
# Remover instalações antigas
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force

# Instalar dependências do Next.js
npm install
```

### 4. Testar

```powershell
npm run dev
```

Abra http://localhost:3000

---

## 🔄 Voltar para o Projeto Vite

Se precisar voltar ao projeto original:

```powershell
# Restaurar backup
Copy-Item package.json.vite-backup package.json -Force

# Reinstalar dependências
Remove-Item node_modules -Recurse -Force
npm install

# Rodar projeto Vite
npm run dev
```

---

## 📁 Organização Sugerida

### Opção 1: Pastas Separadas (Recomendado)

```
C:\projetos\
├── midia_igreja\          ← Projeto Vite (upload facial)
└── sara-sede-alagoas\     ← Projeto Next.js (site institucional)
```

**Vantagens:**
- Projetos independentes
- Sem conflitos
- Mais organizado

**Como fazer:**

```powershell
# Criar nova pasta
mkdir C:\projetos\sara-sede-alagoas

# Copiar arquivos do Next.js
Copy-Item app C:\projetos\sara-sede-alagoas\app -Recurse
Copy-Item components C:\projetos\sara-sede-alagoas\components -Recurse
Copy-Item config C:\projetos\sara-sede-alagoas\config -Recurse
Copy-Item lib C:\projetos\sara-sede-alagoas\lib -Recurse
Copy-Item public C:\projetos\sara-sede-alagoas\public -Recurse
Copy-Item package-nextjs.json C:\projetos\sara-sede-alagoas\package.json
Copy-Item next.config.js C:\projetos\sara-sede-alagoas\
Copy-Item tailwind.config.ts C:\projetos\sara-sede-alagoas\
Copy-Item tsconfig-nextjs.json C:\projetos\sara-sede-alagoas\tsconfig.json
Copy-Item postcss.config.js C:\projetos\sara-sede-alagoas\
Copy-Item *.md C:\projetos\sara-sede-alagoas\

# Ir para nova pasta e instalar
cd C:\projetos\sara-sede-alagoas
npm install
npm run dev
```

### Opção 2: Usar o Script (Atual)

Continuar na mesma pasta alternando entre projetos quando necessário.

---

## 🎯 Resumo dos Arquivos

### Arquivos do Projeto Vite (Original)
- `package.json` (atual)
- `vite.config.ts`
- `src/` (pasta)
- `index.html`

### Arquivos do Projeto Next.js (Novo)
- `package-nextjs.json`
- `next.config.js`
- `app/` (pasta)
- `components/` (pasta)
- `config/` (pasta)
- `lib/` (pasta)

---

## ✅ Checklist

Depois de executar o script:

- [ ] `npm run dev` funciona sem erros
- [ ] Abre http://localhost:3000
- [ ] Site carrega corretamente
- [ ] Sem erros no console

Se tudo funcionou:

- [ ] Configure `config/site.ts`
- [ ] Adicione suas imagens
- [ ] Personalize o conteúdo

---

## 🆘 Problemas?

### Erro: "Cannot find module 'next'"

```powershell
npm install
```

### Erro: PostCSS/Tailwind

```powershell
npm install tailwindcss postcss autoprefixer
```

### Erro: Module not found

```powershell
# Limpar cache
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

---

## 💡 Recomendação Final

Para evitar confusão, **crie pastas separadas** para cada projeto:

1. **midia_igreja** → Projeto Vite (upload facial)
2. **sara-sede-alagoas** → Projeto Next.js (site institucional)

Isso manterá tudo organizado e sem conflitos!

---

**Última atualização**: 08/02/2026
