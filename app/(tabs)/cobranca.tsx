import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEmprestimos } from '../../hooks/useEmprestimos';
import { formatarMoeda } from '../../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';

// IMPORTAÇÃO DO MODAL CORRIGIDA AQUI NA LINHA 10!
import ModalDetalhesEmprestimo from '../../components/modals/ModalDetalhesEmprestimo';

export default function CobrancaScreen() {
  const { contratos, carregarDados } = useEmprestimos();

  // Estados para controlar a abertura do modal de detalhes pelo cartão
  const [contratoSelecionado, setContratoSelecionado] = useState<any>(null);
  const [modalVisivel, setModalVisivel] = useState(false);

  useFocusEffect(
    useCallback(() => { 
      carregarDados(); 
    }, [])
  );

  const abrirModal = (contrato: any) => {
    setContratoSelecionado(contrato);
    setModalVisivel(true);
  };

  // =========================================================
  // MOTOR AGRUPADOR DE PARCELAS POR DATA (SECTION LIST)
  // =========================================================
  const agendaAgrupada = useMemo(() => {
    const todasParcelas: any[] = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    contratos.filter(c => c.status === 'ATIVO').forEach(contrato => {
      const qtdTotal = contrato.quantidade_parcelas || 1;
      const vParcela = contrato.valor_parcela || contrato.saldo_devedor;
      
      // Descobre quantas parcelas já foram pagas para não mostrar as antigas
      const valorTotalOriginal = contrato.valor_principal + (contrato.valor_principal * (contrato.taxa_juros / 100));
      const pagoAteAgora = valorTotalOriginal - contrato.saldo_devedor;
      const parcelasPagas = Math.floor(pagoAteAgora / vParcela);

      let dataRef = new Date(contrato.data_emprestimo || contrato.created_at);
      dataRef.setHours(0,0,0,0);

      for (let i = 1; i <= qtdTotal; i++) {
        if (contrato.frequencia === 'DIARIO') {
          let achou = false;
          while (!achou) {
            dataRef.setDate(dataRef.getDate() + 1);
            const diaSemana = dataRef.getDay();
            const dataStr = dataRef.toLocaleDateString('pt-BR');
            const cobraNesteDia = contrato.dias_cobrar ? contrato.dias_cobrar.includes(diaSemana) : true;
            const ehFeriado = contrato.feriados ? contrato.feriados.includes(dataStr) : false;
            if (cobraNesteDia && !ehFeriado) achou = true;
          }
        } else if (contrato.frequencia === 'SEMANAL') {
          dataRef.setDate(dataRef.getDate() + 7);
        } else if (contrato.frequencia === 'QUINZENAL') {
          dataRef.setDate(dataRef.getDate() + 15);
        } else if (contrato.frequencia === 'MENSAL') {
          dataRef.setMonth(dataRef.getMonth() + 1);
        }

        // Se a parcela ainda não foi paga, adiciona na lista
        if (i > parcelasPagas) {
          todasParcelas.push({
            id_parcela: `${contrato.id}-${i}`,
            contratoOriginal: contrato, // Guarda o contrato inteiro para abrir no Modal!
            nome: contrato.clientes?.nome,
            telefone: contrato.clientes?.telefone,
            valorParcela: vParcela,
            saldoDevedor: contrato.saldo_devedor, // Mostra o total da dívida
            dataVencimento: new Date(dataRef),
            numeroParcela: i,
            qtdTotal: qtdTotal,
            frequencia: contrato.frequencia,
            moeda: contrato.moeda
          });
        }
      }
    });

    // 1. Primeiro ordena tudo por data
    todasParcelas.sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());

    // 2. Agrupa por cabeçalho (Atrasados, Hoje, ou a Data Específica)
    const grupos = todasParcelas.reduce((acc, parcela) => {
      const timeDiff = parcela.dataVencimento.getTime() - hoje.getTime();
      let label = parcela.dataVencimento.toLocaleDateString('pt-BR');

      if (timeDiff < 0) label = "⚠️ Atrasados (Anteriores a Hoje)";
      else if (timeDiff === 0) label = `📅 Hoje (${label})`;
      else label = `🗓️ ${label}`;

      if (!acc[label]) acc[label] = [];
      acc[label].push(parcela);
      return acc;
    }, {} as Record<string, any[]>);

    // 3. Converte para o formato exigido pelo SectionList
    const sections = Object.keys(grupos).map(key => ({
      title: key,
      data: grupos[key]
    }));

    // Garante que "Atrasados" e "Hoje" fiquem travados no topo
    sections.sort((a, b) => {
      if (a.title.includes("Atrasados")) return -1;
      if (b.title.includes("Atrasados")) return 1;
      if (a.title.includes("Hoje")) return -1;
      if (b.title.includes("Hoje")) return 1;
      return 0; // Mantém a ordem de data para os futuros
    });

    return sections;
  }, [contratos]);

  const enviarWhatsApp = (telefone: string, nome: string, valor: number, data: Date, parcela: number) => {
    if (!telefone) return Alert.alert('Erro', 'Cliente sem telefone!');
    const dataFormatada = data.toLocaleDateString('pt-BR');
    const msg = `Olá ${nome}, tudo bem? Passando para lembrar da sua parcela nº ${parcela} que vence em ${dataFormatada} no valor de ${formatarMoeda(valor, 'BRL')}.`;
    Linking.openURL(`whatsapp://send?phone=55${telefone.replace(/\D/g, '')}&text=${msg}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda de Cobranças</Text>
        <Text style={styles.subtitle}>Listagem de parcelas agrupadas por data</Text>
      </View>

      <SectionList
        sections={agendaAgrupada}
        keyExtractor={item => item.id_parcela}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, title.includes("Atrasados") && styles.sectionHeaderAtrasado, title.includes("Hoje") && styles.sectionHeaderHoje]}>
            <Text style={[styles.sectionHeaderText, (title.includes("Atrasados") || title.includes("Hoje")) && {color: '#fff'}]}>
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const vencida = item.dataVencimento < hoje;
          
          return (
            // ENVOLVENDO O CARD NUM TOUCHABLE PARA ABRIR O MODAL
            <TouchableOpacity 
              style={[styles.card, vencida && styles.cardVencido]} 
              activeOpacity={0.7} 
              onPress={() => abrirModal(item.contratoOriginal)}
            >
              <View style={styles.info}>
                <View style={styles.row}>
                  <Text style={styles.nome}>{item.nome}</Text>
                  {vencida && <View style={styles.badgeVencido}><Text style={styles.badgeText}>ATRASADO</Text></View>}
                </View>
                
                <Text style={styles.detalhe}>
                  Parcela {item.numeroParcela}/{item.qtdTotal} • {item.frequencia}
                </Text>
                
                <View style={styles.valoresRow}>
                  <View>
                    <Text style={styles.labelMini}>Valor da Parcela:</Text>
                    <Text style={[styles.valorParcela, vencida && {color: '#c0392b'}]}>
                      {formatarMoeda(item.valorParcela, item.moeda)}
                    </Text>
                  </View>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.labelMini}>Dívida Total:</Text>
                    <Text style={styles.valorTotal}>
                      {formatarMoeda(item.saldoDevedor, item.moeda)}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.btnZap, vencida && {backgroundColor: '#e67e22'}]} 
                onPress={(e) => {
                  e.stopPropagation(); // Impede que o clique no zap abra o Modal junto!
                  enviarWhatsApp(item.telefone, item.nome, item.valorParcela, item.dataVencimento, item.numeroParcela);
                }}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhuma parcela pendente encontrada.</Text>}
        contentContainerStyle={{ paddingBottom: 30 }}
      />

      {/* MODAL DE DETALHES CHAMADO AQUI */}
      <ModalDetalhesEmprestimo
        visivel={modalVisivel}
        contrato={contratoSelecionado}
        onClose={() => setModalVisivel(false)}
        onSuccess={() => {
          carregarDados(); // Recarrega a agenda se ele pagar
          setModalVisivel(false);
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  
  // ESTILO DO CABEÇALHO DO GRUPO DE DATAS
  sectionHeader: { backgroundColor: '#ecf0f1', paddingVertical: 8, paddingHorizontal: 15, marginTop: 15, borderRadius: 5, marginHorizontal: 15 },
  sectionHeaderHoje: { backgroundColor: '#2ecc71' },
  sectionHeaderAtrasado: { backgroundColor: '#e74c3c' },
  sectionHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#34495e', textTransform: 'uppercase' },

  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginHorizontal: 15, marginTop: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, borderLeftWidth: 5, borderLeftColor: '#3498db' },
  cardVencido: { borderLeftColor: '#e74c3c', backgroundColor: '#fff5f5' },
  
  info: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  nome: { fontSize: 17, fontWeight: 'bold', color: '#2c3e50', marginRight: 10 },
  detalhe: { fontSize: 12, color: '#95a5a6', marginBottom: 8 },
  
  valoresRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f2f6', paddingTop: 8 },
  labelMini: { fontSize: 10, color: '#7f8c8d', fontWeight: 'bold', textTransform: 'uppercase' },
  valorParcela: { fontSize: 16, fontWeight: 'bold', color: '#2ecc71' },
  valorTotal: { fontSize: 16, fontWeight: 'bold', color: '#e74c3c' },
  
  badgeVencido: { backgroundColor: '#e74c3c', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  btnZap: { backgroundColor: '#2ecc71', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  
  vazio: { textAlign: 'center', marginTop: 60, color: '#bdc3c7', fontSize: 16, fontWeight: '500' }
});