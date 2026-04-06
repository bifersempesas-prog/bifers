# Sistema de Usuários e Controle de Acesso (RBAC) — Bifers v3.0

## 📋 Visão Geral

O Bifers agora suporta **múltiplos usuários** com **controle de acesso baseado em papéis (RBAC)**. Cada usuário tem um perfil que determina quais funcionalidades pode acessar.

---

## 👥 Perfis de Usuário

### 1. **DIRETOR** 🔐
O administrador completo do sistema. Tem acesso a todas as funcionalidades.

**Permissões:**
- ✅ Visualizar Dashboard completo
- ✅ Criar, editar e deletar clientes
- ✅ Criar, editar e deletar comissionados
- ✅ Criar, editar e deletar empréstimos
- ✅ Registrar pagamentos
- ✅ Gerar relatórios de lucros e comissões
- ✅ Gerar recibos de pró-labore (todos os tipos)
- ✅ Gerenciar usuários (criar, editar, desativar)
- ✅ Visualizar histórico de movimentações

### 2. **LANÇADOR** 🚀
Responsável por registrar novos empréstimos e pagamentos.

**Permissões:**
- ✅ Visualizar Dashboard (resumido)
- ✅ Visualizar clientes (somente leitura)
- ✅ Criar novos empréstimos
- ✅ Registrar pagamentos
- ✅ Visualizar detalhes de empréstimos
- ❌ Editar/deletar clientes
- ❌ Editar/deletar comissionados
- ❌ Editar/deletar empréstimos
- ❌ Gerenciar usuários
- ❌ Gerar recibos de pró-labore

### 3. **CADASTRADOR** 📝
Responsável apenas por cadastrar clientes e comissionados.

**Permissões:**
- ✅ Visualizar Dashboard (resumido)
- ✅ Criar e editar clientes
- ✅ Criar e editar comissionados
- ✅ Visualizar clientes e comissionados
- ❌ Criar/editar/deletar empréstimos
- ❌ Registrar pagamentos
- ❌ Gerenciar usuários
- ❌ Gerar recibos de pró-labore

---

## 🔐 Estrutura de Dados

### Tabela `usuarios` (Supabase)

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,  -- Em produção, usar bcrypt
  perfil VARCHAR(50) NOT NULL,  -- 'DIRETOR', 'LANÇADOR', 'CADASTRADOR'
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🛠️ Como Usar

### 1. Autenticar um Usuário

```typescript
import { useUsuarios } from './hooks/useUsuarios';

const { autenticar, usuarioAtual } = useUsuarios();

const handleLogin = async () => {
  const res = await autenticar('joao@example.com', 'senha123');
  if (res.sucesso) {
    console.log('Usuário logado:', usuarioAtual);
  }
};
```

### 2. Verificar Permissão

```typescript
const { temPermissao } = useUsuarios();

// Verificar se o usuário é DIRETOR ou LANÇADOR
if (temPermissao(['DIRETOR', 'LANÇADOR'])) {
  // Mostrar botão de novo empréstimo
}
```

### 3. Usar o AuthContext (Recomendado)

```typescript
import { useAuth } from './contexts/AuthContext';

export default function MinhaTelaComponent() {
  const { usuarioAtual, temPermissao, logout } = useAuth();

  return (
    <View>
      <Text>Bem-vindo, {usuarioAtual?.nome}!</Text>
      {temPermissao(['DIRETOR']) && <Text>Você é um Diretor</Text>}
    </View>
  );
}
```

---

## 📱 Telas Modificadas

### Login (`app/login.tsx`)
- **Antes:** Senha simples e única
- **Depois:** Email + Senha com validação de usuário no banco de dados
- Mantém a segurança com a "charada" do conversor USD/BRL

### Perfil (`app/(tabs)/perfil.tsx`)
- Exibe nome e perfil do usuário logado
- Botão de logout
- Informações de acesso

### Dashboard (`app/(tabs)/index.tsx`)
- Cards adaptados conforme o perfil
- LANÇADOR vê menos informações
- CADASTRADOR vê apenas clientes e comissionados

### Caixa (`app/(tabs)/caixa.tsx`)
- Botão de Recibos de Pró-labore (apenas DIRETOR)
- Relatório de lucros (apenas DIRETOR)

---

## 🎯 Fluxo de Implementação

### Fase 1: Criar Usuários no Supabase
1. Abra o painel do Supabase
2. Vá para a tabela `usuarios`
3. Crie os usuários com os perfis desejados

**Exemplo:**
| Nome | Email | Senha | Perfil |
|------|-------|-------|--------|
| João Silva | joao@bifers.com | senha123 | DIRETOR |
| Maria Santos | maria@bifers.com | senha456 | LANÇADOR |
| Pedro Costa | pedro@bifers.com | senha789 | CADASTRADOR |

### Fase 2: Atualizar o Login
- Modificar `app/login.tsx` para usar `useUsuarios` ao invés de senha fixa
- Salvar o usuário logado no contexto `AuthContext`

### Fase 3: Aplicar Permissões nas Telas
- Usar `useAuth()` para verificar permissões
- Ocultar/desabilitar botões conforme o perfil

### Fase 4: Testar
- Logar com cada perfil
- Verificar que as funcionalidades restritas não aparecem

---

## 🔒 Segurança

### ⚠️ Importante
- **Em produção**, as senhas devem ser hasheadas com bcrypt no backend do Supabase
- Usar **Row Level Security (RLS)** para garantir que cada usuário veja apenas seus dados
- Implementar **refresh tokens** para sessões mais longas

### Configuração de RLS (Exemplo)

```sql
-- Apenas o DIRETOR pode gerenciar usuários
CREATE POLICY "Apenas DIRETOR pode ver usuários"
ON usuarios FOR SELECT
USING (auth.uid() = id OR (SELECT perfil FROM usuarios WHERE id = auth.uid()) = 'DIRETOR');
```

---

## 📊 Recibos de Pró-Labore

### Tipos de Recibos

1. **Consolidado** 📋
   - Exibe todas as comissões de todos os parceiros
   - Mostra total acordado, pago e a pagar
   - Ideal para relatório gerencial

2. **Por Comissionado** 👤
   - Recibo individual de cada parceiro
   - Mostra quanto foi acordado, quanto já recebeu e quanto falta
   - Ideal para enviar ao parceiro

3. **Lucro do Diretor** 💰
   - Demonstrativo do lucro líquido (juros - comissões)
   - Apenas DIRETOR pode gerar
   - Ideal para controle financeiro

### Como Gerar

1. Abra a tela **Caixa**
2. Clique em **"Recibos de Pró-Labore"** (apenas DIRETOR vê)
3. Selecione o tipo de recibo
4. Escolha o período (data início e fim)
5. Clique em **"GERAR PDF"**
6. Compartilhe ou salve o arquivo

---

## 🚀 Próximos Passos

- [ ] Implementar hash de senhas com bcrypt no backend
- [ ] Adicionar Row Level Security (RLS) no Supabase
- [ ] Criar sistema de auditoria (log de ações por usuário)
- [ ] Adicionar autenticação via OAuth (Google, Microsoft)
- [ ] Implementar 2FA (autenticação de dois fatores)

---

## 📞 Suporte

Se encontrar problemas com o novo sistema de usuários, verifique:
1. Se a tabela `usuarios` existe no Supabase
2. Se o usuário está ativo (`ativo = true`)
3. Se o perfil está correto ('DIRETOR', 'LANÇADOR', 'CADASTRADOR')
4. Se o email e senha estão corretos
