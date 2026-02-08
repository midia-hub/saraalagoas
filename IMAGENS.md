# Guia de Imagens - Sara Sede Alagoas

Este documento lista todas as imagens necessárias para o site funcionar corretamente.

## 📸 Imagens Obrigatórias

### 1. Logo da Igreja

**Localização**: `public/brand/logo.png`

- **Dimensões recomendadas**: 400x150px
- **Formato**: PNG com fundo transparente
- **Descrição**: Logo oficial da Sara Sede Alagoas
- **Uso**: Header do site (aparece em todas as páginas)

---

### 2. Banner Principal (Hero)

**Localização**: `public/hero.jpg`

- **Dimensões recomendadas**: 1920x1080px
- **Formato**: JPG
- **Descrição**: Imagem principal da primeira seção do site
- **Dicas**: 
  - Use uma foto do culto ou da igreja
  - Boa iluminação
  - Pessoas em adoração (opcional)

---

### 3. Fotos da Liderança

#### Bispo Frank Guimarães

**Localização**: `public/leadership/frank.jpg`

- **Dimensões recomendadas**: 800x800px (quadrada)
- **Formato**: JPG
- **Descrição**: Foto do Bispo Frank
- **Dicas**:
  - Foto profissional ou de boa qualidade
  - Fundo neutro ou desfocado
  - Enquadramento do busto

#### Bispa Betânia Guimarães

**Localização**: `public/leadership/betania.jpg`

- **Dimensões recomendadas**: 800x800px (quadrada)
- **Formato**: JPG
- **Descrição**: Foto da Bispa Betânia
- **Dicas**: Mesmas da foto anterior

---

### 4. Fotos da Revisão/Imersão

**Localização**: `public/revisao/photo-1.jpg` até `photo-6.jpg`

- **Dimensões recomendadas**: 800x800px (quadradas)
- **Formato**: JPG
- **Quantidade**: 6 fotos
- **Descrição**: Fotos de eventos de Revisão/Imersão passados
- **Dicas**:
  - Momentos de oração
  - Pessoas em comunhão
  - Ambiente do evento
  - Momentos de louvor
  - Ministração
  - Confraternização

**Arquivos**:
- `photo-1.jpg`
- `photo-2.jpg`
- `photo-3.jpg`
- `photo-4.jpg`
- `photo-5.jpg`
- `photo-6.jpg`

---

### 5. Fotos do Sara Kids

**Localização**: `public/kids/photo-1.jpg` e `photo-2.jpg`

- **Dimensões recomendadas**: 800x800px (quadradas)
- **Formato**: JPG
- **Quantidade**: 2 fotos
- **Descrição**: Fotos de crianças no ministério infantil
- **Dicas**:
  - Crianças sorrindo e felizes
  - Atividades do ministério
  - Ambiente seguro e colorido
  - **IMPORTANTE**: Ter autorização dos pais

**Arquivos**:
- `photo-1.jpg`
- `photo-2.jpg`

---

### 6. Favicon

**Localização**: `public/favicon.svg`

- **Formato**: SVG (vetorial)
- **Alternativa**: `favicon.ico` ou `favicon.png` (32x32px)
- **Descrição**: Ícone que aparece na aba do navegador
- **Dicas**:
  - Versão simplificada do logo
  - Legível em tamanho pequeno

---

## 🎨 Especificações Técnicas

### Formatos Aceitos

- **JPG/JPEG**: Para fotos (mais leve)
- **PNG**: Para logo e elementos com transparência
- **SVG**: Para favicon e ícones vetoriais
- **WEBP**: Alternativa moderna (opcional)

### Otimização

O Next.js otimiza automaticamente as imagens, mas é recomendado:

- Comprimir imagens antes do upload
- Manter tamanho de arquivo < 500KB por imagem
- Usar ferramentas como TinyPNG ou Squoosh

### Ferramentas de Otimização

- [TinyPNG](https://tinypng.com/) - Comprimir PNG/JPG
- [Squoosh](https://squoosh.app/) - Comprimir e converter
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - Otimizar SVG

---

## 📝 Checklist de Imagens

Marque conforme for adicionando:

- [ ] Logo da igreja (`public/brand/logo.png`)
- [ ] Banner principal (`public/hero.jpg`)
- [ ] Foto Bispo Frank (`public/leadership/frank.jpg`)
- [ ] Foto Bispa Betânia (`public/leadership/betania.jpg`)
- [ ] Revisão foto 1 (`public/revisao/photo-1.jpg`)
- [ ] Revisão foto 2 (`public/revisao/photo-2.jpg`)
- [ ] Revisão foto 3 (`public/revisao/photo-3.jpg`)
- [ ] Revisão foto 4 (`public/revisao/photo-4.jpg`)
- [ ] Revisão foto 5 (`public/revisao/photo-5.jpg`)
- [ ] Revisão foto 6 (`public/revisao/photo-6.jpg`)
- [ ] Kids foto 1 (`public/kids/photo-1.jpg`)
- [ ] Kids foto 2 (`public/kids/photo-2.jpg`)
- [ ] Favicon (`public/favicon.svg` ou `.ico`)

---

## 🚀 Criando Placeholders

Se você ainda não tem as imagens, pode criar placeholders temporários:

### Windows (PowerShell)

```powershell
# Criar estrutura de pastas
New-Item -Path "public\brand" -ItemType Directory -Force
New-Item -Path "public\leadership" -ItemType Directory -Force
New-Item -Path "public\revisao" -ItemType Directory -Force
New-Item -Path "public\kids" -ItemType Directory -Force

# Criar arquivos de placeholder
"[LOGO DA IGREJA]" | Out-File -FilePath "public\brand\logo.png"
"[BANNER PRINCIPAL]" | Out-File -FilePath "public\hero.jpg"
"[FOTO BISPO FRANK]" | Out-File -FilePath "public\leadership\frank.jpg"
"[FOTO BISPA BETÂNIA]" | Out-File -FilePath "public\leadership\betania.jpg"

# Revisão
1..6 | ForEach-Object { "[REVISÃO FOTO $_]" | Out-File -FilePath "public\revisao\photo-$_.jpg" }

# Kids
1..2 | ForEach-Object { "[KIDS FOTO $_]" | Out-File -FilePath "public\kids\photo-$_.jpg" }
```

---

## 💡 Dicas Importantes

1. **Qualidade**: Use fotos de boa qualidade, bem iluminadas
2. **Direitos**: Tenha certeza de ter direito de uso das imagens
3. **Autorização**: Para fotos de pessoas (especialmente crianças), tenha autorização
4. **Consistência**: Mantenha um padrão de cores e estilo nas fotos
5. **Otimização**: Comprima as imagens antes de fazer upload
6. **Backup**: Mantenha cópias originais das imagens

---

## ❓ Problemas Comuns

### Imagem não aparece no site

1. Verifique o nome do arquivo (deve ser exato)
2. Verifique a localização (pasta correta?)
3. Verifique o formato (jpg, png, svg?)
4. Recarregue a página com Ctrl+F5

### Imagem está distorcida

- Use as dimensões recomendadas
- Mantenha proporção quadrada para fotos de pessoas
- Use ferramentas de edição para ajustar

### Imagem está muito pesada

- Comprima usando TinyPNG ou Squoosh
- Reduza dimensões se necessário
- Converta para WebP (opcional)

---

## 📞 Precisa de Ajuda?

Se precisar de ajuda para preparar as imagens, entre em contato com a equipe de comunicação da Sara Sede Alagoas.
