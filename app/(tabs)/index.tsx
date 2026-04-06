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
import { useAuth } from '../../contexts/AuthContext';

export default function CarteiraScreen() {
  const { moedaGlobal } = useMoeda();
  const { contratos, totais, loading, carregarDados } = useEmprestimos();
  const { usuarioAtual, temPermissao } = useAuth();

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
          telefone: c.clientes?.telefone || '',
          totalDevedor: 0,
          quantidade: 0,
          temAtivo: false,
          temQuitado: false,
          contratos: [],
          clienteData: c.cliente_id ? { id: c.cliente_id, nome: nomeCliente } : null,
        };
      }
      if (c.status !== 'SEM_CONTRATO') {
        grupos[nomeCliente].totalDevedor += c.saldo_devedor;
        grupos[nomeCliente].quantidade += 1;
        grupos[nomeCliente].contratos.push(c);
        if (c.status === 'ATIVO') grupos[nomeCliente].temAtivo = true;
        if (c.status === 'QUITADO') grupos[nomeCliente].temQuitado = true;
      }
    });
    return Object.values(grupos);
  }, [contratos]);

  // Determina a cor do indicador de status da pasta
  const corPasta = (pasta: any): string => {
    if (pasta.quantidade === 0) return '#bdc3c7';
    if (pasta.temAtivo) return '#3498db';
    if (pasta.temQuitado) return '#2ecc71';
    return '#bdc3c7';
  };

  const labelStatusPasta = (pasta: any): string => {
    if (pasta.quantidade === 0) return 'Sem contratos';
    if (pasta.temAtivo) return `${pasta.quantidade} contrato${pasta.quantidade > 1 ? 's' : ''} ativo${pasta.quantidade > 1 ? 's' : ''}`;
    if (pasta.temQuitado) return 'Tudo quitado';
    return '';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ToggleMoeda />

      {temPermissao(['DIRETOR', 'LANÇADOR']) ? (
        <DashboardCard
          moeda={moedaGlobal}
          ativo={totais.ativo}
          lucro={totais.lucro}
          comissao={totais.comissao}
          receber={totais.receber}
          totalEmprestado={totais.emprestado}
        />
      ) : (
        <View style={[styles.pastaCard, { padding: 20, backgroundColor: '#8e44ad', marginBottom: 20 }]}>
          <Ionicons name="person" size={30} color="#fff" />
          <View style={{ marginLeft: 15 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Olá, {usuarioAtual?.nome}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Perfil: Cadastrador</Text>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Carteira de Clientes</Text>
          <Text style={styles.sectionSubtitle}>{moedaGlobal} · {pastasDeClientes.length} cliente{pastasDeClientes.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={carregarDados} style={styles.btnRefresh}>
          <Ionicons name="refresh" size={20} color="#3498db" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pastasDeClientes}
          keyExtractor={(item: any) => item.nome}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pastaCard}
              onPress={() => {
                setPastaSelecionada(item);
                setModalPastaAberto(true);
              }}
              activeOpacity={0.75}
            >
              {/* Indicador de status colorido */}
              <View style={[styles.statusBar, { backgroundColor: corPasta(item) }]} />

              <View style={styles.iconArea}>
                <Ionicons name="folder" size={40} color="#f1c40f" />
                {item.quantidade > 0 && (
                  <View style={[styles.badge, { backgroundColor: item.temAtivo ? '#3498db' : '#2ecc71' }]}>
                    <Text style={styles.badgeText}>{item.quantidade}</Text>
                  </View>
                )}
              </View>

              <View style={styles.infoArea}>
                <Text style={styles.nomeCliente} numberOfLines={1}>{item.nome}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: corPasta(item) }]} />
                  <Text style={styles.statusLabel}>{labelStatusPasta(item)}</Text>
                </View>
                {item.quantidade > 0 && (
                  <Text style={styles.subtitulo}>
                    Na rua: <Text style={[styles.valorDestaque, { color: item.temAtivo ? '#e74c3c' : '#27ae60' }]}>
                      {formatarMoeda(item.totalDevedor, moedaGlobal)}
                    </Text>
                  </Text>
                )}
                {item.quantidade === 0 && (
                  <Text style={styles.semContrato}>Toque para criar empréstimo</Text>
                )}
              </View>

              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#bdc3c7" />
              <Text style={styles.emptyTitle}>Nenhum cliente em {moedaGlobal}</Text>
              <Text style={styles.emptySubtitle}>Cadastre clientes na aba Cadastros</Text>
            </View>
          }
        />
      )}

      <ModalPastaCliente
        visivel={modalPastaAberto}
        pasta={pastaSelecionada}
        onClose={() => setModalPastaAberto(false)}
        onNovoEmprestimo={(cliente: any) => {
          if (!temPermissao(['DIRETOR', 'LANÇADOR'])) {
            Alert.alert('Acesso Negado', 'Seu perfil não permite lançar empréstimos.');
            return;
          }
          setClienteParaNovoEmprestimo(cliente || pastaSelecionada?.clienteData);
          setModalNovoAberto(true);
        }}
        onSelecionarContrato={(contrato: any) => {
          setContratoSelecionado(contrato);
          setModalDetalhesAberto(true);
        }}
      />

      <ModalNovoEmprestimo
        visivel={modalNovoAberto}
        clientePreSelecionado={clienteParaNovoEmprestimo}
        onClose={() => setModalNovoAberto(false)}
        onSuccess={() => { carregarDados(); setModalPastaAberto(false); }}
      />

      <ModalDetalhesEmprestimo
        visivel={modalDetalhesAberto}
        contrato={contratoSelecionado}
        onClose={() => setModalDetalhesAberto(false)}
        onSuccess={carregarDados}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f6f9' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  sectionSubtitle: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  btnRefresh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eaf4fd',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pastaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
    paddingRight: 14,
    paddingVertical: 14,
  },
  statusBar: {
    width: 5,
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginRight: 12,
  },
  iconArea: {
    position: 'relative',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  infoArea: { flex: 1 },
  nomeCliente: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  statusLabel: { fontSize: 11, color: '#7f8c8d' },
  subtitulo: { fontSize: 12, color: '#7f8c8d' },
  valorDestaque: { fontWeight: 'bold' },
  semContrato: { fontSize: 12, color: '#3498db', fontStyle: 'italic' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: '#7f8c8d', marginTop: 14, fontSize: 16, fontWeight: 'bold' },
  emptySubtitle: { color: '#bdc3c7', marginTop: 6, fontSize: 13 },
});
