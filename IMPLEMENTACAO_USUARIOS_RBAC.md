# Guia de Implementação — Sistema de Usuários e RBAC

## 📋 O Que Foi Criado

Foram criados os seguintes arquivos para implementar o novo sistema de usuários com controle de acesso:

### Hooks
- **`hooks/useUsuarios.ts`** — Hook para gerenciar autenticação e permissões de usuários

### Contextos
- **`contexts/AuthContext.tsx`** — Contexto global para manter o usuário logado

### Modais
- **`components/modals/ModalGerenciarUsuarios.tsx`** — Modal para o DIRETOR gerenciar usuários
- **`components/modals/ModalReciboProlabore.tsx`** — Modal para gerar recibos de pró-labore (PDF)

### Telas
- **`app/login_novo.tsx`** — Nova tela de login com suporte a múltiplos usuários
- **`app/(tabs)/perfil_novo.tsx`** — Novo perfil com informações de permissões

### Documentação
- **`SISTEMA_USUARIOS_RBAC.md`** — Documentação completa do novo sistema

---

## 🚀 Passos de Implementação

### Passo 1: Criar a Tabela `usuarios` no Supabase

1. Abra o painel do **Supabase** (https://app.supabase.com)
2. Vá para **SQL Editor**
3. Execute o seguinte SQL:

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(50) NOT NULL CHECK (perfil IN ('DIRETOR', 'LANÇADOR', 'CADASTRADOR')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para buscar por email
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- Criar índice para buscar por perfil
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil);
```

### Passo 2: Inserir Usuários de Teste

Execute o seguinte SQL para criar usuários de teste:

```sql
INSERT INTO usuarios (nome, email, senha, perfil, ativo) VALUES
('João Silva', 'joao@bifers.com', 'senha123', 'DIRETOR', true),
('Maria Santos', 'maria@bifers.com', 'senha456', 'LANÇADOR', true),
('Pedro Costa', 'pedro@bifers.com', 'senha789', 'CADASTRADOR', true);
```

### Passo 3: Atualizar o App

#### 3.1 Substituir o Login

Renomeie os arquivos:
```bash
# Backup do login antigo
mv app/login.tsx app/login_antigo.tsx

# Usar o novo login
mv app/login_novo.tsx app/login.tsx
```

#### 3.2 Substituir o Perfil

Renomeie os arquivos:
```bash
# Backup do perfil antigo
mv app/(tabs)/perfil.tsx app/(tabs)/perfil_antigo.tsx

# Usar o novo perfil
mv app/(tabs)/perfil_novo.tsx app/(tabs)/perfil.tsx
```

#### 3.3 Adicionar o AuthProvider no Layout Principal

Abra `app/_layout.tsx` e adicione:

```typescript
import { AuthProvider } from './contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Resto do layout */}
    </AuthProvider>
  );
}
```

### Passo 4: Adicionar Recibos de Pró-Labore na Tela Caixa

Abra `app/(tabs)/caixa.tsx` e adicione o seguinte no início do arquivo:

```typescript
import { useState } from 'react';
import ModalReciboProlabore from '../../components/modals/ModalReciboProlabore';
import { useAuth } from '../../contexts/AuthContext';

// Dentro do componente:
const [modalReciboVisivel, setModalReciboVisivel] = useState(false);
const { usuarioAtual } = useAuth();

// Adicionar botão na UI:
{usuarioAtual?.perfil === 'DIRETOR' && (
  <TouchableOpacity
    style={styles.btnRecibo}
    onPress={() => setModalReciboVisivel(true)}
  >
    <Ionicons name="document-text" size={20} color="#fff" />
    <Text style={styles.btnReciboText}>Recibos de Pró-Labore</Text>
  </TouchableOpacity>
)}

// Adicionar o modal:
<ModalReciboProlabore
  visivel={modalReciboVisivel}
  onClose={() => setModalReciboVisivel(false)}
  usuarioAtual={usuarioAtual}
/>
```

### Passo 5: Aplicar Permissões nas Telas

Exemplo de como usar permissões em uma tela:

```typescript
import { useAuth } from '../../contexts/AuthContext';

