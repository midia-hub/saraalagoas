# Configurar domínio Squarespace para o site no GitHub Pages

Se o seu **domínio está no Squarespace** (registrado ou conectado lá) e você quer que ele mostre o site que está publicado no **GitHub Pages** (este projeto), siga os passos abaixo.

---

## Resumo

1. **No GitHub:** informar o domínio personalizado no repositório (Settings → Pages).
2. **No Squarespace:** criar os registros DNS que apontam o domínio para o GitHub Pages.

O site do repositório está em: **https://midia-hub.github.io/saraalagoas/**

---

## Parte 1 – No GitHub

1. Abra o repositório: **https://github.com/midia-hub/saraalagoas**
2. Vá em **Settings** (Configurações).
3. No menu lateral, em **Code and automation**, clique em **Pages**.
4. Em **Custom domain**, digite seu domínio, por exemplo:
   - `www.seudominio.com` (recomendado), ou
   - `seudominio.com` (domínio apex)
5. Clique em **Save**.
6. (Opcional) Quando aparecer, marque **Enforce HTTPS** para forçar HTTPS.

---

## Parte 2 – No Squarespace (DNS)

O domínio está no Squarespace, então os registros DNS são configurados no painel do Squarespace.

### Onde configurar no Squarespace

- **Domínios** → escolha o domínio → **DNS Settings** (ou **Configurações DNS**).
- Se o domínio estiver “conectado” a um site Squarespace, você pode precisar usar **Conectar domínio de terceiros** ou editar os registros DNS avançados (depende do plano e da interface).

---

### Opção A – Usar **www** (recomendado)

Exemplo: o site abrir em **www.seudominio.com**.

| Tipo  | Host / Nome | Valor / Apontar para   |
|-------|-------------|-------------------------|
| CNAME | `www`       | `midia-hub.github.io`   |

- **Host:** `www` (ou o que o Squarespace pedir para o subdomínio www).
- **Valor:** exatamente `midia-hub.github.io` (sem `https://`, sem `/saraalagoas`).

No GitHub, em **Custom domain**, use: **www.seudominio.com**.

---

### Opção B – Usar domínio apex (**seudominio.com**, sem www)

Exemplo: o site abrir em **seudominio.com**.

Crie **4 registros A** com estes IPs do GitHub Pages (um registro por IP):

| Tipo | Host / Nome | Valor (IP)      |
|------|-------------|-----------------|
| A    | `@`         | `185.199.108.153` |
| A    | `@`         | `185.199.109.153` |
| A    | `@`         | `185.199.110.153` |
| A    | `@`         | `185.199.111.153` |

- No Squarespace, o “Host” para o domínio raiz costuma ser `@` ou ficar em branco.
- Se o Squarespace permitir apenas um valor por registro, crie **4 registros A** com o mesmo Host e um IP diferente em cada um.

No GitHub, em **Custom domain**, use: **seudominio.com**.

---

### Opção C – Apex + www (recomendado para HTTPS)

Para ter **seudominio.com** e **www.seudominio.com** com redirecionamento e HTTPS:

1. **Domínio apex (seudominio.com):** use os **4 registros A** da Opção B.
2. **www:** use o **CNAME** da Opção A: Host `www` → `midia-hub.github.io`.

No GitHub, escolha **um** domínio principal em **Custom domain** (por exemplo **www.seudominio.com**). O GitHub costuma redirecionar o outro (apex ↔ www) quando os dois estiverem configurados no DNS.

---

## Observações importantes

- **CNAME:** sempre apontar para `midia-hub.github.io` (conta/organização), **não** para `midia-hub.github.io/saraalagoas`. O GitHub associa o repositório pelo domínio que você colocou em Settings → Pages.
- **Propagação DNS:** pode levar de alguns minutos até 24–48 horas. Se não funcionar de imediato, espere e teste de novo.
- **HTTPS:** depois que o DNS estiver correto, o GitHub gera o certificado. Só então a opção **Enforce HTTPS** fica estável; pode levar até 24 h.
- **Squarespace:** se a interface for “Conectar domínio de terceiros”, use os mesmos valores (CNAME para www, A para apex). Nomes dos campos podem variar (Host, Name, Target, Valor, Apontar para, etc.).

---

## Conferindo se está correto

- **No GitHub:** em Settings → Pages, o domínio deve aparecer como configurado e, quando estiver ok, como verificado (check verde).
- **No navegador:** após a propagação, abra `https://www.seudominio.com` (ou `https://seudominio.com`) e confira se carrega o site do repositório (Sara Sede Alagoas).

---

## Referências

- [GitHub: Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Squarespace: DNS records for connecting third-party domains](https://support.squarespace.com/hc/en-us/articles/360035485391)
