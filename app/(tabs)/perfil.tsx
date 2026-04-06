import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import ModalGerenciarUsuarios from '../../components/modals/ModalGerenciarUsuarios';

export default function PerfilScreen() {
  const router = useRouter();
  const { usuarioAtual, logout } = useAuth();
  const [modalUsuariosVisivel, setModalUsuariosVisivel] = useState(false);

  const handleSair = () => {
    logout();
    router.replace('/login');
  };

  const getCorPerfil = (perfil?: string) => {
    if (perfil === 'DIRETOR') return '#8e44ad';
    if (perfil === 'LANÇADOR') return '#3498db';
    return '#2ecc71';
  };

  const getLabelPerfil = (perfil?: string) => {
    if (perfil === 'DIRETOR') return 'Diretor Financeiro';
    if (perfil === 'LANÇADOR') return 'Lançador de Empréstimos';
    if (perfil === 'CADASTRADOR') return 'Cadastrador';
    return 'Usuário';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { borderColor: getCorPerfil(usuarioAtual?.perfil) }]}>
            <Ionicons name="person" size={60} color={getCorPerfil(usuarioAtual?.perfil)} />
          </View>
          <Text style={styles.name}>{usuarioAtual?.nome || 'Usuário'}</Text>
          <View style={[styles.badge, { backgroundColor: getCorPerfil(usuarioAtual?.perfil) }]}>
            <Text style={styles.badgeText}>{getLabelPerfil(usuarioAtual?.perfil)}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Informações da Conta</Text>
          
          <View style={styles.infoCard}>
            <Ionicons name="mail-outline" size={22} color="#7f8c8d" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email de Acesso</Text>
              <Text style={styles.infoValue}>{usuarioAtual?.email || 'Não informado'}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#2ecc71" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Status da Conta</Text>
              <Text style={styles.infoValue}>Ativa e Protegida</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Configurações e Equipe</Text>

          {usuarioAtual?.perfil === 'DIRETOR' && (
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => setModalUsuariosVisivel(true)}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#8e44ad' }]}>
                <Ionicons name="people" size={20} color="#fff" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Gerenciar Equipe</Text>
                <Text style={styles.menuSubtitle}>Criar e editar permissões de usuários</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#3498db' }]}>
              <Ionicons name="lock-closed" size={20} color="#fff" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Alterar Senha</Text>
              <Text style={styles.menuSubtitle}>Mantenha sua conta segura</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { marginTop: 20 }]} onPress={handleSair}>
            <View style={[styles.menuIcon, { backgroundColor: '#e74c3c' }]}>
              <Ionicons name="log-out" size={20} color="#fff" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: '#e74c3c' }]}>Sair do Aplicativo</Text>
              <Text style={styles.menuSubtitle}>Encerrar sessão atual</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Bifers v3.0.0</Text>
          <Text style={styles.copyright}>© 2026 Administração Financeira</Text>
        </View>
      </ScrollView>

      <ModalGerenciarUsuarios 
        visivel={modalUsuariosVisivel} 
        onClose={() => setModalUsuariosVisivel(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: '#f8f9fa' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  content: { padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase', marginBottom: 15, marginTop: 10 },
  
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  infoTextContainer: { marginLeft: 15 },
  infoLabel: { fontSize: 11, color: '#95a5a6', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#2c3e50', fontWeight: 'bold', marginTop: 2 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 10, elevation: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuTextContainer: { flex: 1, marginLeft: 15 },
  menuTitle: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  menuSubtitle: { fontSize: 12, color: '#95a5a6', marginTop: 2 },
  
  footer: { alignItems: 'center', paddingVertical: 30 },
  version: { fontSize: 12, color: '#bdc3c7', fontWeight: 'bold' },
  copyright: { fontSize: 10, color: '#bdc3c7', marginTop: 4 }
});
