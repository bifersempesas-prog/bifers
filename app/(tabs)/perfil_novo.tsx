import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUsuarios } from '../../hooks/useUsuarios';
import ModalGerenciarUsuarios from '../../components/modals/ModalGerenciarUsuarios';

export default function PerfilScreen() {
  const router = useRouter();
  const { usuarioAtual, logout, loading } = useUsuarios();
  const [modalUsuariosVisivel, setModalUsuariosVisivel] = useState(false);

  const handleSair = () => {
    Alert.alert(
      'Trancar Aplicativo',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login_novo');
          },
        },
      ]
    );
  };

  const corPerfil = (perfil: string) => {
    if (perfil === 'DIRETOR') return '#8e44ad';
    if (perfil === 'LANÇADOR') return '#3498db';
    return '#2ecc71';
  };

  const iconPerfil = (perfil: string) => {
    if (perfil === 'DIRETOR') return 'shield-checkmark';
    if (perfil === 'LANÇADOR') return 'rocket';
    return 'pencil';
  };

  const labelPerfil = (perfil: string) => {
    if (perfil === 'DIRETOR') return 'Diretor Financeiro';
    if (perfil === 'LANÇADOR') return 'Lançador de Empréstimos';
    return 'Cadastrador';
  };

  const descricaoPerfil = (perfil: string) => {
    if (perfil === 'DIRETOR') return 'Acesso total ao sistema';
    if (perfil === 'LANÇADOR') return 'Lançar empréstimos e pagamentos';
    return 'Cadastrar clientes e comissionados';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8e44ad" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com Usuário */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: corPerfil(usuarioAtual?.perfil || 'LANÇADOR') }]}>
            <Text style={styles.avatarText}>
              {usuarioAtual?.nome?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{usuarioAtual?.nome || 'Usuário'}</Text>
          <Text style={styles.email}>{usuarioAtual?.email || 'email@example.com'}</Text>
        </View>

        {/* Card de Perfil */}
        <View style={styles.perfilCard}>
          <View style={styles.perfilHeader}>
            <View style={[styles.perfilIconBox, { backgroundColor: corPerfil(usuarioAtual?.perfil || 'LANÇADOR') }]}>
              <Ionicons
                name={iconPerfil(usuarioAtual?.perfil || 'LANÇADOR')}
                size={28}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.perfilLabel}>{labelPerfil(usuarioAtual?.perfil || 'LANÇADOR')}</Text>
              <Text style={styles.perfilDescricao}>{descricaoPerfil(usuarioAtual?.perfil || 'LANÇADOR')}</Text>
            </View>
          </View>
        </View>

        {/* Informações de Acesso */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color="#2ecc71" />
            <Text style={styles.infoText}>Sistema Seguro Ativo</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash" size={20} color="#f1c40f" />
            <Text style={styles.infoText}>Câmbio Base: Real / Dólar</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#3498db" />
            <Text style={styles.infoText}>
              Membro desde {new Date(usuarioAtual?.created_at || '').toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        {/* Botão Gerenciar Usuários (apenas DIRETOR) */}
        {usuarioAtual?.perfil === 'DIRETOR' && (
          <TouchableOpacity
            style={styles.btnGerenciar}
            onPress={() => setModalUsuariosVisivel(true)}
          >
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.btnGerenciarText}>GERENCIAR USUÁRIOS</Text>
          </TouchableOpacity>
        )}

        {/* Informações de Permissões */}
        <View style={styles.permissionsCard}>
          <Text style={styles.permissionsTitle}>Suas Permissões</Text>

          <View style={styles.permissionItem}>
            <Ionicons
              name={usuarioAtual?.perfil === 'DIRETOR' ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={usuarioAtual?.perfil === 'DIRETOR' ? '#2ecc71' : '#bdc3c7'}
            />
            <Text style={styles.permissionText}>Gerenciar usuários</Text>
          </View>

          <View style={styles.permissionItem}>
            <Ionicons
              name={
                usuarioAtual?.perfil === 'DIRETOR' || usuarioAtual?.perfil === 'CADASTRADOR'
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={18}
              color={
                usuarioAtual?.perfil === 'DIRETOR' || usuarioAtual?.perfil === 'CADASTRADOR'
                  ? '#2ecc71'
                  : '#bdc3c7'
              }
            />
            <Text style={styles.permissionText}>Cadastrar clientes</Text>
          </View>

          <View style={styles.permissionItem}>
            <Ionicons
              name={
                usuarioAtual?.perfil === 'DIRETOR' || usuarioAtual?.perfil === 'LANÇADOR'
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={18}
              color={
                usuarioAtual?.perfil === 'DIRETOR' || usuarioAtual?.perfil === 'LANÇADOR'
                  ? '#2ecc71'
                  : '#bdc3c7'
              }
            />
            <Text style={styles.permissionText}>Lançar empréstimos</Text>
          </View>

          <View style={styles.permissionItem}>
            <Ionicons
              name={usuarioAtual?.perfil === 'DIRETOR' ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={usuarioAtual?.perfil === 'DIRETOR' ? '#2ecc71' : '#bdc3c7'}
            />
            <Text style={styles.permissionText}>Gerar recibos de pró-labore</Text>
          </View>

          <View style={styles.permissionItem}>
            <Ionicons
              name={usuarioAtual?.perfil === 'DIRETOR' ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={usuarioAtual?.perfil === 'DIRETOR' ? '#2ecc71' : '#bdc3c7'}
            />
            <Text style={styles.permissionText}>Visualizar relatórios completos</Text>
          </View>
        </View>
      </ScrollView>

      {/* Botão Sair */}
      <TouchableOpacity style={styles.btnSair} onPress={handleSair}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.btnSairText}>TRANCAR APLICATIVO</Text>
      </TouchableOpacity>

      {/* Modal de Gerenciar Usuários */}
      <ModalGerenciarUsuarios
        visivel={modalUsuariosVisivel}
        onClose={() => setModalUsuariosVisivel(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingBottom: 80 },

  header: { alignItems: 'center', marginTop: 30, marginBottom: 30 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  email: { fontSize: 14, color: '#7f8c8d' },

  perfilCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  perfilHeader: { flexDirection: 'row', alignItems: 'center' },
  perfilIconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilLabel: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  perfilDescricao: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#34495e', marginLeft: 12, fontWeight: '500' },

  btnGerenciar: {
    backgroundColor: '#8e44ad',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
  },
  btnGerenciarText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },

  permissionsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#8e44ad',
  },
  permissionsTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  permissionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  permissionText: { fontSize: 13, color: '#34495e', marginLeft: 10 },

  btnSair: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  btnSairText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
});
