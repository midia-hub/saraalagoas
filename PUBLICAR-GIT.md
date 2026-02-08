# Publicar no GitHub com a conta midia-hub

## 1. Conferir a identidade do Git

No terminal (PowerShell), na pasta do projeto:

```powershell
git config --global user.name
git config --global user.email
```

Deve aparecer:
- **user.name:** midia-hub  
- **user.email:** midia@saraalagoas.com  

Se não estiver assim:
```powershell
git config --global user.name "midia-hub"
git config --global user.email "midia@saraalagoas.com"
```

---

## 2. Remover a conta antiga do Windows (só uma vez)

Para o Git parar de usar a conta antiga (edel/marquesedel):

1. **Win + S** → digite **Gerenciador de Credenciais** → Enter  
2. Clique em **Credenciais do Windows**  
3. Procure **github.com** ou **git:https://github.com**  
4. Clique na linha → **Remover**  

Assim, no próximo `git push` o Windows vai pedir login de novo.

---

## 3. Ter um token da conta midia-hub

O GitHub não usa mais senha no terminal; usa **Personal Access Token**.

1. Entre no GitHub com a conta **midia-hub** (ou a que tem permissão no repositório).  
2. Acesse: **https://github.com/settings/tokens**  
3. **Generate new token** → **Generate new token (classic)**  
4. Nome: ex. `notebook-cursor`  
5. Expiração: 90 dias ou No expiration  
6. Marque a permissão **repo**  
7. **Generate token**  
8. **Copie o token** e guarde (ele não aparece de novo).

---

## 4. Conferir o remote

Na pasta do projeto:

```powershell
cd C:\midia_igreja
git remote -v
```

Deve aparecer algo como:
```
origin  https://github.com/midia-hub/saraalagoas.git (fetch)
origin  https://github.com/midia-hub/saraalagoas.git (push)
```

Se o `origin` estiver com outra URL:
```powershell
git remote set-url origin https://github.com/midia-hub/saraalagoas.git
```

---

## 5. Enviar para o GitHub (publicar)

```powershell
cd C:\midia_igreja
git push -u origin main
```

Quando pedir:
- **Username:** midia-hub (ou o usuário da conta que tem acesso ao repositório)  
- **Password:** cole o **token** que você criou (não a senha da conta)  

Se o Windows perguntar se quer salvar as credenciais, pode escolher **Sim** para não precisar digitar de novo.

---

## 6. Próximas publicações (depois do primeiro push)

Quando fizer alterações no projeto:

```powershell
cd C:\midia_igreja
git add .
git status
git commit -m "Descrição do que mudou"
git push
```

Só precisa do token de novo se você tiver removido as credenciais do Windows.

---

## Resumo rápido

| Passo | Comando / Ação |
|-------|----------------|
| 1 | `user.name` = midia-hub, `user.email` = midia@saraalagoas.com |
| 2 | Gerenciador de Credenciais → remover github.com |
| 3 | GitHub (conta midia-hub) → Settings → Tokens → criar token com **repo** |
| 4 | `git remote -v` → deve ser midia-hub/saraalagoas |
| 5 | `git push -u origin main` → usuário: midia-hub, senha: **token** |

Depois disso, o repositório estará publicado em **https://github.com/midia-hub/saraalagoas**.
