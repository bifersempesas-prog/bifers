# Teste de Validação — Fluxo de Comissão

## Cenário de Teste

**Objetivo:** Validar que a comissão é registrada **apenas no pagamento** e **não é duplicada**.

### Dados de Teste

- **Cliente:** João Silva
- **Valor Principal:** R$ 1.000,00
- **Taxa de Juros:** 20% (R$ 200,00)
- **Saldo Devedor:** R$ 1.200,00
- **Frequência:** Semanal
- **Quantidade de Parcelas:** 4
- **Valor da Parcela:** R$ 300,00 (1.200 / 4)
- **Comissionado:** Maria (10% de comissão sobre o principal)
- **Comissão Total Acordada:** R$ 100,00 (10% de R$ 1.000)
- **Comissão por Parcela:** R$ 25,00 (100 / 4)

---

## Fluxo Esperado

### 1️⃣ Criar o Empréstimo

**Ação:** Criar novo contrato com os dados acima

**Esperado na Movimentação de Criação:**
- `tipo_acao`: EMPRESTIMO
- `comissao_paga`: **0** ❌ (NÃO DEVE TER COMISSÃO NA CRIAÇÃO)
- `valor_recebido`: 0
- `lucro_registrado`: 0

**Dashboard após criação:**
- Comissões Pagas: R$ 0,00 ✅
- Lucro em Juros: R$ 0,00 ✅
- Capital Ativo: R$ 1.000,00 ✅
- A Receber: R$ 1.200,00 ✅

---

### 2️⃣ Primeiro Pagamento (1ª Parcela Completa)

**Ação:** Registrar pagamento de R$ 300,00 (1 parcela completa)

**Valores Esperados:**
- Valor Pago: R$ 300,00
- Juros Pagos: R$ 50,00 (25% de 200)
- Comissão a Registrar: R$ 25,00 (1 parcela × R$ 25/parcela)

**Esperado na Movimentação:**
- `valor_recebido`: 300
- `valor_juros_pago`: 50
- `comissao_paga`: **25** ✅
- `capital_recuperado`: 250

**Dashboard após pagamento:**
- Comissões Pagas: R$ 25,00 ✅
- Lucro em Juros: R$ 50,00 ✅
- Saldo Devedor do Contrato: R$ 900,00 ✅

---

### 3️⃣ Segundo Pagamento (1ª Parcela Completa)

**Ação:** Registrar pagamento de R$ 300,00 (1 parcela completa)

**Valores Esperados:**
- Valor Pago: R$ 300,00
- Juros Pagos: R$ 50,00
- Comissão a Registrar: R$ 25,00 (1 parcela × R$ 25/parcela)

**Esperado na Movimentação:**
- `comissao_paga`: **25** ✅ (NÃO DEVE DUPLICAR COM O PAGAMENTO ANTERIOR)

**Dashboard após pagamento:**
- Comissões Pagas: R$ 50,00 ✅ (25 + 25)
- Lucro em Juros: R$ 100,00 ✅ (50 + 50)
- Saldo Devedor do Contrato: R$ 600,00 ✅

---

### 4️⃣ Terceiro Pagamento (1ª Parcela Completa)

**Ação:** Registrar pagamento de R$ 300,00

**Esperado na Movimentação:**
- `comissao_paga`: **25** ✅

**Dashboard após pagamento:**
- Comissões Pagas: R$ 75,00 ✅
- Lucro em Juros: R$ 150,00 ✅
- Saldo Devedor do Contrato: R$ 300,00 ✅

---

### 5️⃣ Quarto Pagamento (Quitação — Última Parcela)

**Ação:** Registrar pagamento de R$ 300,00 (quitação)

**Valores Esperados:**
- Valor Pago: R$ 300,00
- Juros Pagos: R$ 50,00
- Comissão a Registrar: R$ 25,00 (última parcela)

**Esperado na Movimentação:**
- `comissao_paga`: **25** ✅ (NÃO DEVE PEGAR O RESTANTE INTEIRO)

**Dashboard após quitação:**
- Comissões Pagas: R$ 100,00 ✅ (25 + 25 + 25 + 25 = total acordado)
- Lucro em Juros: R$ 200,00 ✅ (50 + 50 + 50 + 50 = total de juros)
- Saldo Devedor do Contrato: R$ 0,00 ✅
- Status do Contrato: **QUITADO** ✅

---

## Validação Final

Após todos os pagamentos:

| Métrica | Esperado | Obtido | Status |
|---------|----------|--------|--------|
| Total Comissões | R$ 100,00 | ? | ❓ |
| Total Juros | R$ 200,00 | ? | ❓ |
| Saldo Devedor | R$ 0,00 | ? | ❓ |
| Status | QUITADO | ? | ❓ |
| Comissão Duplicada? | NÃO | ? | ❓ |

---

## Checklist de Verificação

- [ ] Comissão **não é registrada** na criação do empréstimo
- [ ] Comissão **é registrada apenas no pagamento**
- [ ] Comissão é **proporcional** ao valor pago
- [ ] Comissão **não é duplicada** entre pagamentos
- [ ] Na quitação, comissão **não pega o restante inteiro**
- [ ] Dashboard exibe **valores corretos** de comissões
- [ ] Relatório de Lucros exibe **comissões por parceiro** corretamente
- [ ] PDF exportado mostra **lucro líquido correto** (juros - comissões)

---

## Correções Aplicadas

### ✅ Correção 1: ModalNovoEmprestimo.tsx (linha 148)
Alterado de:
```typescript
comissao_paga: valorTotalComissao,
```
Para:
```typescript
comissao_paga: 0,  // Comissão só é registrada no pagamento
```

### ✅ Correção 2: ModalDetalhesEmprestimo.tsx (linha 140)
Melhorado cálculo de comissão proporcional:
```typescript
const proporcaoPaga = Math.min(valorNum / valorDaParcela, 1);
const comissaoCalculada = comissaoProporcionalPagamento * proporcaoPaga;
```

### ✅ Correção 3: useEmprestimos.ts (linha 101-109)
Adicionada validação de sanidade:
```typescript
// Validação: Comissão não pode ser negativa ou excessivamente alta
if (vComissao < 0) {
  vComissao = 0;
}
// Limita comissão a 50% do valor pago (sanidade check)
if (vComissao > vPago * 0.5) {
  console.warn(`Comissão ajustada de ${vComissao} para ${vPago * 0.5} (limite de 50%)`);
  vComissao = vPago * 0.5;
}
```

---

## Como Testar

1. Crie um novo empréstimo com os dados acima
2. Verifique no banco que a movimentação de EMPRESTIMO tem `comissao_paga = 0`
3. Registre os 4 pagamentos conforme descrito
4. Verifique após cada pagamento que:
   - A comissão foi registrada corretamente
   - O dashboard mostra o total acumulado correto
   - Não há duplicação
5. Abra o relatório de Lucros e valide os totais

---

## Resultado Esperado

✅ **Comissão registrada apenas no pagamento**
✅ **Sem duplicação entre pagamentos**
✅ **Sem comissão extra na quitação**
✅ **Dashboard e Relatório exibem valores corretos**
