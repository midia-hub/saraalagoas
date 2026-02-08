# Subir o projeto no GitHub

Siga os passos abaixo para publicar o repositório no GitHub.

> **Resumo:** Criar repositório no GitHub → na pasta do projeto: `git init` → `git add .` → `git commit -m "..."` → `git remote add origin URL` → `git push -u origin main`

## 1. Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login.
2. Clique em **"+"** → **"New repository"**.
3. **Repository name:** `sara-sede-alagoas` (ou outro nome).
4. **Description:** Site institucional Sara Sede Alagoas.
5. Escolha **Public** ou **Private**.
6. **Não** marque "Add a README" (o projeto já tem arquivos).
7. Clique em **"Create repository"**.

## 2. Inicializar Git e fazer o primeiro push (PowerShell)

Abra o terminal na pasta do projeto (`c:\midia_igreja`) e execute:

```powershell
# Inicializar repositório (se ainda não foi)
git init

# Adicionar todos os arquivos
git add .

# Ver o que será commitado (opcional)
git status

# Primeiro commit
git commit -m "Site Sara Sede Alagoas - Next.js 14"

# Renomear branch para main (se necessário)
git branch -M main

# Adicionar o repositório remoto (substitua SEU-USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU-USUARIO/sara-sede-alagoas.git

# Enviar para o GitHub
git push -u origin main
```

## 3. Se o Git já estiver inicializado

Se a pasta já tiver sido inicializada com `git init` antes:

```powershell
git add .
git status
git commit -m "Site Sara Sede Alagoas - Next.js 14"
git remote add origin https://github.com/SEU-USUARIO/sara-sede-alagoas.git
git branch -M main
git push -u origin main
```

Se o `origin` já existir (erro: "remote origin already exists"), **troque a URL** em vez de adicionar:

```powershell
# Trocar para a URL correta (HTTPS)
git remote set-url origin https://github.com/SEU-USUARIO/NOME-DO-REPO.git

# Depois fazer o push
git push -u origin main
```

## 4. Autenticação no GitHub

- **HTTPS:** ao dar `git push`, o GitHub pode pedir usuário e senha. Use um **Personal Access Token** como senha (não use a senha da conta).
- **SSH:** se tiver chave SSH configurada, use a URL SSH:
  ```powershell
  git remote add origin git@github.com:SEU-USUARIO/sara-sede-alagoas.git
  ```

## 5. O que NÃO vai para o GitHub (já no .gitignore)

- `node_modules/`
- `.next/`
- `.env` e `.env.local`
- `dist/`
- arquivos de log e cache

## 6. Próximos commits

Depois do primeiro push:

```powershell
git add .
git commit -m "Descrição da alteração"
git push
```

---

**Substitua `SEU-USUARIO`** pelo seu usuário do GitHub em todas as URLs.
