import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarMoeda } from '../../utils/formatters';

export default function ModalPastaCliente({ visivel, pasta, onClose, onNovoEmprestimo, onSelecionarContrato }: any) {
  if (!pasta) return null;

  // Pegamos os dados do cliente de forma segura, seja de um contrato existente ou do cadastro base
  const clienteParaNovo = pasta.clienteData || (pasta.contratos[0]?.clientes);

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.clienteNome}>{pasta.nome}</Text>
              <Text style={styles.sub}>Gerenciamento de Pasta</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="#95a5a6" />
            </TouchableOpacity>
          </View>

          {/* BOTÃO DE NOVO EMPRÉSTIMO: Agora funciona mesmo com a pasta vazia */}
          <TouchableOpacity 
            style={styles.btnNovo} 
            onPress={() => onNovoEmprestimo(clienteParaNovo)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.btnNovoText}>NOVO EMPRÉSTIMO PARA ESTE CLIENTE</Text>
          </TouchableOpacity>

          <Text style={styles.tituloLista}>Histórico de Contratos:</Text>

          <FlatList
            data={pasta.contratos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contratoCard} onPress={() => onSelecionarContrato(item)}>
                <View>
                  <Text style={styles.data}>Início: {new Date(item.data_emprestimo).toLocaleDateString()}</Text>
                  <View style={styles.badgeStatus}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.valor}>{formatarMoeda(item.saldo_devedor, item.moeda)}</Text>
                  <Text style={styles.detalhes}>Ver detalhes</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={40} color="#bdc3c7" />
                <Text style={styles.emptyText}>Nenhum empréstimo registrado para este cliente.</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  content: { 
    backgroundColor: '#f8f9fa', 
    borderTopLeftRadius: 25, 
    borderTopRightRadius: 25, 
    height: '80%', 
    padding: 20 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  clienteNome: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  sub: { color: '#7f8c8d', fontSize: 14 },
  tituloLista: { fontSize: 16, fontWeight: 'bold', color: '#34495e', marginBottom: 15, marginTop: 5 },
  btnNovo: { 
    backgroundColor: '#2ecc71', 
    padding: 15, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    elevation: 3 
  },
  btnNovoText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  contratoCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10, 
    borderLeftWidth: 5, 
    borderLeftColor: '#3498db',
    elevation: 1
  },
  data: { fontSize: 13, fontWeight: 'bold', color: '#34495e' },
  badgeStatus: { 
    backgroundColor: '#ebf5fb', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 5, 
    marginTop: 5,
    alignSelf: 'flex-start'
  },
  statusText: { fontSize: 10, color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase' },
  valor: { fontSize: 16, fontWeight: 'bold', color: '#e74c3c' },
  detalhes: { fontSize: 10, color: '#bdc3c7', marginTop: 2 },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40,
    opacity: 0.6
  },
  emptyText: { 
    color: '#7f8c8d', 
    textAlign: 'center', 
    marginTop: 10,
    fontSize: 14 
  }
});