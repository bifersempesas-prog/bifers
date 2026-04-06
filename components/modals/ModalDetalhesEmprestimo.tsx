import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
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
  const [dataPgto, setDataPgto] = useState(() => new Date().toLocaleDateString('pt-BR'));

  const [modoEdicao, setModoEdicao] = useState(false);
  const [editGarantia, setEditGarantia] = useState('');
  const [editValorParcela, setEditValorParcela] = useState('');

  // ─── Preenchimento automático ao abrir ───────────────────────────────────
  useEffect(() => {
    if (contrato && visivel) {
      const qtd = contrato.quantidade_parcelas || 1;
      const vParcela = contrato.valor_parcela || contrato.saldo_devedor;

      const valorSugerido = Math.min(vParcela, contrato.saldo_devedor);
      setValorPagamento(valorSugerido.toFixed(2));

      const dividaInicialTotal = qtd * vParcela;
      let jurosTotalDoContrato = dividaInicialTotal - contrato.valor_principal;
      if (jurosTotalDoContrato < 0) jurosTotalDoContrato = 0;

      let jurosPorParcela = jurosTotalDoContrato / qtd;
      if (valorSugerido < vParcela) {
        jurosPorParcela = jurosPorParcela * (valorSugerido / vParcela);
      }

      setValorJuros(jurosPorParcela.toFixed(2));
      setDataPgto(new Date().toLocaleDateString('pt-BR'));
      setEditGarantia(contrato.garantia || '');
      setEditValorParcela(String(contrato.valor_parcela || '0'));
      setModoEdicao(false);
    }
  }, [contrato, visivel]);

  // ─── Cronograma de vencimentos ───────────────────────────────────────────
  const cronograma = useMemo(() => {
    if (!contrato) return [];
    const parcelas = [];
    const qtd = contrato.quantidade_parcelas || 1;
    const vParcela = contrato.valor_parcela || contrato.saldo_devedor / qtd;
    let dataAtual = new Date(contrato.data_emprestimo || contrato.created_at);

    for (let i = 1; i <= qtd; i++) {
      if (contrato.frequencia === 'DIARIO') {
        let achouDiaValido = false;
        while (!achouDiaValido) {
          dataAtual.setDate(dataAtual.getDate() + 1);
          const diaSemana = dataAtual.getDay();
          const dataStr = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      parcelas.push({ numero: i, data: new Date(dataAtual), valor: vParcela });
    }
    return parcelas;
  }, [contrato]);

  // ─── Cálculo de comissão dos parceiros ──────────────────────────────────
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
        porParcela: valorTotal / qtd,
      };
    });
  }, [contrato]);

  // ─── Comissão proporcional para o pagamento atual ────────────────────────
  const comissaoProporcionalPagamento = useMemo(() => {
    if (!contrato || detalhesComissao.length === 0) return 0;
    const qtd = contrato.quantidade_parcelas || 1;
    const totalComissaoContrato = detalhesComissao.reduce((acc: number, c: any) => acc + c.totalAcordado, 0);
    return totalComissaoContrato / qtd;
  }, [contrato, detalhesComissao]);

  if (!contrato) return null;

  const qtdParcelas = contrato.quantidade_parcelas || 1;
  const valorDaParcela = contrato.valor_parcela || contrato.saldo_devedor;
  const isQuitado = contrato.status === 'QUITADO';

  // ─── Registrar pagamento ─────────────────────────────────────────────────
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

    // Calcula a comissão proporcional ao valor pago
    const proporcaoPaga = valorNum / valorDaParcela;
    const comissaoCalculada = comissaoProporcionalPagamento * Math.min(proporcaoPaga, 1);

    const res = await registrarPagamento(contrato, valorNum, jurosNum, comissaoCalculada, dataPgto);

    if (res.sucesso) {
      const novoSaldo = contrato.saldo_devedor - valorNum;
      const msg = novoSaldo <= 0
        ? 'Contrato QUITADO! Parabéns!'
        : `Pagamento registrado!\nSaldo restante: ${formatarMoeda(novoSaldo, contrato.moeda)}`;
      Alert.alert('Sucesso!', msg);
      setValorPagamento('');
      setValorJuros('0');
      onSuccess();
      onClose();
    } else {
      Alert.alert('Erro', res.error || 'Falha ao registrar pagamento.');
    }
  };

  // ─── Salvar edição do contrato ───────────────────────────────────────────
  const handleSalvarEdicao = async () => {
    const vParcelaNum = parseFloat(editValorParcela.replace(',', '.'));
    if (isNaN(vParcelaNum)) return Alert.alert('Erro', 'Valor da parcela inválido');

    const res = await atualizarContrato(contrato.id, {
      garantia: editGarantia,
      valor_parcela: vParcelaNum,
    });

    if (res.sucesso) {
      Alert.alert('Sucesso', 'Contrato corrigido com sucesso!');
      setModoEdicao(false);
      onSuccess();
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Cabeçalho ─────────────────────────────────────────────── */}
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.statusDot, { backgroundColor: isQuitado ? '#2ecc71' : '#3498db' }]} />
                <Text style={styles.title}>Detalhes do Contrato</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => { deletarContrato(contrato.id); onClose(); }}
                  style={styles.headerBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModoEdicao(!modoEdicao)}
                  style={[styles.headerBtn, modoEdicao && styles.headerBtnAtivo]}
                >
                  <Ionicons
                    name={modoEdicao ? 'close-circle' : 'create-outline'}
                    size={20}
                    color={modoEdicao ? '#fff' : '#3498db'}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                  <Ionicons name="close" size={22} color="#7f8c8d" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Card de Status (Quitado) ──────────────────────────────── */}
            {isQuitado && (
              <View style={styles.quitadoCard}>
                <Ionicons name="checkmark-circle" size={40} color="#2ecc71" />
                <Text style={styles.quitadoTitle}>CONTRATO QUITADO</Text>
                <Text style={styles.quitadoSub}>Este empréstimo foi totalmente pago.</Text>
              </View>
            )}

            {/* ── Card de Informações ───────────────────────────────────── */}
            <View style={styles.infoCard}>
              <View style={styles.clienteHeader}>
                <View style={styles.clienteAvatar}>
                  <Text style={styles.clienteAvatarText}>
                    {(contrato.clientes?.nome || 'C')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.clienteNome}>{contrato.clientes?.nome}</Text>
                  {contrato.clientes?.telefone ? (
                    <Text style={styles.clienteTelefone}>
                      <Ionicons name="logo-whatsapp" size={12} color="#25D366" /> {contrato.clientes.telefone}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.badgeStatus, { backgroundColor: isQuitado ? '#2ecc71' : '#3498db' }]}>
                  <Text style={styles.badgeStatusText}>{contrato.status}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <InfoRow label="Data Inicial" value={new Date(contrato.data_emprestimo || contrato.created_at).toLocaleDateString('pt-BR')} />
              <InfoRow label="Capital Emprestado" value={formatarMoeda(contrato.valor_principal, contrato.moeda)} valueColor="#2980b9" />
              <InfoRow
                label={`Divisão (${contrato.frequencia})`}
                value={
                  modoEdicao
                    ? undefined
                    : `${qtdParcelas}x de ${formatarMoeda(valorDaParcela, contrato.moeda)}`
                }
                editNode={
                  modoEdicao ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.infoValue}>{qtdParcelas}x de </Text>
                      <TextInput
                        style={styles.inputEditMini}
                        value={editValorParcela}
                        onChangeText={setEditValorParcela}
                        keyboardType="numeric"
                      />
                    </View>
                  ) : undefined
                }
              />

              {/* Garantia */}
              <View style={{ marginTop: 8 }}>
                <Text style={styles.infoLabel}>Garantia</Text>
                {modoEdicao ? (
                  <TextInput
                    style={styles.inputEdit}
                    value={editGarantia}
                    onChangeText={setEditGarantia}
                    placeholder="Descreva a garantia..."
                  />
                ) : (
                  <Text style={styles.infoValue}>{contrato.garantia || 'Nenhuma'}</Text>
                )}
              </View>

              {modoEdicao && (
                <TouchableOpacity style={styles.btnConfirmarEdit} onPress={handleSalvarEdicao}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 6 }}>SALVAR CORREÇÕES</Text>
                </TouchableOpacity>
              )}

              <View style={styles.saldoRow}>
                <Text style={styles.saldoLabel}>Dívida Atual</Text>
                <Text style={[styles.saldoValor, { color: isQuitado ? '#2ecc71' : '#e74c3c' }]}>
                  {formatarMoeda(contrato.saldo_devedor, contrato.moeda)}
                </Text>
              </View>
            </View>

            {/* ── Ganhos dos Parceiros ──────────────────────────────────── */}
            {detalhesComissao.length > 0 && (
              <View style={styles.comissaoCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="people" size={16} color="#8e44ad" />
                  <Text style={styles.sectionTitle}>Ganhos dos Parceiros</Text>
                </View>
                {detalhesComissao.map((c: any, index: number) => (
                  <View key={index} style={styles.comissaoRow}>
                    <View style={styles.comissaoAvatar}>
                      <Text style={styles.comissaoAvatarText}>{c.nome[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.comissaoNome}>{c.nome}</Text>
                      <Text style={styles.comissaoValor}>
                        Por parcela: {formatarMoeda(c.porParcela, contrato.moeda)}
                      </Text>
                    </View>
                    <Text style={styles.comissaoTotal}>
                      Total: {formatarMoeda(c.totalAcordado, contrato.moeda)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Cronograma ────────────────────────────────────────────── */}
            {!modoEdicao && (
              <View style={styles.cronogramaBox}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar" size={16} color="#34495e" />
                  <Text style={styles.sectionTitle}>Cronograma de Vencimentos</Text>
                </View>
                <ScrollView style={{ maxHeight: 130 }} showsVerticalScrollIndicator nestedScrollEnabled>
                  {cronograma.map(p => {
                    const hoje = new Date();
                    const vencida = p.data < hoje && !isQuitado;
                    return (
                      <View key={p.numero} style={styles.cronogramaItem}>
                        <View style={[styles.cronogramaDot, { backgroundColor: vencida ? '#e74c3c' : '#3498db' }]} />
                        <Text style={[styles.cronogramaData, vencida && { color: '#e74c3c' }]}>
                          {p.numero}ª Parcela — {p.data.toLocaleDateString('pt-BR')}
                        </Text>
                        <Text style={styles.cronogramaValor}>{formatarMoeda(p.valor, contrato.moeda)}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Área de Pagamento ─────────────────────────────────────── */}
            {!isQuitado && !modoEdicao && (
              <View style={styles.pagamentoArea}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="cash" size={16} color="#27ae60" />
                  <Text style={[styles.sectionTitle, { color: '#27ae60' }]}>Registrar Pagamento</Text>
                </View>

                <Text style={styles.labelMini}>Data do Pagamento</Text>
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

                <Text style={styles.labelMini}>Valor Recebido</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={valorPagamento}
                  onChangeText={setValorPagamento}
                  placeholder="0.00"
                />

                <Text style={styles.labelMini}>Parte de Juros (para o Dashboard)</Text>
                <TextInput
                  style={[styles.input, { borderColor: '#3498db', backgroundColor: '#f0f8ff' }]}
                  keyboardType="numeric"
                  value={valorJuros}
                  onChangeText={setValorJuros}
                  placeholder="0.00"
                />

                {/* Preview da comissão que será registrada */}
                {comissaoProporcionalPagamento > 0 && (
                  <View style={styles.comissaoPreview}>
                    <Ionicons name="people-outline" size={14} color="#8e44ad" />
                    <Text style={styles.comissaoPreviewText}>
                      Comissão a registrar: {formatarMoeda(comissaoProporcionalPagamento, contrato.moeda)} (proporcional)
                    </Text>
                  </View>
                )}

                <TouchableOpacity style={styles.btnPagar} onPress={handlePagar} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.btnText}> CONFIRMAR RECEBIMENTO</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Componente auxiliar de linha de informação ───────────────────────────────
function InfoRow({ label, value, valueColor, editNode }: {
  label: string;
  value?: string;
  valueColor?: string;
  editNode?: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {editNode || <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalView: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '93%',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 4,
    backgroundColor: '#ecf0f1',
  },
  headerBtnAtivo: {
    backgroundColor: '#e74c3c',
  },

  // Quitado
  quitadoCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e8f8f5',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#a9dfbf',
  },
  quitadoTitle: { fontSize: 16, fontWeight: 'bold', color: '#27ae60', marginTop: 8 },
  quitadoSub: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },

  // Info Card
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  clienteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clienteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clienteAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  clienteNome: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  clienteTelefone: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  badgeStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeStatusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#ecf0f1', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: { fontSize: 13, color: '#7f8c8d' },
  infoValue: { fontSize: 13, fontWeight: 'bold', color: '#2c3e50' },
  saldoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  saldoLabel: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  saldoValor: { fontSize: 18, fontWeight: 'bold' },

  // Edição
  inputEdit: {
    borderWidth: 1.5,
    borderColor: '#3498db',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f0f8ff',
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 6,
  },
  inputEditMini: {
    borderWidth: 1.5,
    borderColor: '#3498db',
    borderRadius: 6,
    padding: 4,
    width: 80,
    textAlign: 'center',
    backgroundColor: '#f0f8ff',
    fontSize: 13,
  },
  btnConfirmarEdit: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  // Comissão
  comissaoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#8e44ad',
  },
  comissaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  comissaoAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#8e44ad',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comissaoAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  comissaoNome: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
  comissaoValor: { fontSize: 12, color: '#27ae60', marginTop: 2 },
  comissaoTotal: { fontSize: 12, fontWeight: 'bold', color: '#8e44ad' },

  // Cronograma
  cronogramaBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cronogramaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  cronogramaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  cronogramaData: { flex: 1, fontSize: 13, color: '#2c3e50' },
  cronogramaValor: { fontSize: 13, fontWeight: 'bold', color: '#27ae60' },

  // Pagamento
  pagamentoArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71',
  },
  labelMini: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  comissaoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5eef8',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8e44ad',
  },
  comissaoPreviewText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#6c3483',
    fontWeight: 'bold',
  },
  btnPagar: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Seção
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 6,
  },
});
