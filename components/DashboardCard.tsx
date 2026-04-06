import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatarMoeda } from '../utils/formatters';

export default function DashboardCard({ moeda, ativo, lucro, comissao }: any) {
  return (
    <View style={styles.grid}>
      {/* Bloco: Capital Ativo */}
      <View style={[styles.card, { backgroundColor: '#3498db' }]}>
        <Text style={styles.label}>Dinheiro Ativo</Text>
        <Text style={styles.valor}>{formatarMoeda(ativo, moeda)}</Text>
      </View>

      {/* Bloco: Lucro Juros */}
      <View style={[styles.card, { backgroundColor: '#2ecc71' }]}>
        <Text style={styles.label}>Lucro Juros</Text>
        <Text style={styles.valor}>{formatarMoeda(lucro, moeda)}</Text>
      </View>

      {/* Bloco: Comissões Pagas */}
      <View style={[styles.card, { backgroundColor: '#e67e22' }]}>
        <Text style={styles.label}>Comissões</Text>
        <Text style={styles.valor}>{formatarMoeda(comissao, moeda)}</Text>
      </View>

      {/* Bloco: Saldo em Caixa (Opcional) */}
      <View style={[styles.card, { backgroundColor: '#9b59b6' }]}>
        <Text style={styles.label}>Moeda Atual</Text>
        <Text style={styles.valor}>{moeda}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  card: { width: '48%', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 3 },
  label: { color: '#fff', fontSize: 11, opacity: 0.8, fontWeight: 'bold', textTransform: 'uppercase' },
  valor: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 5 }
});