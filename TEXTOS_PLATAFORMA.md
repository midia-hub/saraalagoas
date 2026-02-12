# Textos da plataforma – inventário completo

Documento com todos os textos de interface: páginas, menus, botões, labels, placeholders, mensagens de erro, de sucesso e de solicitação/confirmação. Para cada item: **texto**, **local** (arquivo/componente) e **função**.

---

## 1. Menu e navegação (sidebar admin)

| Texto | Local | Função |
|-------|--------|--------|
| Admin | `app/admin/AdminSidebar.tsx` | Título da área do painel (brand) |
| Sara Sede Alagoas | `app/admin/AdminSidebar.tsx` | Subtítulo da brand |
| Menu | `app/admin/AdminSidebar.tsx` | Título da seção de navegação |
| Início | `app/admin/AdminSidebar.tsx` | Link para dashboard |
| Configurações do site | `app/admin/AdminSidebar.tsx` | Link para configurações |
| Usuários e perfis | `app/admin/AdminSidebar.tsx` | Link para usuários |
| Funções e Permissões | `app/admin/AdminSidebar.tsx` | Link para roles |
| Upload | `app/admin/AdminSidebar.tsx` | Link para upload |
| Galeria | `app/admin/AdminSidebar.tsx` | Link para galeria |
| Instagram | `app/admin/AdminSidebar.tsx` | Título da seção Instagram |
| Painel de publicações | `app/admin/AdminSidebar.tsx` | Link para lista de posts |
| Convites de Colaboração | `app/admin/AdminSidebar.tsx` | Link para colaboração |
| Instâncias (Meta) | `app/admin/AdminSidebar.tsx` | Link para OAuth Meta |
| Perfil: {nome} / Sem perfil | `app/admin/AdminSidebar.tsx` | Exibe nome do perfil logado |
| Minha conta | `app/admin/AdminSidebar.tsx` | Link para página da conta |
| Ver site | `app/admin/AdminSidebar.tsx` | Link para site público |
| Sair | `app/admin/AdminSidebar.tsx` | Botão de logout |
| Menu do admin | `app/admin/AdminSidebar.tsx` | aria-label do header mobile |

---

## 2. Login e acesso

### 2.1 Página de login (`app/admin/login/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Logo oficial Sara Alagoas | `login/page.tsx` (alt da imagem) | Acessibilidade |
| Acesso administrativo | `login/page.tsx` | Título da página |
| Sara Sede Alagoas | `login/page.tsx` | Subtítulo |
| E-mail | `login/page.tsx` | Label do campo e-mail |
| seu@email.com | `login/page.tsx` | Placeholder do e-mail |
| Senha | `login/page.tsx` | Label do campo senha |
| •••••••• | `login/page.tsx` | Placeholder da senha |
| Ocultar / Mostrar | `login/page.tsx` | Botão mostrar/ocultar senha |
| Ocultar senha / Mostrar senha | `login/page.tsx` | aria-label do botão |
| Entrar | `login/page.tsx` | Botão de submit |
| Validando acesso... | `login/page.tsx` | Estado de loading do botão |
| Enviar link de acesso por e-mail | `login/page.tsx` | Botão magic link |
| Voltar ao site | `login/page.tsx` | Link para home pública |
| Não recebeu o e-mail? Verifique o Spam ou entre em contato com um administrador. | `login/page.tsx` | Texto de ajuda |
| Informe o e-mail. | `login/page.tsx` | Erro de validação |
| Informe a senha. | `login/page.tsx` | Erro de validação |
| Serviço temporariamente indisponível. Tente mais tarde ou contate o administrador. | `login/page.tsx` | Erro quando Supabase não está disponível |
| E-mail ou senha incorretos. | `login/page.tsx` | Erro de credenciais inválidas |
| Não foi possível entrar. Tente novamente. | `login/page.tsx` | Erro genérico de login |
| Sessão inválida. Faça login novamente. | `login/page.tsx` | Sem access token |
| Seu perfil não possui acesso ao painel administrativo. | `login/page.tsx` | Admin check negado |
| Não foi possível verificar seu acesso. Tente novamente. | `login/page.tsx` | Falha na verificação de acesso |
| Erro ao definir sessão. Tente novamente. | `login/page.tsx` | Falha ao setar cookie |
| Não foi possível conectar. Verifique sua internet e tente novamente. | `login/page.tsx` | Erro de rede |
| Não foi possível enviar o link. Tente novamente. | `login/page.tsx` | Erro ao enviar OTP |
| Enviamos um link de acesso para seu e-mail. Verifique a caixa de entrada. | `login/page.tsx` | Sucesso magic link |
| Não recebeu? Verifique a pasta **Spam**. | `login/page.tsx` | Dica após envio do link |
| Erro ao enviar link. | `login/page.tsx` | Erro genérico magic link |

### 2.2 Acesso negado (`app/admin/acesso-negado/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Acesso negado | `acesso-negado/page.tsx` | Título |
| Seu perfil não tem permissão para acessar esta página. | `acesso-negado/page.tsx` | Descrição |
| Voltar ao dashboard | `acesso-negado/page.tsx` | Botão principal |
| Trocar usuário | `acesso-negado/page.tsx` | Link para login |

