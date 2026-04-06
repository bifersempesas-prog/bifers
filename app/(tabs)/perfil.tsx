import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PerfilScreen() {
  const router = useRouter();

  const handleSair = () => {
    // Redireciona de volta para a tela de charada e bloqueia o app
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle" size={100} color="#3498db" />
        <Text style={styles.name}>Bifers</Text>
        <Text style={styles.role}>Diretor Financeiro</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color="#2ecc71" />
          <Text style={styles.infoText}>Sistema Seguro Ativo</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="cash" size={24} color="#f1c40f" />
          <Text style={styles.infoText}>Câmbio Base: Real / Dólar</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btnSair} onPress={handleSair}>
        <Ionicons name="log-out-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
        <Text style={styles.btnSairText}>TRANCAR APLICATIVO</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  name: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginTop: 10 },
  role: { fontSize: 16, color: '#7f8c8d', marginTop: 5 },
  content: { flex: 1 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2 },
  infoText: { fontSize: 16, color: '#34495e', marginLeft: 15, fontWeight: 'bold' },
  btnSair: { backgroundColor: '#e74c3c', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  btnSairText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});