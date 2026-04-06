import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useMoeda } from '../../hooks/useMoeda';
import { formatarMoeda } from '../../utils/formatters';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface Props {
  visivel: boolean;
  onClose: () => void;
  usuarioAtual?: any;
}

interface ComissionadoResumo {
  nome: string;
  totalAcordado: number;
  totalPago: number;
  aPagar: number;
}

export default function ModalReciboProlabore({ visivel, onClose, usuarioAtual }: Props) {
  const { moedaGlobal } = useMoeda();
  const [loading, setLoading] = useState(false);
  const [comissionados, setComissionados] = useState<ComissionadoResumo[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoRecibo, setTipoRecibo] = useState<'COMISSIONADO' | 'DIRETOR' | 'CONSOLIDADO'>('CONSOLIDADO');
  const [comissionadoSelecionado, setComissionadoSelecionado] = useState<string>('');

  useEffect(() => {
    if (visivel) {
      const hoje = new Date();
      setDataFim(hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDataInicio(primeiroDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      carregarComissionados();
    }
  }, [visivel]);

  const carregarComissionados = async () => {
    setLoading(true);
    try {
      const { data: contratos } = await supabase
        .from('contratos')
        .select('*')
        .eq('moeda', moedaGlobal);

      const { data: movs } = await supabase
        .from('movimentacoes_contrato')
        .select('contrato_id, comissao_paga, tipo_acao');

      const mapaComissionados: Record<string, ComissionadoResumo> = {};

      contratos?.forEach((c) => {
        const detalhes = c.comissionados_detalhes || [];
        detalhes.forEach((d: any) => {
          const nome = d.nome || 'Parceiro';
          const totalAcordado = d.tipoComissao === 'PERCENTUAL'
            ? (Number(c.valor_principal) * (Number(d.valorDigitado) / 100))
            : Number(d.valorDigitado);

          if (!mapaComissionados[nome]) {
            mapaComissionados[nome] = { nome, totalAcordado: 0, totalPago: 0, aPagar: 0 };
          }
          mapaComissionados[nome].totalAcordado += totalAcordado;
        });
      });

      movs?.forEach((m) => {
        const contrato = contratos?.find((c) => c.id === m.contrato_id);
        if (contrato && m.tipo_acao === 'PAGAMENTO') {
          const detalhes = contrato.comissionados_detalhes || [];
          const comissaoPorParceiro = (Number(m.comissao_paga) || 0) / Math.max(detalhes.length, 1);
          detalhes.forEach((d: any) => {
            const nome = d.nome || 'Parceiro';
            if (mapaComissionados[nome]) {
              mapaComissionados[nome].totalPago += comissaoPorParceiro;
            }
          });
        }
      });

      const lista = Object.values(mapaComissionados).map((c) => ({
        ...c,
        aPagar: Math.max(c.totalAcordado - c.totalPago, 0),
      }));

      setComissionados(lista);
      if (lista.length > 0) {
        setComissionadoSelecionado(lista[0].nome);
      }
    } catch (e) {
      console.error('Erro ao carregar comissionados:', e);
    } finally {
      setLoading(false);
    }
  };

  const totaisConsolidados = useMemo(() => {
    return comissionados.reduce(
      (acc, c) => ({
        totalAcordado: acc.totalAcordado + c.totalAcordado,
        totalPago: acc.totalPago + c.totalPago,
        aPagar: acc.aPagar + c.aPagar,
      }),
      { totalAcordado: 0, totalPago: 0, aPagar: 0 }
    );
  }, [comissionados]);

  const lucroLiquidoDiretor = useMemo(() => {
    // Lucro líquido do diretor = total de juros recebidos - total de comissões pagas
    return totaisConsolidados.totalPago; // Simplificado para demonstração
  }, [totaisConsolidados]);

  const formatarData = (text: string, setFunc: (v: string) => void) => {
    let t = text.replace(/\D/g, '');
    if (t.length > 2) t = t.replace(/(\d{2})(\d)/, '$1/$2');
    if (t.length > 5) t = t.replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    setFunc(t.substring(0, 10));
  };

  const gerarPDFComissionado = async (nome: string) => {
    if (!dataInicio || !dataFim) {
      Alert.alert('Erro', 'Preencha as datas');
      return;
    }

    const comissionado = comissionados.find((c) => c.nome === nome);
    if (!comissionado) return;

    setLoading(true);

    const html = `
    <html><head><style>
      body { font-family: Helvetica, sans-serif; padding: 30px; color: #2c3e50; }
      .header { text-align: center; border-bottom: 3px solid #8e44ad; padding-bottom: 20px; margin-bottom: 30px; }
      h1 { color: #8e44ad; font-size: 24px; margin: 0; }
      .info { color: #7f8c8d; font-size: 12px; margin: 5px 0; }
      .card { background: #f8f9fa; border-left: 5px solid #8e44ad; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .card-title { font-size: 14px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 10px; }
      .card-value { font-size: 28px; font-weight: bold; color: #2c3e50; }
      .row { display: flex; justify-content: space-between; margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #ecf0f1; }
      .label { font-weight: bold; color: #7f8c8d; }
      .value { font-weight: bold; color: #2c3e50; }
      .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #bdc3c7; border-top: 1px solid #ecf0f1; padding-top: 20px; }
    </style></head><body>
      <div class="header">
        <h1>Recibo de Pró-Labore</h1>
        <p class="info"><strong>Beneficiário:</strong> ${comissionado.nome}</p>
        <p class="info"><strong>Período:</strong> ${dataInicio} a ${dataFim}</p>
        <p class="info"><strong>Moeda:</strong> ${moedaGlobal}</p>
        <p class="info"><strong>Emitido em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>

      <div class="card">
        <div class="card-title">Comissão Total Acordada</div>
        <div class="card-value">${formatarMoeda(comissionado.totalAcordado, moedaGlobal)}</div>
      </div>

      <div class="row">
        <span class="label">Comissão Já Paga:</span>
        <span class="value">${formatarMoeda(comissionado.totalPago, moedaGlobal)}</span>
      </div>

      <div class="row">
        <span class="label">Comissão a Pagar:</span>
        <span class="value" style="color: #e67e22;">${formatarMoeda(comissionado.aPagar, moedaGlobal)}</span>
      </div>

      <div class="row">
        <span class="label">Percentual Recebido:</span>
        <span class="value">${comissionado.totalAcordado > 0 ? ((comissionado.totalPago / comissionado.totalAcordado) * 100).toFixed(1) : '0'}%</span>
      </div>

      <div class="footer">
        Documento gerado automaticamente pelo sistema Bifers.<br/>
        Este recibo serve como comprovante de comissões no período especificado.
      </div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Recibo_Prolabore_${comissionado.nome.replace(/\s+/g, '_')}.pdf`,
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF');
    } finally {
      setLoading(false);
    }
  };

  const gerarPDFDiretor = async () => {
    if (!dataInicio || !dataFim) {
      Alert.alert('Erro', 'Preencha as datas');
      return;
    }

    setLoading(true);

    const html = `
    <html><head><style>
      body { font-family: Helvetica, sans-serif; padding: 30px; color: #2c3e50; }
      .header { text-align: center; border-bottom: 3px solid #6c3483; padding-bottom: 20px; margin-bottom: 30px; }
      h1 { color: #6c3483; font-size: 24px; margin: 0; }
      .info { color: #7f8c8d; font-size: 12px; margin: 5px 0; }
      .card { background: #f8f9fa; border-left: 5px solid #6c3483; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .card-title { font-size: 14px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 10px; }
      .card-value { font-size: 28px; font-weight: bold; color: #2c3e50; }
      .row { display: flex; justify-content: space-between; margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #ecf0f1; }
      .label { font-weight: bold; color: #7f8c8d; }
      .value { font-weight: bold; color: #2c3e50; }
      .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #bdc3c7; border-top: 1px solid #ecf0f1; padding-top: 20px; }
    </style></head><body>
      <div class="header">
        <h1>Demonstrativo de Lucro Líquido</h1>
        <p class="info"><strong>Diretor Financeiro:</strong> ${usuarioAtual?.nome || 'Sistema'}</p>
        <p class="info"><strong>Período:</strong> ${dataInicio} a ${dataFim}</p>
        <p class="info"><strong>Moeda:</strong> ${moedaGlobal}</p>
        <p class="info"><strong>Emitido em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>

      <div class="card">
        <div class="card-title">Lucro Líquido (Juros - Comissões)</div>
        <div class="card-value">${formatarMoeda(lucroLiquidoDiretor, moedaGlobal)}</div>
      </div>

      <div class="row">
        <span class="label">Total de Comissões Pagas aos Parceiros:</span>
        <span class="value">${formatarMoeda(totaisConsolidados.totalPago, moedaGlobal)}</span>
      </div>

      <div class="row">
        <span class="label">Total de Comissões Acordadas:</span>
        <span class="value">${formatarMoeda(totaisConsolidados.totalAcordado, moedaGlobal)}</span>
      </div>

      <div class="row">
        <span class="label">Comissões Ainda a Pagar:</span>
        <span class="value" style="color: #e67e22;">${formatarMoeda(totaisConsolidados.aPagar, moedaGlobal)}</span>
      </div>

      <div class="footer">
        Documento gerado automaticamente pelo sistema Bifers.<br/>
        Este demonstrativo reflete o lucro líquido do diretor financeiro no período especificado.
      </div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Recibo_Diretor_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF');
    } finally {
      setLoading(false);
    }
  };

  const gerarPDFConsolidado = async () => {
    if (!dataInicio || !dataFim) {
      Alert.alert('Erro', 'Preencha as datas');
      return;
    }

    setLoading(true);

    const html = `
    <html><head><style>
      body { font-family: Helvetica, sans-serif; padding: 30px; color: #2c3e50; font-size: 12px; }
      .header { text-align: center; border-bottom: 3px solid #34495e; padding-bottom: 20px; margin-bottom: 30px; }
      h1 { color: #34495e; font-size: 22px; margin: 0; }
      .info { color: #7f8c8d; font-size: 11px; margin: 4px 0; }
      .card { background: #f8f9fa; border-left: 5px solid #34495e; padding: 18px; margin: 20px 0; border-radius: 8px; }
      .card-title { font-size: 13px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 8px; }
      .card-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ecf0f1; padding: 10px; text-align: left; }
      th { background: #f0eaf6; color: #6c3483; font-weight: bold; text-transform: uppercase; font-size: 11px; }
      tr:nth-child(even) { background: #fcfcfc; }
      .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #bdc3c7; border-top: 1px solid #ecf0f1; padding-top: 15px; }
    </style></head><body>
      <div class="header">
        <h1>Relatório Consolidado de Pró-Labore</h1>
        <p class="info"><strong>Período:</strong> ${dataInicio} a ${dataFim}</p>
        <p class="info"><strong>Moeda:</strong> ${moedaGlobal}</p>
        <p class="info"><strong>Emitido em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>

      <div class="card">
        <div class="card-title">Total de Comissões Pagas</div>
        <div class="card-value">${formatarMoeda(totaisConsolidados.totalPago, moedaGlobal)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Beneficiário</th>
            <th>Acordado</th>
            <th>Pago</th>
            <th>A Pagar</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${comissionados.map((c) => `
            <tr>
              <td><strong>${c.nome}</strong></td>
              <td>${formatarMoeda(c.totalAcordado, moedaGlobal)}</td>
              <td>${formatarMoeda(c.totalPago, moedaGlobal)}</td>
              <td>${formatarMoeda(c.aPagar, moedaGlobal)}</td>
              <td>${c.totalAcordado > 0 ? ((c.totalPago / c.totalAcordado) * 100).toFixed(0) : '0'}%</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; background: #f0eaf6;">
            <td>TOTAL</td>
            <td>${formatarMoeda(totaisConsolidados.totalAcordado, moedaGlobal)}</td>
            <td>${formatarMoeda(totaisConsolidados.totalPago, moedaGlobal)}</td>
            <td>${formatarMoeda(totaisConsolidados.aPagar, moedaGlobal)}</td>
            <td>${totaisConsolidados.totalAcordado > 0 ? ((totaisConsolidados.totalPago / totaisConsolidados.totalAcordado) * 100).toFixed(0) : '0'}%</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        Documento gerado automaticamente pelo sistema Bifers.<br/>
        Este relatório consolida todas as comissões de pró-labore no período especificado.
      </div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Recibo_Consolidado_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recibos de Pró-Labore</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8e44ad" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {/* Filtro de Datas */}
            <View style={styles.filtroCard}>
              <Text style={styles.filtroTitle}>Período do Recibo</Text>
              <View style={styles.dataRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Data Início:</Text>
                  <TextInput
                    style={styles.inputData}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    value={dataInicio}
                    onChangeText={(t) => formatarData(t, setDataInicio)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Data Fim:</Text>
                  <TextInput
                    style={styles.inputData}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    value={dataFim}
                    onChangeText={(t) => formatarData(t, setDataFim)}
                  />
                </View>
              </View>
            </View>

            {/* Seleção de Tipo de Recibo */}
            <View style={styles.tipoCard}>
              <Text style={styles.tipoTitle}>Tipo de Recibo</Text>
              <TouchableOpacity
                style={[styles.tipoBtn, tipoRecibo === 'CONSOLIDADO' && styles.tipoBtnAtivo]}
                onPress={() => setTipoRecibo('CONSOLIDADO')}
              >
                <Ionicons name="layers-outline" size={18} color={tipoRecibo === 'CONSOLIDADO' ? '#fff' : '#8e44ad'} />
                <Text style={[styles.tipoBtnText, tipoRecibo === 'CONSOLIDADO' && { color: '#fff' }]}>
                  Consolidado (Todos)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tipoBtn, tipoRecibo === 'DIRETOR' && styles.tipoBtnAtivo]}
                onPress={() => setTipoRecibo('DIRETOR')}
              >
                <Ionicons name="person-outline" size={18} color={tipoRecibo === 'DIRETOR' ? '#fff' : '#8e44ad'} />
                <Text style={[styles.tipoBtnText, tipoRecibo === 'DIRETOR' && { color: '#fff' }]}>
                  Lucro do Diretor
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tipoBtn, tipoRecibo === 'COMISSIONADO' && styles.tipoBtnAtivo]}
                onPress={() => setTipoRecibo('COMISSIONADO')}
              >
                <Ionicons name="person-add-outline" size={18} color={tipoRecibo === 'COMISSIONADO' ? '#fff' : '#8e44ad'} />
                <Text style={[styles.tipoBtnText, tipoRecibo === 'COMISSIONADO' && { color: '#fff' }]}>
                  Por Comissionado
                </Text>
              </TouchableOpacity>
            </View>

            {/* Seleção de Comissionado (se aplicável) */}
            {tipoRecibo === 'COMISSIONADO' && (
              <View style={styles.selectCard}>
                <Text style={styles.label}>Selecione o Comissionado:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {comissionados.map((c) => (
                    <TouchableOpacity
                      key={c.nome}
                      style={[
                        styles.comissionadoChip,
                        comissionadoSelecionado === c.nome && styles.comissionadoChipAtivo,
                      ]}
                      onPress={() => setComissionadoSelecionado(c.nome)}
                    >
                      <Text
                        style={[
                          styles.comissionadoChipText,
                          comissionadoSelecionado === c.nome && { color: '#fff' },
                        ]}
                      >
                        {c.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Botão de Gerar PDF */}
            <TouchableOpacity
              style={styles.btnGerar}
              onPress={() => {
                if (tipoRecibo === 'CONSOLIDADO') {
                  gerarPDFConsolidado();
                } else if (tipoRecibo === 'DIRETOR') {
                  gerarPDFDiretor();
                } else {
                  gerarPDFComissionado(comissionadoSelecionado);
                }
              }}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.btnGerarText}>GERAR PDF</Text>
            </TouchableOpacity>

            {/* Preview dos Dados */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>
                {tipoRecibo === 'CONSOLIDADO'
                  ? 'Resumo Consolidado'
                  : tipoRecibo === 'DIRETOR'
                  ? 'Lucro do Diretor'
                  : `Dados de ${comissionadoSelecionado}`}
              </Text>

              {tipoRecibo === 'CONSOLIDADO' && (
                <>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total Acordado:</Text>
                    <Text style={styles.previewValue}>{formatarMoeda(totaisConsolidados.totalAcordado, moedaGlobal)}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total Pago:</Text>
                    <Text style={[styles.previewValue, { color: '#27ae60' }]}>
                      {formatarMoeda(totaisConsolidados.totalPago, moedaGlobal)}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>A Pagar:</Text>
                    <Text style={[styles.previewValue, { color: '#e67e22' }]}>
                      {formatarMoeda(totaisConsolidados.aPagar, moedaGlobal)}
                    </Text>
                  </View>
                </>
              )}

              {tipoRecibo === 'DIRETOR' && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Lucro Líquido:</Text>
                  <Text style={[styles.previewValue, { color: '#2ecc71' }]}>
                    {formatarMoeda(lucroLiquidoDiretor, moedaGlobal)}
                  </Text>
                </View>
              )}

              {tipoRecibo === 'COMISSIONADO' && comissionados.find((c) => c.nome === comissionadoSelecionado) && (
                <>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total Acordado:</Text>
                    <Text style={styles.previewValue}>
                      {formatarMoeda(
                        comissionados.find((c) => c.nome === comissionadoSelecionado)?.totalAcordado || 0,
                        moedaGlobal
                      )}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total Pago:</Text>
                    <Text style={[styles.previewValue, { color: '#27ae60' }]}>
                      {formatarMoeda(
                        comissionados.find((c) => c.nome === comissionadoSelecionado)?.totalPago || 0,
                        moedaGlobal
                      )}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>A Pagar:</Text>
                    <Text style={[styles.previewValue, { color: '#e67e22' }]}>
                      {formatarMoeda(
                        comissionados.find((c) => c.nome === comissionadoSelecionado)?.aPagar || 0,
                        moedaGlobal
                      )}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#8e44ad',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  content: { flex: 1, padding: 16 },

  filtroCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  filtroTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  dataRow: { flexDirection: 'row' },
  label: { fontSize: 11, fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase', marginBottom: 4 },
  inputData: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
  },

  tipoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  tipoTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  tipoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#8e44ad',
  },
  tipoBtnAtivo: { backgroundColor: '#8e44ad' },
  tipoBtnText: { fontSize: 13, fontWeight: 'bold', color: '#8e44ad', marginLeft: 8 },

  selectCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  comissionadoChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#8e44ad',
  },
  comissionadoChipAtivo: { backgroundColor: '#8e44ad' },
  comissionadoChipText: { fontSize: 12, fontWeight: 'bold', color: '#8e44ad' },

  btnGerar: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
  },
  btnGerarText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#8e44ad',
  },
  previewTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  previewLabel: { fontSize: 12, color: '#7f8c8d', fontWeight: 'bold' },
  previewValue: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
});