### 2.3 Completar cadastro (`app/admin/completar-cadastro/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Carregando... | `completar-cadastro/page.tsx` | Estado de carregamento |
| Link inválido ou expirado | `completar-cadastro/page.tsx` | Título quando não há sessão |
| Use o link mais recente que enviamos por e-mail ou peça um novo convite. | `completar-cadastro/page.tsx` | Instrução |
| Ir para o login | `completar-cadastro/page.tsx` | Botão |
| Completar cadastro | `completar-cadastro/page.tsx` | Título do formulário |
| Defina seu nome, usuário e senha para acessar o painel. | `completar-cadastro/page.tsx` | Descrição |
| Nome | `completar-cadastro/page.tsx` | Label |
| Seu nome completo | `completar-cadastro/page.tsx` | Placeholder |
| Usuário | `completar-cadastro/page.tsx` | Label |
| Nome de usuário (opcional) | `completar-cadastro/page.tsx` | Placeholder |
| Senha | `completar-cadastro/page.tsx` | Label |
| Mínimo 6 caracteres | `completar-cadastro/page.tsx` | Placeholder |
| Confirmar senha | `completar-cadastro/page.tsx` | Label |
| Repita a senha | `completar-cadastro/page.tsx` | Placeholder |
| Concluir cadastro | `completar-cadastro/page.tsx` | Botão submit |
| Salvando... | `completar-cadastro/page.tsx` | Estado de envio |
| Já tem conta? Fazer login | `completar-cadastro/page.tsx` | Link |
| Informe seu nome. | `completar-cadastro/page.tsx` | Erro de validação |
| Informe a senha. | `completar-cadastro/page.tsx` | Erro de validação |
| A senha deve ter no mínimo 6 caracteres. | `completar-cadastro/page.tsx` | Erro de validação |
| As senhas não coincidem. | `completar-cadastro/page.tsx` | Erro de validação |
| Serviço temporariamente indisponível. Tente mais tarde. | `completar-cadastro/page.tsx` | Erro de serviço |
| Não foi possível salvar. Tente novamente. | `completar-cadastro/page.tsx` | Erro genérico |
| Seu perfil não possui acesso ao painel. Entre em contato com um administrador. | `completar-cadastro/page.tsx` | Sem acesso admin |
| Erro ao definir sessão. Tente novamente. | `completar-cadastro/page.tsx` | Falha cookie |

### 2.4 Guard de página (`app/admin/PageAccessGuard.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Carregando permissões... | `PageAccessGuard.tsx` | Enquanto carrega permissões |
| Redirecionando... | `PageAccessGuard.tsx` | Antes de redirecionar para acesso negado |

---

## 3. Dashboard e configurações

### 3.1 Dashboard (`app/admin/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Painel administrativo | `admin/page.tsx` | Título |
| Escolha uma seção abaixo para começar. | `admin/page.tsx` | Descrição |
| Configurações do site | `admin/page.tsx` | Card: label |
| Editar textos e menu do site | `admin/page.tsx` | Card: descrição |
| Usuários | `admin/page.tsx` | Card: label |
| Convidar e gerenciar acessos | `admin/page.tsx` | Card: descrição |
| Upload Cultos/Eventos | `admin/page.tsx` | Card: label |
| Fluxo em etapas + Google Drive | `admin/page.tsx` | Card: descrição |
| Galerias | `admin/page.tsx` | Card: label |
| Lista e filtros de galerias | `admin/page.tsx` | Card: descrição |
| Instâncias (Meta) | `admin/page.tsx` | Card: label |
| Conectar Facebook/Instagram | `admin/page.tsx` | Card: descrição |
| Publicações Instagram | `admin/page.tsx` | Card: label |
| Acompanhar fila e posts | `admin/page.tsx` | Card: descrição |
| Seu perfil não possui páginas disponíveis neste painel no momento. Se precisar, solicite acesso a um administrador. | `admin/page.tsx` | Estado vazio (sem permissões) |

### 3.2 Configurações do site (`app/admin/AdminSiteConfig.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Carregando configurações... | `AdminSiteConfig.tsx` | Estado de loading |
| Configurações do site | `AdminSiteConfig.tsx` | Título |
| Altere as informações exibidas na página inicial e no menu. Salve ao final. | `AdminSiteConfig.tsx` | Descrição |
| Geral | `AdminSiteConfig.tsx` | Seção |
| Nome do site | `AdminSiteConfig.tsx` | Label |
| Descrição | `AdminSiteConfig.tsx` | Label |
| URL do site | `AdminSiteConfig.tsx` | Label |
| WhatsApp e redes sociais | `AdminSiteConfig.tsx` | Seção |
| Número WhatsApp (com DDI, sem +) | `AdminSiteConfig.tsx` | Label |
| 5582999999999 | `AdminSiteConfig.tsx` | Placeholder |
| Mensagem geral WhatsApp | `AdminSiteConfig.tsx` | Label |
| Instagram (URL) | `AdminSiteConfig.tsx` | Label |
| YouTube (URL) | `AdminSiteConfig.tsx` | Label |
| Menu do site | `AdminSiteConfig.tsx` | Seção |
| Cada item tem um **id** (âncora na página, ex: cultos, celula) e um **label** (texto no menu). | `AdminSiteConfig.tsx` | Instrução |
| id | `AdminSiteConfig.tsx` | Placeholder |
| Label | `AdminSiteConfig.tsx` | Placeholder |
| + Adicionar item | `AdminSiteConfig.tsx` | Botão |
| Remover último | `AdminSiteConfig.tsx` | Botão |
| Endereço | `AdminSiteConfig.tsx` | Seção |
| Endereço completo | `AdminSiteConfig.tsx` | Label |
| Link do mapa (Google Maps) | `AdminSiteConfig.tsx` | Label |
| URL do iframe do mapa (embed) | `AdminSiteConfig.tsx` | Label |
| Cultos | `AdminSiteConfig.tsx` | Seção |
| Nome do culto | `AdminSiteConfig.tsx` | Placeholder |
| Dia | `AdminSiteConfig.tsx` | Placeholder |
| Horário | `AdminSiteConfig.tsx` | Placeholder |
| Tipo (ex: Presencial) | `AdminSiteConfig.tsx` | Placeholder |
| Descrição | `AdminSiteConfig.tsx` | Placeholder |
| Mensagens WhatsApp (oração, célula, imersão) | `AdminSiteConfig.tsx` | Seção |
| Pedido de oração | `AdminSiteConfig.tsx` | Label |
| Célula | `AdminSiteConfig.tsx` | Label |
| Revisão/Imersão | `AdminSiteConfig.tsx` | Label |
| Textos das seções | `AdminSiteConfig.tsx` | Seção |
| Missão (resumo) | `AdminSiteConfig.tsx` | Label |
| Célula - título | `AdminSiteConfig.tsx` | Label |
| Célula - descrição | `AdminSiteConfig.tsx` | Label |
| Kids - título | `AdminSiteConfig.tsx` | Label |
| Kids - descrição | `AdminSiteConfig.tsx` | Label |
| Dízimos e Ofertas - título | `AdminSiteConfig.tsx` | Label |
| Dízimos - URL do link (pix/doação) | `AdminSiteConfig.tsx` | Label |
| https://... | `AdminSiteConfig.tsx` | Placeholder |
| Imersão - título | `AdminSiteConfig.tsx` | Label |
| Imersão - descrição | `AdminSiteConfig.tsx` | Label |
| Configurações salvas. A página inicial será atualizada ao recarregar. | `AdminSiteConfig.tsx` | Mensagem de sucesso |
| Não foi possível salvar. Tente novamente. | `AdminSiteConfig.tsx` | Mensagem de erro |
| Salvando... | `AdminSiteConfig.tsx` | Estado do botão |
| Salvar configurações | `AdminSiteConfig.tsx` | Botão submit |

