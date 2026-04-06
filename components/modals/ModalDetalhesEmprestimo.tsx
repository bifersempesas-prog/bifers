import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarMoeda } from '../../utils/formatters';
import { useEmprestimos } from '../../hooks/useEmprestimos';

interface Props {
  visivel: boolean;
  contrato: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalDetalhesEmprestimo({ visivel, contrato, onClose, onSuccess }: Props) {
  const { registrarPagamento, deletarContrato, atualizarContrato, loading } = useEmprestimos();
  
  const [valorPagamento, setValorPagamento] = useState('');
  const [valorJuros, setValorJuros] = useState('0'); 
  
  // NOVO: Estado para a data de pagamento manual
  const [dataPgto, setDataPgto] = useState(() => new Date().toLocaleDateString('pt-BR'));

  // =========================================================
  // NOVOS ESTADOS PARA EDIÇÃO E CORREÇÃO
  // =========================================================
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editGarantia, setEditGarantia] = useState('');
  const [editValorParcela, setEditValorParcela] = useState('');

  // =========================================================
  // MÁGICA 1: PREENCHIMENTO 100% AUTOMÁTICO DA PARCELA E JUROS
  // =========================================================
  useEffect(() => {
    if (contrato) {
      const qtd = contrato.quantidade_parcelas || 1;
      const vParcela = contrato.valor_parcela || contrato.saldo_devedor;
      
      // Sugere o valor da parcela (ou o que sobrou da dívida se for menor)
      const valorSugerido = Math.min(vParcela, contrato.saldo_devedor);
      setValorPagamento(valorSugerido.toFixed(2));

      // Calcula quanto de JUROS tem dentro dessa parcela específica
      const dividaInicialTotal = qtd * vParcela;
      let jurosTotalDoContrato = dividaInicialTotal - contrato.valor_principal;
      if (jurosTotalDoContrato < 0) jurosTotalDoContrato = 0;
      
      let jurosPorParcela = jurosTotalDoContrato / qtd;

      // Se o cliente estiver pagando menos (ex: última parcela quebrada), o juros acompanha
      if (valorSugerido < vParcela) {
        const proporcao = valorSugerido / vParcela;
        jurosPorParcela = jurosPorParcela * proporcao;
      }

      setValorJuros(jurosPorParcela.toFixed(2));
      setDataPgto(new Date().toLocaleDateString('pt-BR')); // Reseta a data ao abrir
      
      // Inicia campos de edição
      setEditGarantia(contrato.garantia || '');
      setEditValorParcela(String(contrato.valor_parcela || '0'));
      setModoEdicao(false);
    }
  }, [contrato, visivel]);

  // =========================================================
  // MÁGICA 2: GERADOR DO CRONOGRAMA DE DATAS
  // =========================================================
  const cronograma = useMemo(() => {
    if (!contrato) return [];
    const parcelas = [];
    const qtd = contrato.quantidade_parcelas || 1;
    const vParcela = contrato.valor_parcela || contrato.saldo_devedor / qtd;
    
    // Começa a contar a partir da data em que o empréstimo foi feito
    let dataAtual = new Date(contrato.data_emprestimo || contrato.created_at);

    for (let i = 1; i <= qtd; i++) {
      if (contrato.frequencia === 'DIARIO') {
        let achouDiaValido = false;
        while (!achouDiaValido) {
          dataAtual.setDate(dataAtual.getDate() + 1);
          const diaSemana = dataAtual.getDay(); // 0 é Dom, 1 é Seg...
          const dataStr = dataAtual.toLocaleDateString('pt-BR', {day: '2-digit', month:'2-digit', year:'numeric'});
          
          // Verifica se é um dia de cobrança válido e se não é feriado
          const cobraNesteDia = contrato.dias_cobrar ? contrato.dias_cobrar.includes(diaSemana) : true;
          const ehFeriado = contrato.feriados ? contrato.feriados.includes(dataStr) : false;
          
          if (cobraNesteDia && !ehFeriado) achouDiaValido = true;
        }
      } else if (contrato.frequencia === 'SEMANAL') {
        dataAtual.setDate(dataAtual.getDate() + 7);
      } else if (contrato.frequencia === 'QUINZENAL') {
        dataAtual.setDate(dataAtual.getDate() + 15);
      } else if (contrato.frequencia === 'MENSAL') {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
      
      parcelas.push({
        numero: i,
        data: new Date(dataAtual), // Clona a data calculada
        valor: vParcela
      });
    }
    return parcelas;
  }, [contrato]);

  // =========================================================
  // NOVO: CÁLCULO DE GANHO DOS PARCEIROS POR PARCELA E TOTAL
  // =========================================================
  const detalhesComissao = useMemo(() => {
    if (!contrato) return [];
    const lista = contrato.comissionados_detalhes || [];
    const qtd = contrato.quantidade_parcelas || 1;
    return lista.map((c: any) => {
      const valorTotal = c.tipoComissao === 'PERCENTUAL' 
        ? (Number(contrato.valor_principal) * (Number(c.valorDigitado) / 100)) 
        : Number(c.valorDigitado);
      return {
        nome: c.nome,
        totalAcordado: valorTotal,
        porParcela: valorTotal / qtd
      };
    });
  }, [contrato]);

  if (!contrato) return null;

  const handlePagar = async () => {
    const valorNum = parseFloat(valorPagamento.replace(',', '.'));
    const jurosNum = parseFloat(valorJuros.replace(',', '.'));
    
    if (!valorPagamento || isNaN(valorNum) || valorNum <= 0) {
      Alert.alert('Erro', 'Digite um valor válido para o pagamento!');
      return;
    }

    if (valorNum > contrato.saldo_devedor) {
      Alert.alert('Aviso', 'O valor do pagamento é maior que a dívida atual!');
      return;
    }

    if (dataPgto.length !== 10) {
      Alert.alert('Erro', 'Digite uma data completa de pagamento (DD/MM/AAAA).');
      return;
    }

    // Passa a dataPgto lá pro useEmprestimos
    const res = await registrarPagamento(contrato, valorNum, jurosNum, 0, dataPgto);

    if (res.sucesso) {
      Alert.alert('Sucesso!', 'Pagamento registrado e lucro lançado no Dashboard!');
      setValorPagamento('');
      setValorJuros('0'); 
      onSuccess(); 
      onClose(); 
    } else {
      Alert.alert('Erro', res.error || 'Falha ao registrar pagamento.');
    }
  };

  // FUNÇÃO PARA SALVAR A EDIÇÃO DOS VALORES
  const handleSalvarEdicao = async () => {
    const vParcelaNum = parseFloat(editValorParcela.replace(',', '.'));
    
    if (isNaN(vParcelaNum)) return Alert.alert('Erro', 'Valor da parcela inválido');

    const res = await atualizarContrato(contrato.id, { 
      garantia: editGarantia,
      valor_parcela: vParcelaNum
    });

    if (res.sucesso) {
      Alert.alert("Sucesso", "Contrato corrigido com sucesso!");
      setModoEdicao(false);
      onSuccess();
    }
  };

  const qtdParcelas = contrato.quantidade_parcelas || 1;
  const valorDaParcela = contrato.valor_parcela || contrato.saldo_devedor;

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <View style={styles.header}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.title}>Detalhes</Text>
                
