import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarMoeda } from '../../utils/formatters';

export default function PastaCliente({ cliente, moedaExibicao, onAbrirAcao }) {
  const [expandido, setExpandido] = useState(false);

  // Filtra contratos pela moeda ativa no dashboard
  const contratosFiltrados = cliente.contratos?.filter(c => c.moeda === moedaExibicao && c.status === 'ATIVO');

  if (contratosFiltrados?.length === 0 && !expandido) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setExpandido(!expandido)}>
        <Text style={styles.nome}>{cliente.nome}</Text>
        <Ionicons name={expandido ? "chevron-up" : "chevron-down"} size={20} color="#7f8c8d" />
      </TouchableOpacity>

      {expandido && contratosFiltrados.map(contrato => (
        <TouchableOpacity 
          key={contrato.id} 
          style={styles.contratoRow}
          onPress={() => onAbrirAcao(contrato)}
        >
          <View>
            <Text style={styles.data}>Vence: {new Date(contrato.data_vencimento).toLocaleDateString()}</Text>
            <Text style={styles.info}>Juros: {contrato.taxa_juros}% ({contrato.frequencia})</Text>
          </View>
          <Text style={styles.saldo}>{formatarMoeda(contrato.saldo_devedor, moedaExibicao)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', marginBottom: 10, borderRadius: 8, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: '#eee' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
  nome: { fontSize: 16, fontWeight: '600' },
  contratoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#f9f9f9', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  data: { fontSize: 12, color: '#34495e' },
  info: { fontSize: 11, color: '#95a5a6' },
  saldo: { fontWeight: 'bold', color: '#27ae60' }
});