### 3.3 Minha conta (`app/admin/conta/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Carregando... | `conta/page.tsx` | Loading |
| Minha conta | `conta/page.tsx` | Título |
| Visualize seus dados e altere o e-mail de acesso ao painel. | `conta/page.tsx` | Descrição |
| Dados atuais | `conta/page.tsx` | Seção |
| E-mail | `conta/page.tsx` | Label |
| Nome | `conta/page.tsx` | Label |
| — | `conta/page.tsx` | Valor vazio |
| Alterar e-mail | `conta/page.tsx` | Seção |
| Ao alterar, um e-mail de confirmação será enviado para o novo endereço. O e-mail só será atualizado após clicar no link recebido. | `conta/page.tsx` | Instrução |
| Novo e-mail | `conta/page.tsx` | Label |
| novo@email.com | `conta/page.tsx` | Placeholder |
| Confirmar novo e-mail | `conta/page.tsx` | Label |
| Enviar confirmação para o novo e-mail | `conta/page.tsx` | Botão |
| Enviando... | `conta/page.tsx` | Estado do botão |
| Informe o novo e-mail. | `conta/page.tsx` | Erro |
| Os e-mails não coincidem. | `conta/page.tsx` | Erro |
| O novo e-mail deve ser diferente do atual. | `conta/page.tsx` | Erro |
| Serviço indisponível. Tente mais tarde. | `conta/page.tsx` | Erro |
| Enviamos um e-mail de confirmação para o novo endereço. Abra o link no e-mail para concluir a alteração. | `conta/page.tsx` | Sucesso |
| Erro ao alterar e-mail. Tente novamente. | `conta/page.tsx` | Erro |

---

## 4. Galeria (admin)

### 4.1 Listagem de álbuns (`app/admin/galeria/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Carregando álbuns | `galeria/page.tsx` | Título do loading |
| Buscando capas e fotos... | `galeria/page.tsx` | Subtítulo do loading |
| Álbuns | `galeria/page.tsx` | Título da página |
| Encontre rapidamente um álbum por nome, tipo ou data. | `galeria/page.tsx` | Descrição |
| {n} álbum(s) | `galeria/page.tsx` | Contador |
| Não foi possível carregar os álbuns. Tente novamente. | `galeria/page.tsx` | Erro de carregamento |
| Tentar novamente | `galeria/page.tsx` | Botão em caso de erro |
| Excluir álbum? | `galeria/page.tsx` | Título do modal de exclusão |
| Todas as fotos do álbum serão removidas. Esta ação não pode ser desfeita. | `galeria/page.tsx` | Descrição do modal |
| Excluir álbum | `galeria/page.tsx` | Botão confirmar exclusão |
| Excluindo... | `galeria/page.tsx` | Estado do botão |
| Cancelar | `galeria/page.tsx` | Botão cancelar |
| Não foi possível excluir o álbum. Ele pode estar vinculado a publicações. | `galeria/page.tsx` | Toast de erro |

### 4.2 Filtros de álbuns (`app/admin/galeria/_components/AlbumFilters.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Todos | `AlbumFilters.tsx` | Opção período |
| Últimos 7 dias | `AlbumFilters.tsx` | Opção período |
| Últimos 30 dias | `AlbumFilters.tsx` | Opção período |
| Este mês | `AlbumFilters.tsx` | Opção período |
| Mês passado | `AlbumFilters.tsx` | Opção período |
| Recentes | `AlbumFilters.tsx` | Opção ordenação |
| A–Z | `AlbumFilters.tsx` | Opção ordenação |
| Mais fotos | `AlbumFilters.tsx` | Opção ordenação |

### 4.3 Estado vazio da galeria (`app/admin/galeria/_components/AlbumEmptyState.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Nenhum álbum encontrado com esses filtros | `AlbumEmptyState.tsx` | Título |
| Tente alterar a busca, o tipo ou o período. | `AlbumEmptyState.tsx` | Descrição (com filtros) |
| Ainda não há álbuns. Crie um enviando fotos na página de upload. | `AlbumEmptyState.tsx` | Descrição (sem filtros) |
| Limpar filtros | `AlbumEmptyState.tsx` | Botão |
| Fazer upload / Criar álbum | `AlbumEmptyState.tsx` | Link |

### 4.4 Álbum (detalhe) (`app/admin/galeria/[id]/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Carregando álbum | `galeria/[id]/page.tsx` | Título loading |
| Buscando fotos... | `galeria/[id]/page.tsx` | Subtítulo loading |
| Não foi possível carregar o álbum. Tente novamente. | `galeria/[id]/page.tsx` | Erro |
| Álbum não encontrado. | `galeria/[id]/page.tsx` | Erro quando não existe |
| ← Voltar aos álbuns | `galeria/[id]/page.tsx` | Link |
| ← Álbuns | `galeria/[id]/page.tsx` | Link breadcrumb |
| Culto • / Evento • | `galeria/[id]/page.tsx` | Subtítulo (tipo e data) |
| Ver galeria pública | `galeria/[id]/page.tsx` | Botão |
| Fazer postagem | `galeria/[id]/page.tsx` | Botão |
| Excluir álbum | `galeria/[id]/page.tsx` | Botão (title e texto) |
| Nenhuma foto neste álbum ainda. | `galeria/[id]/page.tsx` | Estado vazio |
| Excluir álbum inteiro? | `galeria/[id]/page.tsx` | Título modal |
| Todas as {n} foto(s) serão removidas do álbum. Esta ação não pode ser desfeita. | `galeria/[id]/page.tsx` | Descrição modal |
| Excluindo... | `galeria/[id]/page.tsx` | Estado do botão |
| Excluir imagem do álbum? | `galeria/[id]/page.tsx` | Título modal exclusão de imagem |
| Será removida do álbum e do Drive. Esta ação não pode ser desfeita. | `galeria/[id]/page.tsx` | Descrição modal |
| Excluir | `galeria/[id]/page.tsx` | Botão |
| Excluindo... | `galeria/[id]/page.tsx` | Estado do botão |
| Excluir do álbum | `galeria/[id]/page.tsx` | Botão no lightbox |
| Abrir no Drive | `galeria/[id]/page.tsx` | Link |
| Enviado por {nome} | `galeria/[id]/page.tsx` | Legenda na foto |
| Não foi possível excluir a imagem. | `galeria/[id]/page.tsx` | Toast |
| Não foi possível excluir o álbum. Ele pode estar vinculado a publicações. | `galeria/[id]/page.tsx` | Toast |

