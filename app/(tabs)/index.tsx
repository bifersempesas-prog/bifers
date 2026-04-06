import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ToggleMoeda from '../../components/ToggleMoeda';
import DashboardCard from '../../components/DashboardCard';
import ModalNovoEmprestimo from '../../components/modals/ModalNovoEmprestimo';
import ModalDetalhesEmprestimo from '../../components/modals/ModalDetalhesEmprestimo';
import ModalPastaCliente from '../../components/modals/ModalPastaCliente'; 
import { useMoeda } from '../../hooks/useMoeda';
import { useEmprestimos } from '../../hooks/useEmprestimos';
import { formatarMoeda } from '../../utils/formatters';

export default function CarteiraScreen() {
  const { moedaGlobal } = useMoeda();
  const { contratos, totais, loading, carregarDados } = useEmprestimos();
  
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalPastaAberto, setModalPastaAberto] = useState(false);
  
  const [contratoSelecionado, setContratoSelecionado] = useState<any>(null);
  const [pastaSelecionada, setPastaSelecionada] = useState<any>(null);
  const [clienteParaNovoEmprestimo, setClienteParaNovoEmprestimo] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, [moedaGlobal, carregarDados]);

  const pastasDeClientes = useMemo(() => {
    const grupos: { [key: string]: any } = {};
    contratos.forEach((c) => {
      const nomeCliente = c.clientes?.nome || 'Indefinido';
      if (!grupos[nomeCliente]) {
        grupos[nomeCliente] = {
          nome: nomeCliente,
          totalDevedor: 0,
          quantidade: 0,
          contratos: [],
          clienteData: c.cliente_id ? { id: c.cliente_id, nome: nomeCliente } : null 
        };
      }
      if (c.status !== 'SEM_CONTRATO') {
        grupos[nomeCliente].totalDevedor += c.saldo_devedor;
        grupos[nomeCliente].quantidade += 1;
        grupos[nomeCliente].contratos.push(c);
      }
    });
    return Object.values(grupos);
  }, [contratos]);

  return (
    <SafeAreaView style={styles.container}>
      <ToggleMoeda />
      <DashboardCard 
        moeda={moedaGlobal} ativo={totais.ativo} lucro={totais.lucro} 
        comissao={totais.comissao} receber={totais.receber} totalEmprestado={totais.emprestado}
      />
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pastas de Clientes ({moedaGlobal})</Text>
        <TouchableOpacity onPress={carregarDados}>
           <Ionicons name="refresh-circle" size={28} color="#3498db" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{marginTop: 40}} />
      ) : (
        <FlatList
          data={pastasDeClientes}
          keyExtractor={(item: any) => item.nome}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.pastaCard}
              onPress={() => {
                setPastaSelecionada(item);
                setModalPastaAberto(true);
              }}
            >
              <View style={styles.iconArea}>
                <Ionicons name="folder" size={42} color="#f1c40f" />
                {item.quantidade > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.quantidade}</Text></View>
                )}
              </View>

              <View style={styles.infoArea}>
                <Text style={styles.nomeCliente}>{item.nome}</Text>
                <Text style={styles.subtitulo}>
                  {item.quantidade > 0 ? (
                    <>Total na rua: <Text style={styles.valorDestaque}>{formatarMoeda(item.totalDevedor, moedaGlobal)}</Text></>
                  ) : (
                    <Text style={{color: '#95a5a6'}}>Toque para gerar empréstimo</Text>
                  )}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={50} color="#bdc3c7" />
              <Text style={styles.emptyText}>Nenhum cliente em {moedaGlobal}.</Text>
            </View>
          }
        />
      )}

      <ModalPastaCliente 
        visivel={modalPastaAberto} pasta={pastaSelecionada}
        onClose={() => setModalPastaAberto(false)}
        onNovoEmprestimo={(cliente: any) => {
          setClienteParaNovoEmprestimo(cliente || pastaSelecionada?.clienteData);
          setModalNovoAberto(true);
        }}
        onSelecionarContrato={(contrato: any) => {
          setContratoSelecionado(contrato);
          setModalDetalhesAberto(true);
        }}
      />

      <ModalNovoEmprestimo 
        visivel={modalNovoAberto} clientePreSelecionado={clienteParaNovoEmprestimo}
        onClose={() => setModalNovoAberto(false)} 
        onSuccess={() => { carregarDados(); setModalPastaAberto(false); }} 
      />
      
      <ModalDetalhesEmprestimo 
        visivel={modalDetalhesAberto} contrato={contratoSelecionado} 
        onClose={() => setModalDetalhesAberto(false)} onSuccess={carregarDados} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8f9fa' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  pastaCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 12, elevation: 3 },
  iconArea: { position: 'relative' },
  badge: { position: 'absolute', right: -2, top: -2, backgroundColor: '#e74c3c', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  infoArea: { flex: 1, marginLeft: 15 },
  nomeCliente: { fontSize: 17, fontWeight: 'bold', color: '#2c3e50' },
  subtitulo: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  valorDestaque: { color: '#e74c3c', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#95a5a6', marginTop: 10, fontSize: 15 }
});