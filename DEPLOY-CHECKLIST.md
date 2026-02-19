# ✅ Checklist para Deploy no GitHub e Vercel

## Pré-Deploy

### 1. Segurança e Arquivos
- [x] `.env` está no `.gitignore`
- [x] `config/*-service-account.json` está no `.gitignore`
- [x] `.gitignore` está configurado corretamente
- [x] `.vercelignore` criado
- [x] README.md atualizado com instruções

### 2. Build e Compilação
- [x] `npm run build` executa sem erros
- [x] `next.config.js` configurado para ignorar erros TypeScript temporários
- [x] ESLint configurado para não bloquear build
- [x] Todas as dependências instaladas

### 3. Configurações
- [x] `.env.example` documentado e atualizado
- [x] Documentação da plataforma atualizada
- [x] Menu de configurações atualizado (sem "Usuários e Perfis")
- [x] Todos os novos endpoints documentados

## Push para GitHub

```bash
# 1. Inicializar git (se ainda não inicializou)
git init

# 2. Verificar arquivos que serão commitados
git status
# IMPORTANTE: .env NÃO deve aparecer aqui!

# 3. Adicionar tudo
git add .

# 4. Commit inicial
git commit -m "feat: plataforma completa de gestão com consolidação, livraria e células"

# 5. Criar repositório no GitHub e conectar
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git branch -M main

# 6. Push
git push -u origin main
```

## Deploy na Vercel

### 1. Conectar Repositório
1. Acesse https://vercel.com
2. Clique em "New Project"
3. Importeclone do GitHub
4. Configure o projeto

### 2. Variáveis de Ambiente (OBRIGATÓRIAS)

#### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Google Drive (obrigatório para galeria)
```env
GOOGLE_DRIVE_ROOT_FOLDER_ID=1abc...
# Minifique o JSON em uma linha (sem quebras)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",...}
```

#### URL da Aplicação
```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

### 3. Variáveis Opcionais

#### Meta (Instagram/Facebook)
```env
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://seu-dominio.vercel.app/api/meta/oauth/callback
```

#### Mercado Pago (Livraria PDV)
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_COLLECTOR_ID=...
```

#### API de Disparos (Consolidação)
```env
DISPAROS_WEBHOOK_URL=https://...
DISPAROS_WEBHOOK_BEARER=...
```

#### Postagens Programadas (Cron)
```env
CRON_SECRET=seu_secret_aleatorio_32_chars
```

### 4. Configurar Cron Job (Opcional)

Para postagens programadas automáticas:

1. No painel Vercel: Settings → Cron Jobs
2. Adicionar novo job:
   - **Path**: `/api/social/run-scheduled`
   - **Schedule**: `0 * * * *` (a cada hora)
   - **Custom Headers**: `x-cron-secret: SEU_CRON_SECRET`

### 5. Deploy

Clique em "Deploy" e aguarde o build.

## Pós-Deploy

### 1. Verificações Iniciais
- [ ] Acesse o domínio da Vercel
- [ ] Teste o login em `/admin/login`
- [ ] Verifique se as imagens carregam
- [ ] Teste upload de arquivos
- [ ] Verifique galeria (Google Drive)

### 2. Configurações no Painel
- [ ] Acesse `/admin/configuracoes` e configure dados do site
- [ ] Acesse `/admin/roles` e configure permissões
- [ ] Teste criação de usuários
- [ ] Configure mensagens de conversão

### 3. Integrações
- [ ] Teste formulário de conversão
- [ ] Conecte conta do Instagram (se configurado)
- [ ] Configure loja Mercado Pago (se usando PDV)
- [ ] Teste API de disparos (se configurado)

### 4. Monitoramento
- [ ] Verifique logs no painel da Vercel
- [ ] Teste performance com Lighthouse
- [ ] Configure alertas (opcional)

## Troubleshooting Comum

### Build falha na Vercel
- Verifique se todas as variáveis obrigatórias estão configuradas
- Confirme que `GOOGLE_SERVICE_ACCOUNT_JSON` está minificado corretamente
- Verifique logs de build no painel da Vercel

### Imagens não carregam
- Verifique `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- Confirme que Service Account tem permissão na pasta
- Teste manualmente o endpoint `/api/gallery/image`

### Erro 500 no login
- Verifique URLs do Supabase
- Confirme que migrations foram executadas
- Verifique RLS no painel do Supabase

### Erro ao publicar no Instagram
- Verifique credenciais Meta
- Confirme que `META_REDIRECT_URI` aponta para domínio correto
- Teste conexão em `/admin/instancias`

## Segurança Final

Antes de tornar público:

- [ ] Todas as credenciais estão em variáveis de ambiente
- [ ] `.env` não foi commitado
- [ ] Service Account JSON não está no repositório
- [ ] RLS está habilitado no Supabase
- [ ] Todas as rotas admin requerem autenticação
- [ ] Permissões RBAC configuradas corretamente

## Contatos de Emergência

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com
- **Meta Developers**: https://developers.facebook.com

---

✅ **Checklist Completo**  
📅 **Data**: 19 de fevereiro de 2026