---

## 5. Fluxo de postagem (seleção e criação)

### 5.1 Seleção de fotos (`app/admin/galeria/[id]/post/select/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| ← Voltar ao álbum | `post/select/page.tsx` | Link |
| Selecionar fotos | `post/select/page.tsx` | Título |
| {álbum} — escolha as mídias para o post. | `post/select/page.tsx` | Descrição |
| Não foi possível carregar as fotos. Tente novamente. | `post/select/page.tsx` | Erro |
| Selecionadas: **{n}** de {total} | `post/select/page.tsx` (via PhotoPickerToolbar) | Contador |
| Selecionar todas | `PhotoPickerToolbar.tsx` | Botão |
| Limpar | `PhotoPickerToolbar.tsx` | Botão |
| Confirmar fotos | `PhotoPickerToolbar.tsx` | Botão |
| Carregando fotos | `post/select/page.tsx` | Título loading |
| Buscando imagens do álbum... | `post/select/page.tsx` | Subtítulo loading |
| Selecionar foto | `post/select/page.tsx` (lightbox) | Botão |
| ✓ Desmarcar foto | `post/select/page.tsx` (lightbox) | Botão |

### 5.2 Criar post (`app/admin/galeria/[id]/post/create/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| ← Voltar para seleção de fotos | `post/create/page.tsx` | Link |
| Criar post | `post/create/page.tsx` | Título |
| {álbum} — editor de postagem. | `post/create/page.tsx` | Descrição |
| Quando publicar? | `post/create/page.tsx` | Título da seção |
| Publicar agora | `post/create/page.tsx` | Opção de rádio |
| Programar postagem | `post/create/page.tsx` | Opção de rádio |
| No horário programado a postagem será publicada automaticamente (confira no Painel de publicações). | `post/create/page.tsx` | Dica (modo programado) |
| Informe a data e hora para programar a postagem. | `post/create/page.tsx` | Erro de validação |
| A data/hora programada deve ser no futuro. | `post/create/page.tsx` | Erro de validação |
| Motivo da falha na postagem: | `post/create/page.tsx` | Título da lista de falhas |
| Conecte ou reconecte a conta em **Instâncias (Meta)** no menu ao lado para liberar as postagens. | `post/create/page.tsx` | Instrução pós-falha |
| Para publicar no **Facebook**, o app Meta precisa da permissão `pages_manage_posts`... | `post/create/page.tsx` | Dica de permissão Meta |
| Ir para Instâncias (Meta) e conectar | `post/create/page.tsx` | Link/botão |
| Rascunho salvo localmente. | `post/create/page.tsx` | Notice (Concluir mais tarde) |
| Post enviado. Confira no Painel de publicações. / Postagem programada. | `post/create/page.tsx` | Notice de sucesso |
| Não foi possível publicar. Tente novamente. | `post/create/page.tsx` | Erro genérico |
| Selecione uma conta liberada em "Postar em". | `post/create/page.tsx` | Erro de validação |
| Selecione ao menos Instagram ou Facebook como destino. | `post/create/page.tsx` | Erro de validação |
| Para Instagram, o limite é de 10 mídias por post (carrossel). | `post/create/page.tsx` (instagramLimitError) | Erro de limite |
| 🔍 Debug Info (clique para expandir) | `post/create/page.tsx` | Resumo do painel debug (dev) |

### 5.3 PostComposer (`app/admin/galeria/[id]/post/_components/PostComposer.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Postar em | `PostComposer.tsx` | Título da seção |
| Selecione a conta liberada para publicar. | `PostComposer.tsx` | Descrição |
| Nenhuma conta com checklist concluído. Conecte/reconecte em **Instâncias (Meta)** para liberar. | `PostComposer.tsx` | Aviso (sem contas) |
| Conta de destino | `PostComposer.tsx` | Label do select |
| Selecione a conta | `PostComposer.tsx` | Opção vazia do select |
| Onde deseja publicar? | `PostComposer.tsx` | Título dos checkboxes |
| 📷 Instagram | `PostComposer.tsx` | Label checkbox |
| 📘 Facebook | `PostComposer.tsx` | Label checkbox |
| Selecione ao menos uma plataforma | `PostComposer.tsx` | Erro de validação |
| Destino confirmado: **{nome}** • Apenas Instagram / Apenas Facebook / Instagram e Facebook | `PostComposer.tsx` | Resumo |
| Problemas ao publicar? Conecte ou reconecte em Instâncias (Meta). | `PostComposer.tsx` | Dica + link |
| Detalhes do post | `PostComposer.tsx` | Título da seção |
| Personalizar post para o Facebook e o Instagram | `PostComposer.tsx` | Label checkbox |
| Texto | `PostComposer.tsx` | Label textarea |
| Escreva o conteúdo do post... | `PostComposer.tsx` | Placeholder |
| Cancelar | `PostComposer.tsx` | Botão |
| Concluir mais tarde | `PostComposer.tsx` | Botão |
| Publicar | `PostComposer.tsx` | Botão |
| Publicando... | `PostComposer.tsx` | Estado do botão |

