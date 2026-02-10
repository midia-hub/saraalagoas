# Erro "Invalid Scopes" – Como liberar publicação no Instagram

Quando o Facebook retorna **"Invalid Scopes"** (este conteúdo não está disponível), é porque o app ainda **não tem o produto Instagram** configurado ou as permissões não estão habilitadas no painel.

Siga os passos abaixo **no Meta for Developers** e depois **atualize a variável META_SCOPES** na Vercel.

---

## Passo 1: Adicionar o produto "Instagram" no app

1. Acesse **https://developers.facebook.com/apps/**
2. Abra o **app** que você usa (o mesmo do App ID).
3. No menu lateral, clique em **Adicionar outros produtos** (ou **Add more products**).
4. Procure por **Instagram** e clique em **Configurar** (Set up).
5. Escolha **Instagram API with Facebook Login** (não "Instagram Basic Display").
6. Conclua a configuração básica, se pedir.

Sem esse produto, qualquer scope `instagram_*` ou relacionado a páginas para Instagram é considerado inválido.

---

## Passo 2: Usar escopos mínimos primeiro (conectar conta)

Para o login **só conectar** a conta (listar páginas e Instagram), use estes escopos:

```
pages_show_list,pages_read_engagement,instagram_basic
```

- **Vercel** → **Settings** → **Environment Variables** → edite **META_SCOPES** e coloque exatamente:
  ```
  pages_show_list,pages_read_engagement,instagram_basic
  ```
- Salve e faça **Redeploy**.

Teste de novo em **Conectar conta Meta**. A tela de permissões do Facebook deve abrir sem erro de "Invalid Scopes".

---

## Passo 3: Habilitar permissão para publicar (instagram_content_publish)

Para a sua plataforma **publicar posts no Instagram**:

1. No **Meta for Developers**, no seu app, vá em **App Review** (Revisão do app) → **Permissions and Features** (Permissões e recursos).
2. Procure por **instagram_content_publish** (ou "Instagram Content Publish").
3. Clique em **Request** (Solicitar) ou **Request Advanced Access**.
4. Preencha o uso (ex.: "Publicar fotos do site da igreja no Instagram conectado") e envie para revisão, se for pedido.
5. Em **Modo de desenvolvimento**, essa permissão costuma ficar disponível para **administradores e testadores** do app sem revisão. Confirme em **Roles** que seu usuário é Admin ou Testador.

Depois que a permissão estiver aprovada (ou disponível no modo desenvolvimento):

6. Atualize **META_SCOPES** na Vercel para incluir publicação:
   ```
   pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish
   ```
7. Faça **Redeploy** e teste de novo o fluxo "Conectar conta Meta".

---

## Passo 4 (opcional): Mensagens e outras permissões

**Não use** no META_SCOPES (costumam dar Invalid Scopes sem App Review):

- `pages_manage_metadata`
- `instagram_manage_messages`

Se no futuro o app tiver essas permissões aprovadas no Meta, você pode testar adicionando. Até lá, use só os escopos do Passo 2 ou 3.

---

## Resumo dos escopos

| Objetivo              | META_SCOPES (valor na Vercel) |
|-----------------------|-------------------------------|
| Só conectar (mínimo)  | `pages_show_list,pages_read_engagement,instagram_basic` |
| Conectar + publicar   | `pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish` |
| + mensagens (futuro, só se aprovado no app) | adicionar `,instagram_manage_messages` (evite até ter aprovação) |

---

## Checklist rápido

- [ ] Produto **Instagram** (Instagram API with Facebook Login) adicionado ao app.
- [ ] **META_SCOPES** na Vercel com escopos **mínimos** primeiro: `pages_show_list,pages_read_engagement,instagram_basic`.
- [ ] **Redeploy** feito após alterar variáveis.
- [ ] Teste "Conectar conta Meta" sem erro "Invalid Scopes".
- [ ] Depois, em App Review, solicitar **instagram_content_publish** (e outras se precisar).
- [ ] Após aprovação/disponibilidade, atualizar **META_SCOPES** para incluir `instagram_content_publish` e fazer **Redeploy** de novo.

Documentação oficial:  
[Instagram API with Facebook Login - Get Started](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started/)  
[Permissões (Permissions)](https://developers.facebook.com/docs/permissions/reference)
