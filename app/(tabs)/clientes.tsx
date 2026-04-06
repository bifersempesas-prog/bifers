import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMoeda } from '../../hooks/useMoeda';
import { useClientes } from '../../hooks/useClientes';
import { supabase } from '../../lib/supabase';
import ModalNovoCliente from '../../components/modals/ModalNovoCliente';
import ModalNovoComissionado from '../../components/modals/ModalNovoComissionado';
import { useAuth } from '../../contexts/AuthContext';

export default function CadastrosScreen() {
  const { moedaGlobal } = useMoeda();
  const { temPermissao } = useAuth();
  // Puxando as funções de exclusão do seu hook atualizado
  const { listarClientes, excluirCliente, excluirComissionado, loading: loadingCli } = useClientes();
  
  const [abaAtiva, setAbaAtiva] = useState<'CLIENTES' | 'PARCEIROS'>('CLIENTES');
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [modalCliente, setModalCliente] = useState(false);
  const [modalParceiro, setModalParceiro] = useState(false);

  // Estado para saber quem estamos editando
  const [itemParaEditar, setItemParaEditar] = useState<any>(null);

  const carregarDados = async () => {
    setLoading(true);
    if (abaAtiva === 'CLIENTES') {
      const res = await listarClientes();
      setLista(res || []);
    } else {
      const { data } = await supabase
        .from('comissionados')
        .select('*')
        .eq('moeda', moedaGlobal)
        .eq('ativo', true);
      setLista(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [moedaGlobal, abaAtiva]);

  // FUNÇÃO DE EXCLUSÃO COM ALERTA
  const confirmarExclusao = (item: any) => {
    Alert.alert(
      "Atenção",
      `Deseja realmente excluir ${item.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: async () => {
            const res = abaAtiva === 'CLIENTES' 
              ? await excluirCliente(item.id) 
              : await excluirComissionado(item.id);

            if (res.sucesso) {
              Alert.alert("Sucesso", "Removido com sucesso!");
              carregarDados();
            } else {
              Alert.alert("Erro", "Não foi possível excluir. Verifique se existem contratos vinculados.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* MENU DE SELEÇÃO */}
      <View style={styles.tabMenu}>
        <TouchableOpacity 
          style={[styles.tabItem, abaAtiva === 'CLIENTES' && styles.tabAtiva]} 
          onPress={() => setAbaAtiva('CLIENTES')}
        >
          <Text style={[styles.tabText, abaAtiva === 'CLIENTES' && styles.tabTextAtiva]}>Clientes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, abaAtiva === 'PARCEIROS' && styles.tabAtiva]} 
          onPress={() => setAbaAtiva('PARCEIROS')}
        >
          <Text style={[styles.tabText, abaAtiva === 'PARCEIROS' && styles.tabTextAtiva]}>Parceiros (Comissão)</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Ionicons 
                name={abaAtiva === 'CLIENTES' ? "person" : "briefcase"} 
                size={24} 
                color="#3498db" 
              />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.sub}>
                  {abaAtiva === 'CLIENTES' ? item.telefone : `Comissão: ${item.valor_padrao}${item.tipo_padrao === 'PERCENTUAL' ? '%' : ' Fixo'}`}
                </Text>
              </View>

              {/* BOTÕES DE AÇÃO (Apenas DIRETOR e CADASTRADOR) */}
              {temPermissao(['DIRETOR', 'CADASTRADOR']) && (
                <View style={styles.containerAcoes}>
                  <TouchableOpacity 
                    style={styles.botaoAcao} 
                    onPress={() => {
                      setItemParaEditar(item);
                      abaAtiva === 'CLIENTES' ? setModalCliente(true) : setModalParceiro(true);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color="#f39c12" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.botaoAcao} 
                    onPress={() => confirmarExclusao(item)}
                  >
                    <Ionicons name="trash" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* BOTÃO FLUTUANTE DINÂMICO (Apenas DIRETOR e CADASTRADOR) */}
      {temPermissao(['DIRETOR', 'CADASTRADOR']) && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => {
            setItemParaEditar(null); // Limpa para indicar que é um NOVO cadastro
            abaAtiva === 'CLIENTES' ? setModalCliente(true) : setModalParceiro(true);
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      <ModalNovoCliente 
        visivel={modalCliente} 
        dadosParaEditar={itemParaEditar} // Passando os dados se for edição
        onClose={() => { setModalCliente(false); setItemParaEditar(null); }} 
        onSuccess={carregarDados} 
      />

      <ModalNovoComissionado 
        visivel={modalParceiro} 
        dadosParaEditar={itemParaEditar} // Passando os dados se for edição
        onClose={() => { setModalParceiro(false); setItemParaEditar(null); }} 
        onSuccess={carregarDados} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabMenu: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, elevation: 2 },
  tabItem: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  tabAtiva: { backgroundColor: '#3498db' },
  tabText: { fontWeight: 'bold', color: '#7f8c8d' },
  tabTextAtiva: { color: '#fff' },
  card: { 
    flexDirection: 'row', 
    padding: 15, 
    backgroundColor: '#fff', 
    marginHorizontal: 15, 
    marginTop: 10, 
    borderRadius: 12, 
    alignItems: 'center', 
    elevation: 2 
  },
  nome: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  sub: { fontSize: 12, color: '#7f8c8d' },
  containerAcoes: { flexDirection: 'row' },
  botaoAcao: { padding: 8, marginLeft: 5 },
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 20, 
    backgroundColor: '#3498db', 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5 
  }
});