### 5.4 MediaManager (`app/admin/galeria/[id]/post/_components/MediaManager.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Mídia | `MediaManager.tsx` | Título |
| Compartilhe fotos e vídeos. Os posts do Instagram não podem ter mais de 10 fotos (carrossel). | `MediaManager.tsx` | Descrição |
| {n} item / itens | `MediaManager.tsx` | Contador |
| 💡 **Dica:** Arraste as imagens para reordená-las. Clique em uma imagem para visualizar em tela cheia. | `MediaManager.tsx` | Dica |
| Adicionar foto ou vídeo | `MediaManager.tsx` | Botão (texto do botão) |

---

## 6. Painel de publicações e Instâncias Meta

### 6.1 Painel de publicações (`app/admin/instagram/posts/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Painel de publicações | `instagram/posts/page.tsx` | Título |
| Valide as publicações enviadas e acompanhe as que já foram feitas nas plataformas. | `instagram/posts/page.tsx` | Descrição |
| Processar fila agora | `instagram/posts/page.tsx` | Botão |
| Processando… | `instagram/posts/page.tsx` | Estado do botão |
| Nova postagem | `instagram/posts/page.tsx` | Link |
| Todas | `instagram/posts/page.tsx` | Aba |
| Na fila | `instagram/posts/page.tsx` | Aba |
| Publicadas | `instagram/posts/page.tsx` | Aba |
| Falhas | `instagram/posts/page.tsx` | Aba |
| Postagens programadas | `instagram/posts/page.tsx` | Título da seção |
| Programada | `instagram/posts/page.tsx` (STATUS_CONFIG.pending) | Badge status |
| Publicando | `instagram/posts/page.tsx` (STATUS_CONFIG.publishing) | Badge status |
| Publicada | `instagram/posts/page.tsx` (STATUS_CONFIG.published) | Badge status |
| Falha | `instagram/posts/page.tsx` (STATUS_CONFIG.failed) | Badge status |
| Na fila | `instagram/posts/page.tsx` (STATUS_CONFIG.queued) | Badge status |
| Carregando publicações... | `instagram/posts/page.tsx` | Loading |
| Nenhuma publicação ainda. | `instagram/posts/page.tsx` | Estado vazio (aba Todas) |
| Nenhuma publicação na fila. | `instagram/posts/page.tsx` | Estado vazio (aba Na fila) |
| Nenhuma publicação concluída. | `instagram/posts/page.tsx` | Estado vazio (aba Publicadas) |
| Nenhuma falha registrada. | `instagram/posts/page.tsx` | Estado vazio (aba Falhas) |
| Criar primeira postagem | `instagram/posts/page.tsx` | Link |
| Ver no Instagram | `instagram/posts/page.tsx` | Link externo |
| Falha na publicação. Tente novamente. | `instagram/posts/page.tsx` | Mensagem no card (status failed) |
| Revise o post e tente publicar novamente pela galeria. | `instagram/posts/page.tsx` | Dica no card failed |
| Galeria | `instagram/posts/page.tsx` | Fallback título da galeria (programadas) |
| Não foi possível processar a fila. Tente novamente. | `instagram/posts/page.tsx` | Erro ao rodar fila |

### 6.2 Instâncias Meta (`app/admin/instancias/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Conectar conta Meta | `instancias/page.tsx` | Botão principal |
| Conectando... | `instancias/page.tsx` | Estado do botão |
| Conectado com sucesso! | `instancias/page.tsx` | Sucesso (query param) |
| {n} contas conectadas. Todas aparecem na lista abaixo. | `instancias/page.tsx` | Sucesso múltiplas contas |
| Conectado! Instagram: @{handles} | `instancias/page.tsx` | Sucesso com handles |
| Não foi possível conectar a conta. Tente novamente. | `instancias/page.tsx` | Erro (query param) |
| O popup foi bloqueado. Permita popups para este site e tente novamente. | `instancias/page.tsx` | Erro popup |
| Não foi possível iniciar a conexão. Verifique as configurações do servidor (Meta) e tente novamente. | `instancias/page.tsx` | Erro ao iniciar OAuth |
| Não foi possível carregar as integrações. Tente novamente. | `instancias/page.tsx` | Erro ao carregar lista |
| Para usar outras páginas da mesma conta, use "Adicionar outra página" na integração abaixo. | `instancias/page.tsx` | Dica |
| Total integrações | `instancias/page.tsx` | Label card |
| Instagram (ativas) | `instancias/page.tsx` | Label card |
| disponíveis para postar | `instancias/page.tsx` | Subtítulo |
| Instagram prontas | `instancias/page.tsx` | Label card |
| com checklist completo | `instancias/page.tsx` | Subtítulo |
| Facebook (ativas) | `instancias/page.tsx` | Label card |
| Na lista / Desvinculadas | `instancias/page.tsx` | Label card |
| Nenhuma integração conectada. Clique em "Conectar conta Meta" para começar. | `instancias/page.tsx` | Estado vazio |
| Pendentes | `instancias/page.tsx` | Título seção |
| Conclua a seleção da página... | `instancias/page.tsx` | Descrição pendentes |
| Selecionar página | `instancias/page.tsx` | Botão |
| Desvincular | `instancias/page.tsx` | Botão |
| Contas Instagram | `instancias/page.tsx` | Título seção |
| Contas do Instagram na lista (vinculadas) para publicar. | `instancias/page.tsx` | Descrição |
| Nenhuma conta Instagram vinculada. | `instancias/page.tsx` | Estado vazio |
| Pronta para postar no Instagram | `instancias/page.tsx` | Badge |
| Pendências para Instagram | `instancias/page.tsx` | Badge |
| Página Facebook: / Usuário Meta: / Atualizado: / Token expira: | `instancias/page.tsx` | Labels de info |
| Checklist Instagram | `instancias/page.tsx` | Título checklist |
| Já ativou essas permissões no app Meta... Clique em **Reconectar permissões**... | `instancias/page.tsx` | Dica scopes |
| Reconectar permissões | `instancias/page.tsx` | Botão |
| Reconectando... | `instancias/page.tsx` | Estado do botão |
| Adicionar outra página | `instancias/page.tsx` | Botão |
| Desativar / Ativar | `instancias/page.tsx` | Botão toggle |
| Contas Facebook (páginas) | `instancias/page.tsx` | Título seção |
| Páginas do Facebook na lista (vinculadas) para publicar. | `instancias/page.tsx` | Descrição |
| Nenhuma página do Facebook vinculada. | `instancias/page.tsx` | Estado vazio |
| Desvincular esta integração? ... Esta ação não pode ser desfeita. | `instancias/page.tsx` | Modal desvincular (título/descrição) |
| Desvincular | `instancias/page.tsx` (modal) | Botão confirmar |
| Cancelar | `instancias/page.tsx` (modal) | Botão |
| Não foi possível atualizar. Tente novamente. | `instancias/page.tsx` | Erro toggle ativo |
| Não foi possível desvincular. Tente novamente. | `instancias/page.tsx` | Erro desvincular |
| Não foi possível revincular. Tente novamente. | `instancias/page.tsx` | Erro revincular |

