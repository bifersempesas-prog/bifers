import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUsuarios, PerfilUsuario } from '../../hooks/useUsuarios';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  visivel: boolean;
  onClose: () => void;
}

export default function ModalGerenciarUsuarios({ visivel, onClose }: Props) {
  const { usuarios, loading, criarUsuario, desativarUsuario, listarUsuarios } = useUsuarios();
  const { usuarioAtual } = useAuth();

  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoPerfil, setNovoPerfil] = useState<PerfilUsuario>('LANÇADOR');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    if (visivel) {
      listarUsuarios();
    }
  }, [visivel]);

  const handleCriarUsuario = async () => {
    if (!novoNome || !novoEmail || !novaSenha) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const res = await criarUsuario(novoNome, novoEmail, novaSenha, novoPerfil);
    if (res.sucesso) {
      Alert.alert('Sucesso', 'Usuário criado com sucesso!');
      setNovoNome('');
      setNovoEmail('');
      setNovaSenha('');
      setNovoPerfil('LANÇADOR');
      setMostrarFormulario(false);
    } else {
      Alert.alert('Erro', res.error);
    }
  };

  const handleDesativar = (id: string, nome: string) => {
    Alert.alert(
      'Desativar Usuário',
      `Deseja realmente desativar ${nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            const res = await desativarUsuario(id);
            if (res.sucesso) {
              Alert.alert('Sucesso', 'Usuário desativado');
            }
          },
        },
      ]
    );
  };

  const corPerfil = (perfil: PerfilUsuario) => {
    if (perfil === 'DIRETOR') return '#8e44ad';
    if (perfil === 'LANÇADOR') return '#3498db';
    return '#2ecc71';
  };

  const labelPerfil = (perfil: PerfilUsuario) => {
    if (perfil === 'DIRETOR') return 'Diretor Financeiro';
    if (perfil === 'LANÇADOR') return 'Lançador de Empréstimos';
    return 'Cadastrador';
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gerenciar Usuários</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8e44ad" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {/* Botão Novo Usuário */}
            {usuarioAtual?.perfil === 'DIRETOR' && (
              <TouchableOpacity
                style={styles.btnNovoUsuario}
                onPress={() => setMostrarFormulario(!mostrarFormulario)}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.btnNovoUsuarioText}>
                  {mostrarFormulario ? 'Cancelar' : 'Novo Usuário'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Formulário de Novo Usuário */}
            {mostrarFormulario && (
              <View style={styles.formulario}>
                <Text style={styles.formTitle}>Adicionar Novo Usuário</Text>

                <Text style={styles.label}>Nome Completo:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: João Silva"
                  value={novoNome}
                  onChangeText={setNovoNome}
                />

                <Text style={styles.label}>Email:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: joao@example.com"
                  keyboardType="email-address"
                  value={novoEmail}
                  onChangeText={setNovoEmail}
                />

                <Text style={styles.label}>Senha:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: senha123"
                  secureTextEntry
                  value={novaSenha}
                  onChangeText={setNovaSenha}
                />

                <Text style={styles.label}>Perfil de Acesso:</Text>
                <View style={styles.perfilButtons}>
                  {(['DIRETOR', 'LANÇADOR', 'CADASTRADOR'] as PerfilUsuario[]).map((perfil) => (
                    <TouchableOpacity
                      key={perfil}
                      style={[
                        styles.perfilBtn,
                        novoPerfil === perfil && styles.perfilBtnAtivo,
                        { backgroundColor: novoPerfil === perfil ? corPerfil(perfil) : '#ecf0f1' },
                      ]}
                      onPress={() => setNovoPerfil(perfil)}
                    >
                      <Text
                        style={[
                          styles.perfilBtnText,
                          novoPerfil === perfil && { color: '#fff' },
                        ]}
                      >
                        {labelPerfil(perfil)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.btnCriar} onPress={handleCriarUsuario}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.btnCriarText}>CRIAR USUÁRIO</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Lista de Usuários */}
            <Text style={styles.listTitle}>Usuários Ativos ({usuarios.length})</Text>
            {usuarios.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum usuário cadastrado</Text>
            ) : (
              usuarios.map((user) => (
                <View key={user.id} style={styles.usuarioCard}>
                  <View style={styles.usuarioHeader}>
                    <View style={styles.usuarioAvatar}>
                      <Text style={styles.usuarioAvatarText}>{user.nome[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.usuarioNome}>{user.nome}</Text>
                      <Text style={styles.usuarioEmail}>{user.email}</Text>
                    </View>
                    <View style={[styles.perfilBadge, { backgroundColor: corPerfil(user.perfil as PerfilUsuario) }]}>
                      <Text style={styles.perfilBadgeText}>
                        {user.perfil === 'DIRETOR' ? 'DIR' : user.perfil === 'LANÇADOR' ? 'LAN' : 'CAD'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.usuarioFooter}>
                    <Text style={styles.usuarioInfo}>
                      Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                    {usuarioAtual?.perfil === 'DIRETOR' && user.id !== usuarioAtual.id && (
                      <TouchableOpacity
                        style={styles.btnDesativar}
                        onPress={() => handleDesativar(user.id, user.nome)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#8e44ad',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  content: { flex: 1, padding: 16 },

  btnNovoUsuario: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  btnNovoUsuarioText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  formulario: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#2ecc71',
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 14,
    backgroundColor: '#f8f9fa',
  },

  perfilButtons: { marginBottom: 14 },
  perfilBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  perfilBtnAtivo: { borderColor: '#8e44ad' },
  perfilBtnText: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d', textAlign: 'center' },

  btnCriar: {
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnCriarText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 8 },

  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#95a5a6', marginVertical: 20 },

  usuarioCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  usuarioHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  usuarioAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usuarioAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  usuarioNome: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
  usuarioEmail: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },

  perfilBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  perfilBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  usuarioFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usuarioInfo: { fontSize: 11, color: '#95a5a6' },
  btnDesativar: { padding: 6 },
});
