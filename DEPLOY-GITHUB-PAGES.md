# Publicar no GitHub Pages (midia-hub.github.io/saraalagoas)

O projeto está configurado para **export estático** e publicação em **GitHub Pages**.

---

## 1. Configuração no GitHub (uma vez)

1. Abra o repositório: **https://github.com/midia-hub/saraalagoas**
2. **Settings** → **Pages**
3. Em **Source**: **Deploy from a branch**
4. **Branch**: escolha **gh-pages** (ou crie; ver passo 2 abaixo)
5. **Folder**: **/ (root)**
6. Salve (**Save**)

---

## 2. Gerar o site e publicar

No PowerShell, na pasta do projeto (`C:\midia_igreja`):

### Passo A – Build

```powershell
npm run build
```

Isso gera a pasta **`out`** com o site estático.

### Passo B – Publicar na branch gh-pages

**Opção 1 – Usando o script (recomendado)**

```powershell
.\deploy-github-pages.ps1
```

**Opção 2 – Manual**

```powershell
# Entrar na pasta do build
cd out

# Inicializar git (se ainda não existir)
git init
git add -A
git commit -m "Deploy para GitHub Pages"

# Criar branch gh-pages e enviar
git branch -M gh-pages
git remote add origin https://github.com/midia-hub/saraalagoas.git
# Se o remote já existir:
# git push origin gh-pages --force

git push -u origin gh-pages --force
```

**Se a branch gh-pages já existir** (atualizar o site):

```powershell
cd out
git init
git add -A
git commit -m "Atualizar site"
git branch -M gh-pages
git remote add origin https://github.com/midia-hub/saraalagoas.git
git push origin gh-pages --force
```

---

## 3. Ver o site

Depois de alguns minutos:

**https://midia-hub.github.io/saraalagoas/**

(Note a barra no final e o caminho `/saraalagoas/`.)

---

## 4. Resumo do fluxo

| Onde       | Conteúdo                          |
|-----------|------------------------------------|
| **main**  | Código fonte (app, components, etc.) |
| **gh-pages** | Só o conteúdo da pasta **out** (site estático) |

- Você desenvolve e faz commit na **main**.
- Quando quiser publicar: `npm run build` e depois rodar o script (ou os comandos) para enviar a pasta **out** para a branch **gh-pages**.

---

## 5. Problemas comuns

**Página em branco ou 404**
- Confirme que em **Settings → Pages** a branch é **gh-pages** e a pasta **/ (root)**.
- Acesse **https://midia-hub.github.io/saraalagoas/** (com `/saraalagoas/` no final).

**Imagens não aparecem**
- O build já está com `images: { unoptimized: true }` para export estático. Se ainda faltar alguma, verifique se o arquivo está em **public/**.

**Quero usar só a raiz (midia-hub.github.io)**
- Isso exige que o repositório se chame **midia-hub.github.io** e que o conteúdo do site esteja na raiz ou em **/docs**. Para o repo **saraalagoas**, a URL correta é **midia-hub.github.io/saraalagoas/**.