Scopes (labels): Listagem de páginas, Leitura de engajamento da página, Acesso básico ao Instagram, Publicação de conteúdo no Instagram, Publicar posts na Página do Facebook — em `instancias/page.tsx` (instagramScopeLabels).

---

## 7. Mensagens de erro e respostas das APIs

Mensagens retornadas pelas rotas da API (quando o frontend as exibe ou quando são usadas em lógica).

### 7.1 Auth e admin

| Texto | Local | Função |
|-------|--------|--------|
| Token ausente. | `app/api/auth/admin-check/route.ts` | 400 |
| Acesso negado ao painel. | `app/api/auth/set-admin-cookie/route.ts` | 403 |

### 7.2 Publicação social

| Texto | Local | Função |
|-------|--------|--------|
| albumId é obrigatório. | `app/api/social/publish/route.ts` | 400 |
| Selecione ao menos uma conta em "Postar em". | `app/api/social/publish/route.ts` | 400 |
| Selecione ao menos uma mídia para publicar. | `app/api/social/publish/route.ts` | 400 |
| Selecione ao menos Instagram ou Facebook como destino. | `app/api/social/publish/route.ts` | 400 |
| Nenhuma mídia válida (id de arquivo obrigatório). | `app/api/social/publish/route.ts` | 400 |
| Galeria não encontrada. | `app/api/social/publish/route.ts` | 404 |
| Falha ao programar a postagem. | `app/api/social/publish/route.ts` | 500 (mensagem genérica) |

### 7.3 Galeria

| Texto | Local | Função |
|-------|--------|--------|
| ID obrigatório. | `app/api/gallery/[id]/route.ts` | 400 |
| Galeria não encontrada. | `app/api/gallery/[id]/route.ts`, `files/route.ts` | 404 |
| Álbum não encontrado. | `app/api/gallery/[id]/route.ts` (DELETE) | 404 |
| ID do álbum é obrigatório. | `app/api/gallery/[id]/route.ts` | 400 |
| FormData inválido. | `app/api/gallery/create/route.ts`, `upload/route.ts` | 400 |
| Tipo inválido. | `app/api/gallery/create/route.ts`, `prepare/route.ts` | 400 |
| Data obrigatória. | `app/api/gallery/create/route.ts`, `prepare/route.ts` | 400 |
| Selecione o culto. | `app/api/gallery/create/route.ts`, `prepare/route.ts` | 400 |
| Culto não encontrado. | `app/api/gallery/create/route.ts`, `prepare/route.ts` | 404 |
| Informe o nome do evento. | `app/api/gallery/create/route.ts`, `prepare/route.ts` | 400 |
| Envie ao menos uma imagem. | `app/api/gallery/create/route.ts` | 400 |
| Envie um arquivo. | `app/api/gallery/[id]/upload/route.ts` | 400 |
| Tipo inválido: {nome} | `app/api/gallery/...` | 400 |
| fileId obrigatório | `app/api/gallery/image/route.ts` | 400 |
| ID da galeria e do arquivo são obrigatórios. | `app/api/gallery/[id]/files/[fileId]/route.ts` | 400 |
| Usuário não identificado. | `app/api/gallery/.../upload-from-storage/route.ts` | 401 |
| Informe o path do arquivo no storage. | `app/api/gallery/.../upload-from-storage/route.ts` | 400 |
| Path inválido para este usuário. | `app/api/gallery/.../upload-from-storage/route.ts` | 403 |
| Supabase não configurado. Verifique as variáveis de ambiente. | `app/api/gallery/prepare/route.ts` | 500 |
| Falha ao criar galeria. | `app/api/gallery/create/route.ts`, `prepare/route.ts` | 500 |

### 7.4 Usuários e roles

| Texto | Local | Função |
|-------|--------|--------|
| ID é obrigatório | `app/api/admin/users/[id]/route.ts`, `send-reset-password/route.ts` | 400 |
| Usuário não encontrado | `app/api/admin/users/[id]/route.ts`, `assign-role/route.ts` | 404 |
| Erro ao atualizar usuário | `app/api/admin/users/[id]/route.ts` | 500 |
| role_id é obrigatório | `app/api/admin/users/[id]/assign-role/route.ts` | 400 |
| Role não encontrada | `app/api/admin/roles/[id]/route.ts`, `assign-role/route.ts` | 404 |
| Role está inativa | `app/api/admin/users/[id]/assign-role/route.ts` | 400 |
| Erro ao atribuir role | `app/api/admin/users/[id]/assign-role/route.ts` | 500 |
| ID inválido | `app/api/admin/roles/[id]/route.ts` | 404 |
| Role não encontrada | `app/api/admin/roles/[id]/route.ts` | 404 |
| Erro ao buscar role / atualizar / deletar role | `app/api/admin/roles/[id]/route.ts` | 500 |
| Já existe uma role com esta chave | `app/api/admin/roles/route.ts` | 409 |
| Erro ao criar role | `app/api/admin/roles/route.ts` | 500 |
| Nome do perfil é obrigatório. / Descrição... / Informe ao menos uma permissão... | `app/api/admin/rbac/route.ts` | 400 |
| Perfil não encontrado. / Perfis do sistema não podem ser alterados/excluídos. | `app/api/admin/rbac/route.ts` | 404/400 |
| Usuário ou perfil inválido. | `app/api/admin/rbac/route.ts` | 400 |
| Ação inválida. | `app/api/admin/rbac/route.ts` | 400 |
| Erro interno do servidor | Várias rotas admin | 500 |
| Erro ao buscar permissões / recursos | `app/api/admin/permissions/route.ts`, `resources/route.ts` | 500 |
| Payload inválido. | `app/api/admin/site-config/route.ts` | 400 |
| home_route inválida. | `app/api/admin/settings/route.ts` | 400 |