export default function MinhaTelaComponent() {
  const { usuarioAtual, temPermissao } = useAuth();

  return (
    <View>
      {/* Mostrar botão apenas para DIRETOR e LANÇADOR */}
      {temPermissao(['DIRETOR', 'LANÇADOR']) && (
        <TouchableOpacity onPress={() => handleNovoEmprestimo()}>
          <Text>Novo Empréstimo</Text>
        </TouchableOpacity>
      )}

      {/* Mostrar botão apenas para DIRETOR e CADASTRADOR */}
      {temPermissao(['DIRETOR', 'CADASTRADOR']) && (
        <TouchableOpacity onPress={() => handleNovoCliente()}>
          <Text>Novo Cliente</Text>
        </TouchableOpacity>
      )}

      {/* Mostrar informação apenas para DIRETOR */}
      {usuarioAtual?.perfil === 'DIRETOR' && (
        <Text>Você tem acesso total ao sistema</Text>
      )}
    </View>
  );
}
```

---

## 🔐 Fluxo de Login

1. **Usuário abre o app**
2. **Vê a tela de "Conversor USD/BRL"** (disfarce de segurança)
3. **Digita "777" no campo "Valor em Dólar"** para desbloquear
4. **Aparece a área secreta com campos de Email e Senha**
5. **Digita suas credenciais** (exemplo: joao@bifers.com / senha123)
6. **Clica em "ENTRAR"**
7. **Sistema valida no Supabase**
8. **Se correto, redireciona para o Dashboard**
9. **Se incorreto, mostra erro e limpa os campos**

---

## 🎯 Permissões por Perfil

### DIRETOR 🔐
- ✅ Tudo

### LANÇADOR 🚀
- ✅ Criar empréstimos
- ✅ Registrar pagamentos
- ❌ Gerenciar usuários
- ❌ Gerar recibos de pró-labore

### CADASTRADOR 📝
- ✅ Cadastrar clientes
- ✅ Cadastrar comissionados
- ❌ Criar empréstimos
- ❌ Gerenciar usuários

---

## 🧪 Testando o Sistema

### Teste 1: Login com DIRETOR
1. Email: `joao@bifers.com`
2. Senha: `senha123`
3. Esperado: Acesso total ao sistema

### Teste 2: Login com LANÇADOR
1. Email: `maria@bifers.com`
2. Senha: `senha456`
3. Esperado: Botão de "Novo Empréstimo" visível, mas "Gerenciar Usuários" não

### Teste 3: Login com CADASTRADOR
1. Email: `pedro@bifers.com`
2. Senha: `senha789`
3. Esperado: Botão de "Novo Cliente" visível, mas "Novo Empréstimo" não

### Teste 4: Gerar Recibo (DIRETOR)
1. Logar como DIRETOR
2. Ir para tela **Caixa**
3. Clicar em **"Recibos de Pró-Labore"**
4. Selecionar tipo (Consolidado, Por Comissionado, Lucro do Diretor)
5. Clicar em **"GERAR PDF"**
6. Esperado: PDF é gerado e compartilhado

---

## ⚠️ Pontos Importantes

### Segurança
- **Em produção**, as senhas devem ser hasheadas com **bcrypt** no backend
- O `VALOR_SECRETO = '777'` é apenas um disfarce básico
- Implementar **Row Level Security (RLS)** no Supabase para segurança real

### Persistência de Sessão
- Atualmente, o usuário é perdido ao fechar o app
- Para manter a sessão, salvar o usuário em `AsyncStorage` ou `SecureStore`

### Backup de Senhas
- Não há sistema de "esqueci a senha" implementado
- O DIRETOR deve gerenciar as senhas dos usuários

---

## 📞 Troubleshooting

### Problema: "Usuário não encontrado ou inativo"
**Solução:** Verifique se:
1. O email está correto (case-sensitive)
2. O usuário está ativo (`ativo = true`)
3. A tabela `usuarios` foi criada no Supabase

### Problema: "Senha incorreta"
**Solução:** Verifique se:
1. A senha está correta (case-sensitive)
2. Não há espaços extras antes/depois da senha

### Problema: Botão de "Recibos" não aparece
**Solução:** Verifique se:
1. Você está logado como DIRETOR
2. O modal foi adicionado corretamente na tela Caixa
3. O usuário tem `perfil = 'DIRETOR'` no banco de dados

---

## 🚀 Próximas Melhorias

- [ ] Implementar hash de senhas com bcrypt
- [ ] Adicionar Row Level Security (RLS)
- [ ] Criar sistema de auditoria (log de ações)
- [ ] Implementar "Esqueci a senha"
- [ ] Adicionar 2FA (autenticação de dois fatores)
- [ ] Salvar sessão em AsyncStorage
- [ ] Integrar com OAuth (Google, Microsoft)

---

## 📚 Referências

- Documentação do Supabase: https://supabase.com/docs
- Documentação do Expo: https://docs.expo.dev
- React Native Docs: https://reactnative.dev/docs/getting-started
