# Padrões de Mensagens de Reserva de Sala

As mensagens de notificação de reservas de sala são enviadas automaticamente via WhatsApp utilizando a API de disparo de templates já existente no módulo de consolidação. Os templates são fixos e seguem os padrões abaixo:

---

## 📩 1️⃣ RECEBIMENTO DA RESERVA

**Tipo interno:** `reserva_recebida`
**ID do envio:** 589eb419-039e-479b-8def-13c99b63055d

**Variáveis:**
- {{nome}}
- {{sala}}
- {{data}}
- {{hora_inicio}}
- {{hora_fim}}
- {{motivo}}

---

## ✅ 2️⃣ CONFIRMAÇÃO DA RESERVA (APROVADA)

**Tipo interno:** `reserva_aprovada`
**ID do envio:** 6532739c-c972-481f-bdf3-c707dfabe3e5

**Variáveis:**
- {{nome}}
- {{sala}}
- {{data}}
- {{hora_inicio}}
- {{hora_fim}}

---

## ⏳ 3️⃣ PENDENTE DE APROVAÇÃO

**Tipo interno:** `reserva_pendente_aprovacao`
**ID do envio:** ec0fba84-6657-405f-ad19-1c978e254c9c

**Variáveis:**
- {{aprovador_nome}}
- {{solicitante}}
- {{sala}}
- {{data}}
- {{hora_inicio}}
- {{hora_fim}}
- {{motivo}}
- {{quantidade_pessoas}}

---

## ❌ 4️⃣ RESERVA REPROVADA

**Tipo interno:** `reserva_reprovada`
**ID do envio:** 0d9a3be9-a8d4-4eb1-b6f0-c6aa7b37ca93

**Variáveis:**
- {{nome}}
- {{sala}}
- {{data}}
- {{hora_inicio}}
- {{hora_fim}}
- {{motivo_reprovacao}}

---

## 🚫 5️⃣ RESERVA CANCELADA

**Tipo interno:** `reserva_cancelada`
**ID do envio:** d03afd1c-ccd7-4907-a2a3-97353dea71a4

**Variáveis:**
- {{nome}}
- {{sala}}
- {{data}}
- {{hora_inicio}}
- {{hora_fim}}
- {{motivo_cancelamento}}

---

> O envio é realizado automaticamente pelo sistema, não sendo necessário cadastro ou edição manual de templates.