### 7.5 Meta (OAuth e integrações)

| Texto | Local | Função |
|-------|--------|--------|
| integration_id é obrigatório | `app/api/meta/pages/route.ts` | 400 |
| Integração não encontrada | `app/api/meta/pages/route.ts`, `select-page/route.ts`, `add-page/route.ts` | 404 |
| Página não encontrada | `app/api/meta/select-page/route.ts`, `add-page/route.ts` | 404 |
| Integração sem token de usuário | `app/api/meta/add-page/route.ts` | 400 |
| Página não encontrada ou sem acesso | `app/api/meta/add-page/route.ts` | 404 |
| Envie is_active e/ou show_in_list | `app/api/meta/integrations/[id]/route.ts` | 400 |

---

## 8. Upload, Usuários, Roles e outras páginas

### 8.1 Upload (`app/admin/upload/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Upload de Cultos/Eventos | `upload/page.tsx` | Título |
| Fluxo em 3 etapas: informações, imagens e confirmação. | `upload/page.tsx` | Descrição |
| Tipo | `upload/page.tsx` | Label |
| Culto | `upload/page.tsx` | Opção tipo |
| Evento | `upload/page.tsx` | Opção tipo |
| Qual culto? | `upload/page.tsx` | Label |
| Nome do evento | `upload/page.tsx` | Label |
| Data | `upload/page.tsx` | Label |
| Sugestões (últimos cultos): | `upload/page.tsx` | Texto de ajuda |
| Descrição/observações (opcional) | `upload/page.tsx` | Label |
| Selecione a data. | `upload/page.tsx` | Validação |
| Selecione o culto. | `upload/page.tsx` | Validação |
| Informe o nome do evento. | `upload/page.tsx` | Validação |
| Tipo de arquivo não permitido. Use apenas imagens (PNG, JPEG, WebP ou GIF). | `upload/page.tsx` | Erro |
| Supabase não está configurado... | `upload/page.tsx` | Erro arquivos grandes |
| Sessão necessária para enviar arquivos grandes. Faça login novamente. | `upload/page.tsx` | Erro |
| Não foi possível enviar. Tente novamente. | `upload/page.tsx` | Erro genérico |
| Avançar para upload | `upload/page.tsx` | Botão passo 1 |
| Imagens (sem limite de quantidade) | `upload/page.tsx` | Label passo 2 |
| Até X MB por imagem. PNG, JPEG, WebP ou GIF. | `upload/page.tsx` | Texto de ajuda |
| Remover | `upload/page.tsx` | Botão remover preview |
| Progresso geral | `upload/page.tsx` | Label barra |
| Na fila / Concluído / Falhou | `upload/page.tsx` | Status por arquivo |
| Voltar | `upload/page.tsx` | Botão voltar |
| Iniciar upload / Enviando... | `upload/page.tsx` | Botão enviar |
| Upload concluído! | `upload/page.tsx` | Título sucesso passo 3 |
| A galeria foi criada e as imagens foram enviadas para o Google Drive. | `upload/page.tsx` | Mensagem sucesso |
| Alguns arquivos falharam: | `upload/page.tsx` | Aviso parcial |
| Falha na rede / Cancelado | `upload/page.tsx` | Erro XHR |
| Servidor recusou o tamanho (413)... | `upload/page.tsx` | Erro 413 |

### 8.2 Redefinir senha (`app/redefinir-senha/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Link inválido ou expirado | `redefinir-senha/page.tsx` | Título (sem token) |
| Use o link que enviamos por e-mail para redefinir sua senha. | `redefinir-senha/page.tsx` | Instrução |
| Nova senha | `redefinir-senha/page.tsx` | Label |
| Confirmar senha | `redefinir-senha/page.tsx` | Label |
| Redefinir senha | `redefinir-senha/page.tsx` | Cabeçalho / botão |
| Verificando link... | `redefinir-senha/page.tsx` | Estado loading |
| Link inválido ou expirado | `redefinir-senha/page.tsx` | Título (sem token) |
| Não foi possível redefinir a senha | `redefinir-senha/page.tsx` | Subtítulo (sem token) |
| Solicite um novo e-mail de redefinição no painel admin ou entre em contato com o administrador. | `redefinir-senha/page.tsx` | Instrução |
| Ir para o login | `redefinir-senha/page.tsx` | Link |
| Um passo só | `redefinir-senha/page.tsx` | Título (form) |
| Defina sua nova senha | `redefinir-senha/page.tsx` | Subtítulo (form) |
| Digite e confirme a nova senha abaixo. Use no mínimo 6 caracteres. | `redefinir-senha/page.tsx` | Instrução |
| Definir nova senha | `redefinir-senha/page.tsx` | Botão submit |
| Salvando... | `redefinir-senha/page.tsx` | Estado submit |
| A senha deve ter no mínimo 6 caracteres. | `redefinir-senha/page.tsx` | Erro |
| As senhas não coincidem. | `redefinir-senha/page.tsx` | Erro |
| Serviço indisponível. Tente mais tarde. | `redefinir-senha/page.tsx` | Erro |
| Não foi possível alterar a senha. / Erro ao atualizar a senha. Tente novamente. | `redefinir-senha/page.tsx` | Erro |
| Pronto / Senha alterada | `redefinir-senha/page.tsx` | Título sucesso |
| Sua senha foi atualizada. Redirecionando para o painel... | `redefinir-senha/page.tsx` | Mensagem sucesso |
| Acessar o painel | `redefinir-senha/page.tsx` | Link |
| Sara Sede Alagoas · Igreja Sara Nossa Terra | `redefinir-senha/page.tsx` | Rodapé |