                {/* BOTÃO EXCLUIR */}
                <TouchableOpacity onPress={() => { deletarContrato(contrato.id); onClose(); }} style={{marginLeft: 15}}>
                  <Ionicons name="trash-outline" size={22} color="#e74c3c" />
                </TouchableOpacity>
                
                {/* BOTÃO EDITAR / CORRIGIR */}
                <TouchableOpacity onPress={() => setModoEdicao(!modoEdicao)} style={{marginLeft: 15}}>
                  <Ionicons name={modoEdicao ? "close-circle" : "create-outline"} size={22} color={modoEdicao ? "#e74c3c" : "#3498db"} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#7f8c8d" /></TouchableOpacity>
            </View>

            {/* Card de Informações */}
            <View style={styles.infoCard}>
              <Text style={styles.clienteNome}>{contrato.clientes?.nome}</Text>
              
              <View style={styles.row}>
                <Text style={styles.label}>Data Inicial:</Text>
                <Text style={styles.valor}>{new Date(contrato.data_emprestimo || contrato.created_at).toLocaleDateString('pt-BR')}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Emprestado:</Text>
                <Text style={styles.valor}>{formatarMoeda(contrato.valor_principal, contrato.moeda)}</Text>
              </View>
              
              <View style={styles.row}>
                <Text style={styles.label}>Divisão ({contrato.frequencia}):</Text>
                {modoEdicao ? (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.valor}>{qtdParcelas}x de </Text>
                    <TextInput 
                      style={styles.inputEditMini} 
                      value={editValorParcela} 
                      onChangeText={setEditValorParcela} 
                      keyboardType="numeric"
                    />
                  </View>
                ) : (
                  <Text style={styles.valor}>{qtdParcelas}x de {formatarMoeda(valorDaParcela, contrato.moeda)}</Text>
                )}
              </View>

              {/* CAMPO GARANTIA EDITÁVEL */}
              <View style={{marginTop: 5}}>
                <Text style={styles.label}>Garantia:</Text>
                {modoEdicao ? (
                  <TextInput 
                    style={styles.inputEdit} 
                    value={editGarantia} 
                    onChangeText={setEditGarantia} 
                  />
                ) : (
                  <Text style={styles.valor}>{contrato.garantia || 'Nenhuma'}</Text>
                )}
              </View>

              {modoEdicao && (
                <TouchableOpacity style={styles.btnConfirmarEdit} onPress={handleSalvarEdicao}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>SALVAR CORREÇÕES</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.row, {marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#ecf0f1'}]}>
                <Text style={[styles.label, {fontWeight: 'bold', color: '#2c3e50'}]}>Dívida Atual:</Text>
                <Text style={[styles.valor, { color: '#e74c3c', fontSize: 16 }]}>{formatarMoeda(contrato.saldo_devedor, contrato.moeda)}</Text>
              </View>
            </View>

            {/* NOVO: GANHOS DOS COMISSIONADOS */}
            {detalhesComissao.length > 0 && (
              <View style={styles.comissaoCard}>
                <Text style={styles.sectionTitle}>💰 Ganhos dos Parceiros</Text>
                {detalhesComissao.map((c: any, index: number) => (
                  <View key={index} style={styles.comissaoRow}>
                    <Text style={styles.comissaoNome}>{c.nome}</Text>
                    <View style={{alignItems: 'flex-end'}}>
                      <Text style={styles.comissaoValor}>P/ Parcela: {formatarMoeda(c.porParcela, contrato.moeda)}</Text>
                      <Text style={styles.comissaoTotal}>Total Final: {formatarMoeda(c.totalAcordado, contrato.moeda)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* CRONOGRAMA DE DATAS (Mantido Intacto) */}
            {!modoEdicao && (
              <View style={styles.cronogramaBox}>
                <Text style={styles.cronogramaTitle}>📅 Cronograma de Vencimentos</Text>
                <ScrollView style={{maxHeight: 120}} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                  {cronograma.map(p => (
                    <View key={p.numero} style={styles.cronogramaItem}>
                      <Text style={styles.cronogramaData}>{p.numero}ª Parcela - {p.data.toLocaleDateString('pt-BR')}</Text>
                      <Text style={styles.cronogramaValor}>{formatarMoeda(p.valor, contrato.moeda)}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Área de Pagamento Automática */}
            {contrato.status !== 'QUITADO' && !modoEdicao && (
              <View style={styles.pagamentoArea}>
                <Text style={styles.pagamentoTitle}>Registrar Pagamento</Text>
                
                <Text style={styles.labelMini}>Data do Pagamento:</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric"
                  placeholder="DD/MM/AAAA"
                  value={dataPgto}
                  onChangeText={(t) => {
                    let text = t.replace(/\D/g, '');
                    if (text.length > 2) text = text.replace(/(\d{2})(\d)/, '$1/$2');
                    if (text.length > 5) text = text.replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
                    setDataPgto(text.substring(0, 10));
                  }}
                />

                <Text style={styles.labelMini}>Valor Recebido:</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric"
                  value={valorPagamento}
                  onChangeText={setValorPagamento}
                />

                <Text style={styles.labelMini}>Parte de Juros (Dashboard):</Text>
                <TextInput 
                  style={[styles.input, { borderColor: '#3498db', backgroundColor: '#f0f8ff' }]} 
                  keyboardType="numeric"
                  value={valorJuros}
                  onChangeText={setValorJuros}
                />

                <TouchableOpacity style={styles.btnPagar} onPress={handlePagar} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CONFIRMAR RECEBIMENTO</Text>}
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, elevation: 5, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  infoCard: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 15 },
  clienteNome: { fontSize: 18, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' },
  label: { color: '#7f8c8d', fontSize: 14 },
  labelMini: { color: '#7f8c8d', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
  valor: { fontWeight: 'bold', fontSize: 14, color: '#2c3e50' },
  
  // ESTILOS DE EDIÇÃO
  inputEdit: { borderWidth: 1, borderColor: '#3498db', borderRadius: 5, padding: 5, backgroundColor: '#fff', fontSize: 14, color: '#2c3e50', marginTop: 5 },
  inputEditMini: { borderWidth: 1, borderColor: '#3498db', borderRadius: 5, padding: 2, width: 80, textAlign: 'center', backgroundColor: '#fff' },
  btnConfirmarEdit: { backgroundColor: '#3498db', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },

  // ESTILOS DOS COMISSIONADOS
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  comissaoCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ecf0f1', padding: 12, borderRadius: 10, marginBottom: 15 },
  comissaoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  comissaoNome: { fontWeight: 'bold', color: '#2c3e50' },
  comissaoValor: { fontSize: 12, color: '#27ae60', fontWeight: 'bold' },
  comissaoTotal: { fontSize: 10, color: '#7f8c8d', marginTop: 2 },

  // ESTILOS DO CRONOGRAMA
  cronogramaBox: { backgroundColor: '#ecf0f1', padding: 12, borderRadius: 8, marginBottom: 15 },
  cronogramaTitle: { fontSize: 14, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  cronogramaItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#dfe6e9' },
  cronogramaData: { fontSize: 13, color: '#2c3e50' },
  cronogramaValor: { fontSize: 13, fontWeight: 'bold', color: '#27ae60' },

  pagamentoArea: { marginTop: 5, marginBottom: 20 },
  pagamentoTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, fontSize: 18, marginBottom: 15 },
  btnPagar: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  quitadoCard: { alignItems: 'center', padding: 20, backgroundColor: '#e8f8f5', borderRadius: 10, marginTop: 10, marginBottom: 20 },
  quitadoText: { color: '#27ae60', fontWeight: 'bold', marginTop: 10 }
});