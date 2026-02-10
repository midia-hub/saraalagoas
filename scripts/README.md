# Scripts de Setup

## Setup Meta Integration na Vercel

Scripts para facilitar a configuração das variáveis de ambiente Meta na Vercel.

### Windows (PowerShell)

```powershell
.\scripts\setup-vercel-meta.ps1
```

### Linux/Mac (Bash)

```bash
bash scripts/setup-vercel-meta.sh
```

### O que os scripts fazem

1. Verificam se Vercel CLI está instalada
2. Adicionam todas as variáveis Meta para Production
3. Oferecem fazer redeploy automaticamente
4. Mostram instruções para próximos passos

### Pré-requisitos

- Vercel CLI instalada: `npm i -g vercel`
- Login feito: `vercel login`
- Estar no diretório do projeto

### Variáveis Configuradas

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI` (saraalagoas.com)
- `META_SCOPES`
- `META_STATE_SECRET`

### Após executar o script

1. Faça redeploy (se não escolheu automático)
2. Configure OAuth Redirect no Facebook App
3. Teste em: https://saraalagoas.com/admin/instancias

### Documentação Completa

Veja `VERCEL-DEPLOY-META.md` para instruções detalhadas.