### 8.3 Privacidade (`app/privacidade/page.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Voltar para o início | `privacidade/page.tsx` | Link |
| Política de Privacidade | `privacidade/page.tsx` | Título |
| 1. Introdução | `privacidade/page.tsx` | Seção |
| A Sara Sede Alagoas respeita a privacidade... | `privacidade/page.tsx` | Parágrafo |
| 2. Informações que Coletamos | `privacidade/page.tsx` | Seção |
| 3. Como Usamos suas Informações | `privacidade/page.tsx` | Seção |
| (demais seções e itens de lista conforme o arquivo) | `privacidade/page.tsx` | Conteúdo estático |

### 8.4 Usuários (`app/admin/AdminUsers.tsx`)

| Texto | Local | Função |
|-------|--------|--------|
| Usuários | `AdminUsers.tsx` | Título |
| Convidar por e-mail e defina a função após o primeiro acesso. | `AdminUsers.tsx` | Descrição |
| Convidar usuário | `AdminUsers.tsx` | Título seção |
| E-mail | `AdminUsers.tsx` | Label |
| novo@email.com | `AdminUsers.tsx` | Placeholder |
| Enviar convite / Enviando... | `AdminUsers.tsx` | Botão |
| Informe o e-mail. | `AdminUsers.tsx` | Erro |
| Serviço temporariamente indisponível. Tente mais tarde. | `AdminUsers.tsx` | Erro |
| Sessão expirada. Faça login novamente. | `AdminUsers.tsx` | Erro |
| Não foi possível enviar o convite. Tente novamente. | `AdminUsers.tsx` | Erro |
| Convite enviado! O usuário receberá um e-mail para definir a senha. | `AdminUsers.tsx` | Sucesso |
| Usuários com acesso | `AdminUsers.tsx` | Título seção |
| Carregando usuários... | `AdminUsers.tsx` | Estado loading |
| Não foi possível carregar usuários. Tente novamente. | `AdminUsers.tsx` | Erro |
| Nenhum usuário encontrado. Convide alguém acima. | `AdminUsers.tsx` | Estado vazio |
| Função / Função... | `AdminUsers.tsx` | Label e placeholder select |
| Salvando... | `AdminUsers.tsx` | Estado ao atribuir |
| Função do usuário atualizada. | `AdminUsers.tsx` | Sucesso |
| Não foi possível atualizar a função. Tente novamente. | `AdminUsers.tsx` | Erro |
| Informações atualizadas. | `AdminUsers.tsx` | Sucesso |
| Não foi possível atualizar. Tente novamente. | `AdminUsers.tsx` | Erro |
| E-mail de redefinição de senha enviado. | `AdminUsers.tsx` | Sucesso |
| Não foi possível enviar o e-mail. Tente novamente. | `AdminUsers.tsx` | Erro |
| Usuário excluído. | `AdminUsers.tsx` | Sucesso |
| Não foi possível excluir. O usuário pode ser dono de arquivos no Storage. | `AdminUsers.tsx` | Erro |
| Editar informações | `AdminUsers.tsx` | Title botão |
| Enviar e-mail de redefinição de senha | `AdminUsers.tsx` | Title botão |
| Excluir usuário | `AdminUsers.tsx` | Title botão |

### 8.5 Funções e Permissões (`app/admin/roles/`)

| Texto | Local | Função |
|-------|--------|--------|
| Funções e Permissões | `roles/page.tsx` | Título |
| Gerencie funções e permissões de acesso ao painel. | `roles/page.tsx` | Descrição |
| Nova função | `roles/page.tsx` | Botão |
| Erro ao carregar roles | `roles/page.tsx` | Mensagem erro |
| Erro | `roles/page.tsx` | Título box erro |
| Nome / Descrição / Tipo / Usuários / Status / Ações | `roles/page.tsx` | Cabeçalhos tabela |
| Sistema / Personalizada | `roles/page.tsx` | Badge tipo |
| Ativa / Inativa | `roles/page.tsx` | Badge status |
| Editar | `roles/page.tsx` | Title botão |
| Excluir | `roles/page.tsx` | Title botão |
| Função excluída com sucesso! | `roles/page.tsx` | Toast sucesso |
| Não foi possível excluir a função. | `roles/page.tsx` | Erro |
| (roles/[id]: nome, descrição, permissões por recurso, Salvar, mensagens) | `roles/[id]/page.tsx` | Formulário edição — listar conforme arquivo |

---

## 9. Site público e config

- **Página inicial:** textos vêm de `config/site.ts` (nome, descrição, WhatsApp, endereço, liderança, cultos, missão, célula, kids, ofertas, imersão) e podem ser sobrescritos pelo admin em **Configurações do site** (Supabase `site_config`).
- **Componentes:** `components/Header.tsx`, `Footer.tsx`, `Hero.tsx`, `ServicesSection.tsx`, `CellSection.tsx`, `LeadershipSection.tsx`, `SocialSection.tsx`, `PrayerSection.tsx`, `LocationSection.tsx`, `MissionSection.tsx`, `GallerySection.tsx`, `FloatingWhatsApp.tsx` — cada um usa `siteConfig` ou props para títulos, descrições e botões (ex.: "Pedir oração", "Quero uma célula", "Revisão de Vida").
- **Galeria pública:** `app/galeria/page.tsx`, `app/galeria/[tipo]/[slug]/[date]/page.tsx` — títulos e mensagens como "Galeria", "Galeria não encontrada.".
- **Cultos / Eventos:** `app/cultos/page.tsx`, `app/eventos/page.tsx` — títulos e listagem vêm do `siteConfig.services` e do banco quando aplicável.
- **Metadata:** títulos e descrições para SEO em `metadata` (ex.: `app/privacidade/page.tsx`: "Política de Privacidade - {siteConfig.name}").

Para um inventário completo do site público, percorrer cada componente em `components/` e cada página em `app/` (exceto admin) e extrair todas as strings exibidas, incluindo as de `config/site.ts`.

---

*Documento gerado para referência e futura internacionalização ou revisão de copy. Última atualização: Fevereiro 2026.*
