import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export type PerfilUsuario = 'DIRETOR' | 'LANÇADOR' | 'CADASTRADOR';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useUsuarios = () => {
  const [loading, setLoading] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Autenticar usuário com email e senha
  const autenticar = useCallback(async (email: string, senha: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('ativo', true)
        .single();

      if (error) throw new Error('Usuário não encontrado ou inativo');

      // Validação simples de senha (em produção, usar bcrypt no backend)
      if (data.senha !== senha) {
        throw new Error('Senha incorreta');
      }

      setUsuarioAtual({
        id: data.id,
        nome: data.nome,
        email: data.email,
        perfil: data.perfil,
        ativo: data.ativo,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });

      return { sucesso: true, usuario: data };
    } catch (e: any) {
      console.error('Erro ao autenticar:', e.message);
      return { sucesso: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Listar todos os usuários (apenas DIRETOR pode fazer isso)
  const listarUsuarios = useCallback(async () => {
    if (usuarioAtual?.perfil !== 'DIRETOR') {
      return { sucesso: false, error: 'Apenas DIRETOR pode listar usuários' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      setUsuarios(data || []);
      return { sucesso: true, usuarios: data };
    } catch (e: any) {
      console.error('Erro ao listar usuários:', e.message);
      return { sucesso: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, [usuarioAtual]);

  // Criar novo usuário (apenas DIRETOR)
  const criarUsuario = useCallback(
    async (nome: string, email: string, senha: string, perfil: PerfilUsuario) => {
      if (usuarioAtual?.perfil !== 'DIRETOR') {
        return { sucesso: false, error: 'Apenas DIRETOR pode criar usuários' };
      }

      setLoading(true);
      try {
        // Validar se email já existe
        const { data: existe } = await supabase
          .from('usuarios')
          .select('id')
          .eq('email', email)
          .single();

        if (existe) {
          throw new Error('Email já cadastrado');
        }

        const { data, error } = await supabase
          .from('usuarios')
          .insert([
            {
              nome,
              email,
              senha, // Em produção, fazer hash no backend
              perfil,
              ativo: true,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        await listarUsuarios();
        return { sucesso: true, usuario: data };
      } catch (e: any) {
        console.error('Erro ao criar usuário:', e.message);
        return { sucesso: false, error: e.message };
      } finally {
        setLoading(false);
      }
    },
    [usuarioAtual, listarUsuarios]
  );

  // Atualizar usuário (apenas DIRETOR)
  const atualizarUsuario = useCallback(
    async (id: string, dados: Partial<Usuario>) => {
      if (usuarioAtual?.perfil !== 'DIRETOR') {
        return { sucesso: false, error: 'Apenas DIRETOR pode atualizar usuários' };
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({
            ...dados,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;

        await listarUsuarios();
        return { sucesso: true };
      } catch (e: any) {
        console.error('Erro ao atualizar usuário:', e.message);
        return { sucesso: false, error: e.message };
      } finally {
        setLoading(false);
      }
    },
    [usuarioAtual, listarUsuarios]
  );

  // Desativar usuário (apenas DIRETOR)
  const desativarUsuario = useCallback(
    async (id: string) => {
      if (usuarioAtual?.perfil !== 'DIRETOR') {
        return { sucesso: false, error: 'Apenas DIRETOR pode desativar usuários' };
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        await listarUsuarios();
        return { sucesso: true };
      } catch (e: any) {
        console.error('Erro ao desativar usuário:', e.message);
        return { sucesso: false, error: e.message };
      } finally {
        setLoading(false);
      }
    },
    [usuarioAtual, listarUsuarios]
  );

  // Verificar permissão
  const temPermissao = useCallback(
    (acoes: PerfilUsuario[]) => {
      if (!usuarioAtual) return false;
      return acoes.includes(usuarioAtual.perfil);
    },
    [usuarioAtual]
  );

  // Logout
  const logout = useCallback(() => {
    setUsuarioAtual(null);
  }, []);

  return {
    loading,
    usuarioAtual,
    usuarios,
    autenticar,
    listarUsuarios,
    criarUsuario,
    atualizarUsuario,
    desativarUsuario,
    temPermissao,
    logout,
  };
};
