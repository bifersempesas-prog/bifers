import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, FlatList, ScrollView, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMoeda } from '../../hooks/useMoeda';
import { supabase } from '../../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatarMoeda } from '../../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import ModalReciboProlabore from '../../components/modals/ModalReciboProlabore';

type PeriodoPDF = 'TUDO' | 'HOJE' | 'MES' | 'CUSTOM';
type TipoLancamento = 'ENTRADA' | 'SAIDA';

interface ContratoRelatorio {
  id: string;
  cliente_id: string;
  valor_principal: number;
  saldo_devedor: number;
  taxa_juros: number;
  tipo_juros: string;
  frequencia: string;
  quantidade_parcelas: number;
  valor_parcela: number;
  status: string;
  created_at: string;
  moeda: string;
  numero_contrato?: string;
  garantia?: string;
  comissionados_detalhes?: any[];
  nomeCliente: string;
  telefoneCliente: string;
  jurosRecebidos: number;
  comissoesPagas: number;
  qtdPagamentos: number;
}

interface ResumoComissionado {
  nome: string;
  totalAcordado: number;
  totalPago: number;
}

export default function CaixaScreen() {
  const { moedaGlobal } = useMoeda();
  const { usuarioAtual, temPermissao } = useAuth();

  // ── Modal Recibo ───────────────────────────────────────────────────────────
  const [modalReciboVisivel, setModalReciboVisivel] = useState(false);

  // ── Caixa ──────────────────────────────────────────────────────────────────
  const [valor, setValor] = useState('');
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<TipoLancamento>('ENTRADA');
  const [descricao, setDescricao] = useState('');
  const [dataLancamento, setDataLancamento] = useState(() =>
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
  const [listaCaixa, setListaCaixa] = useState<any[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'TUDO' | 'HOJE' | 'MES'>('TUDO');

  // ── Modal PDF de Caixa ─────────────────────────────────────────────────────
  const [modalPdfVisivel, setModalPdfVisivel] = useState(false);
  const [mostrarFormCustom, setMostrarFormCustom] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // ── Modal de Lucros / Comissões ────────────────────────────────────────────
  const [modalLucrosVisivel, setModalLucrosVisivel] = useState(false);
  const [listaContratos, setListaContratos] = useState<ContratoRelatorio[]>([]);
  const [resumoComissionados, setResumoComissionados] = useState<ResumoComissionado[]>([]);
  const [loadingLucros, setLoadingLucros] = useState(false);
  const [filtroLucros, setFiltroLucros] = useState<'TODOS' | 'ATIVO' | 'QUITADO'>('TODOS');
  const [modalPdfLucrosVisivel, setModalPdfLucrosVisivel] = useState(false);
  const [mostrarFormCustomLucros, setMostrarFormCustomLucros] = useState(false);
  const [dataInicioLucros, setDataInicioLucros] = useState('');
  const [dataFimLucros, setDataFimLucros] = useState('');

  const carregarSaldo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fluxo_pessoal')
        .select('*')
        .eq('moeda', moedaGlobal)
        .order('created_at', { ascending: false });

      if (error) console.error('Erro ao buscar caixa:', error);
      if (data) {
        const total = data.reduce((acc, curr) => {
          const v = Number(curr.valor) || 0;
          return curr.tipo === 'ENTRADA' ? acc + v : acc - v;
        }, 0);
        setSaldo(total);
        setListaCaixa(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const carregarLucros = async () => {
    setLoadingLucros(true);
    try {
      const { data: contratos, error: errContratos } = await supabase
        .from('contratos')
        .select('*')
        .eq('moeda', moedaGlobal)
        .order('created_at', { ascending: false });

      if (errContratos) throw errContratos;
      if (!contratos || contratos.length === 0) {
        setListaContratos([]);
        setResumoComissionados([]);
        return;
      }

      const clienteIds = [...new Set(contratos.map(c => c.cliente_id).filter(Boolean))];
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .in('id', clienteIds);

      const mapaClientes: Record<string, any> = {};
      clientes?.forEach(c => { mapaClientes[c.id] = c; });

      const contratoIds = contratos.map(c => c.id);
      const { data: movs } = await supabase
        .from('movimentacoes_contrato')
        .select('contrato_id, valor_juros_pago, comissao_paga, tipo_acao')
        .in('contrato_id', contratoIds)
        .eq('tipo_acao', 'PAGAMENTO');

      const mapaMovs: Record<string, { juros: number; comissao: number; qtd: number }> = {};
      movs?.forEach(m => {
        if (!mapaMovs[m.contrato_id]) {
          mapaMovs[m.contrato_id] = { juros: 0, comissao: 0, qtd: 0 };
        }
        mapaMovs[m.contrato_id].juros += Number(m.valor_juros_pago) || 0;
        mapaMovs[m.contrato_id].comissao += Number(m.comissao_paga) || 0;
        mapaMovs[m.contrato_id].qtd += 1;
      });

      const listaEnriquecida: ContratoRelatorio[] = contratos.map(c => {
        const cliente = mapaClientes[c.cliente_id] || {};
        const movContrato = mapaMovs[c.id] || { juros: 0, comissao: 0, qtd: 0 };
        return {
          ...c,
          nomeCliente: cliente.nome || 'Cliente não encontrado',
          telefoneCliente: cliente.telefone || '',
          jurosRecebidos: movContrato.juros,
          comissoesPagas: movContrato.comissao,
          qtdPagamentos: movContrato.qtd,
        };
      });

      setListaContratos(listaEnriquecida);

      const mapaComissionados: Record<string, ResumoComissionado> = {};
      listaEnriquecida.forEach(c => {
        const detalhes = c.comissionados_detalhes || [];
        detalhes.forEach((d: any) => {
          const nome = d.nome || 'Parceiro';
          const totalAcordado = d.tipoComissao === 'PERCENTUAL'
            ? (Number(c.valor_principal) * (Number(d.valorDigitado) / 100))
            : Number(d.valorDigitado);
          if (!mapaComissionados[nome]) {
            mapaComissionados[nome] = { nome, totalAcordado: 0, totalPago: 0 };
          }
          mapaComissionados[nome].totalAcordado += totalAcordado;
          mapaComissionados[nome].totalPago += c.comissoesPagas / Math.max(detalhes.length, 1);
        });
      });
      setResumoComissionados(Object.values(mapaComissionados));

    } catch (e: any) {
      console.error('Erro ao carregar lucros:', e.message);
      Alert.alert('Erro', 'Não foi possível carregar os dados de lucros.');
    } finally {
      setLoadingLucros(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarSaldo();
    }, [moedaGlobal])
  );

  const formatarData = (text: string, setFunc: (v: string) => void) => {
    let t = text.replace(/\D/g, '');
    if (t.length > 2) t = t.replace(/(\d{2})(\d)/, '$1/$2');
    if (t.length > 5) t = t.replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    setFunc(t.substring(0, 10));
  };

  const calcularLucroPrevisto = (c: ContratoRelatorio): number => {
    const totalEsperado = (c.quantidade_parcelas || 1) * (c.valor_parcela || 0);
    const lucro = totalEsperado - Number(c.valor_principal);
    return lucro > 0 ? lucro : 0;
  };

  const calcularLucroAReceber = (c: ContratoRelatorio): number => {
    return Math.max(calcularLucroPrevisto(c) - c.jurosRecebidos, 0);
  };

  const totaisLucros = useCallback(() => {
    return listaContratos.reduce(
      (acc, c) => {
        acc.capitalTotal += Number(c.valor_principal) || 0;
        acc.lucroTotal += calcularLucroPrevisto(c);
        acc.lucroRecebido += c.jurosRecebidos;
        acc.comissaoTotal += c.comissoesPagas;
        acc.qtdAtivos += c.status === 'ATIVO' ? 1 : 0;
        acc.qtdQuitados += c.status === 'QUITADO' ? 1 : 0;
        return acc;
      },
      { capitalTotal: 0, lucroTotal: 0, lucroRecebido: 0, comissaoTotal: 0, qtdAtivos: 0, qtdQuitados: 0 }
    );
  }, [listaContratos]);

  const listaFiltrada = listaContratos.filter(c => {
    if (filtroLucros === 'TODOS') return true;
    return c.status === filtroLucros;
  });

  const corStatus = (s: string) => {
    if (s === 'ATIVO') return '#3498db';
    if (s === 'QUITADO') return '#2ecc71';
    return '#95a5a6';
  };

  const handleLancarCaixa = async () => {
    if (!valor) return Alert.alert('Erro', 'Digite um valor!');
    if (dataLancamento.length !== 10) return Alert.alert('Erro', 'Digite uma data completa (DD/MM/AAAA)');

    const valorTratado = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorTratado) || valorTratado <= 0) return Alert.alert('Erro', 'Valor inválido!');

    const [d, m, y] = dataLancamento.split('/');
    const dataFinal = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0).toISOString();

    setLoading(true);
    try {
      const { error } = await supabase.from('fluxo_pessoal').insert({
        tipo: tipoLancamento,
        valor: valorTratado,
        descricao: descricao || (tipoLancamento === 'ENTRADA' ? 'Entrada Manual' : 'Saída Manual'),
        moeda: moedaGlobal,
        created_at: dataFinal
      });

      if (error) throw error;
      Alert.alert('Sucesso', 'Lançamento realizado!');
      setValor('');
      setDescricao('');
      carregarSaldo();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  const gerarPDF = async (periodo: PeriodoPDF) => {
    setLoading(true);
    let dadosFiltrados = [...listaCaixa];
    const hoje = new Date();

    if (periodo === 'HOJE') {
      dadosFiltrados = dadosFiltrados.filter(item => new Date(item.created_at).toDateString() === hoje.toDateString());
    } else if (periodo === 'MES') {
      dadosFiltrados = dadosFiltrados.filter(item => {
        const d = new Date(item.created_at);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      });
    } else if (periodo === 'CUSTOM') {
      if (!dataInicio || !dataFim) {
        setLoading(false);
        return Alert.alert('Erro', 'Preencha as datas de início e fim.');
      }
      const [di, mi, yi] = dataInicio.split('/');
      const [df, mf, yf] = dataFim.split('/');
      const start = new Date(Number(yi), Number(mi) - 1, Number(di), 0, 0, 0);
      const end = new Date(Number(yf), Number(mf) - 1, Number(df), 23, 59, 59);
      dadosFiltrados = dadosFiltrados.filter(item => {
        const d = new Date(item.created_at);
        return d >= start && d <= end;
      });
    }

    const totalEntradas = dadosFiltrados.filter(i => i.tipo === 'ENTRADA').reduce((acc, curr) => acc + Number(curr.valor), 0);
    const totalSaidas = dadosFiltrados.filter(i => i.tipo === 'SAIDA').reduce((acc, curr) => acc + Number(curr.valor), 0);

    const html = `
    <html><head><style>
      body { font-family: Helvetica, sans-serif; padding: 20px; color: #2c3e50; }
      h1 { color: #3498db; text-align: center; }
      .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #dfe6e9; padding: 10px; text-align: left; }
      th { background: #3498db; color: white; }
      .entrada { color: #27ae60; font-weight: bold; }
      .saida { color: #e74c3c; font-weight: bold; }
    </style></head><body>
      <h1>Relatório de Caixa (${moedaGlobal})</h1>
      <div class="summary">
        <p><strong>Período:</strong> ${periodo === 'CUSTOM' ? `${dataInicio} a ${dataFim}` : periodo}</p>
        <p><strong>Total Entradas:</strong> ${formatarMoeda(totalEntradas, moedaGlobal)}</p>
        <p><strong>Total Saídas:</strong> ${formatarMoeda(totalSaidas, moedaGlobal)}</p>
        <p><strong>Saldo no Período:</strong> ${formatarMoeda(totalEntradas - totalSaidas, moedaGlobal)}</p>
      </div>
      <table>
        <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead>
        <tbody>
          ${dadosFiltrados.map(i => `
            <tr>
              <td>${new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
              <td class="${i.tipo.toLowerCase()}">${i.tipo}</td>
              <td>${i.descricao}</td>
              <td class="${i.tipo.toLowerCase()}">${formatarMoeda(i.valor, moedaGlobal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Caixa_${moedaGlobal}.pdf` });
      setModalPdfVisivel(false);
    } catch {
      Alert.alert('Erro', 'Falha ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  const gerarPDFLucros = async (periodo: PeriodoPDF) => {
    setLoadingLucros(true);
    let contratosFiltrados = [...listaContratos];
    const hoje = new Date();

    if (periodo === 'HOJE') {
      contratosFiltrados = contratosFiltrados.filter(c => new Date(c.created_at).toDateString() === hoje.toDateString());
    } else if (periodo === 'MES') {
      contratosFiltrados = contratosFiltrados.filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      });
    } else if (periodo === 'CUSTOM') {
      if (!dataInicioLucros || !dataFimLucros) {
        setLoadingLucros(false);
        return Alert.alert('Erro', 'Preencha as datas.');
      }
      const [di, mi, yi] = dataInicioLucros.split('/');
      const [df, mf, yf] = dataFimLucros.split('/');
      const start = new Date(Number(yi), Number(mi) - 1, Number(di), 0, 0, 0);
      const end = new Date(Number(yf), Number(mf) - 1, Number(df), 23, 59, 59);
      contratosFiltrados = contratosFiltrados.filter(c => {
        const d = new Date(c.created_at);
        return d >= start && d <= end;
      });
    }

    const totaisPeriodo = contratosFiltrados.reduce((acc, c) => {
      acc.capital += Number(c.valor_principal) || 0;
      acc.lucroPrevisto += calcularLucroPrevisto(c);
      acc.lucroRecebido += c.jurosRecebidos;
      acc.comissao += c.comissoesPagas;
      return acc;
    }, { capital: 0, lucroPrevisto: 0, lucroRecebido: 0, comissao: 0 });

    const html = `
    <html><head><style>
      body { font-family: Helvetica, sans-serif; padding: 20px; color: #2c3e50; }
      h1 { color: #8e44ad; text-align: center; }
      .summary-box { background: #f3e5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #d1c4e9; }
      .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #dfe6e9; padding: 8px; text-align: left; }
      th { background: #8e44ad; color: white; }
    </style></head><body>
      <h1>Relatório de Lucros e Comissões (${moedaGlobal})</h1>
      <div class="summary-box">
        <div class="summary-row"><span>Capital Investido:</span> <strong>${formatarMoeda(totaisPeriodo.capital, moedaGlobal)}</strong></div>
        <div class="summary-row"><span>Lucro Recebido:</span> <strong style="color:#27ae60">+ ${formatarMoeda(totaisPeriodo.lucroRecebido, moedaGlobal)}</strong></div>
        <div class="summary-row"><span>Comissões Pagas:</span> <strong style="color:#e74c3c">- ${formatarMoeda(totaisPeriodo.comissao, moedaGlobal)}</strong></div>
        <div class="summary-row"><span>Lucro Líquido:</span> <strong>${formatarMoeda(totaisPeriodo.lucroRecebido - totaisPeriodo.comissao, moedaGlobal)}</strong></div>
      </div>
      <table>
        <thead><tr><th>Cliente</th><th>Status</th><th>Capital</th><th>Juros Rec.</th><th>Comissão</th></tr></thead>
        <tbody>
          ${contratosFiltrados.map(c => `
            <tr>
              <td>${c.nomeCliente}</td>
              <td>${c.status}</td>
              <td>${formatarMoeda(c.valor_principal, moedaGlobal)}</td>
              <td>${formatarMoeda(c.jurosRecebidos, moedaGlobal)}</td>
              <td>${formatarMoeda(c.comissoesPagas, moedaGlobal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Lucros_${moedaGlobal}.pdf` });
      setModalPdfLucrosVisivel(false);
    } catch {
      Alert.alert('Erro', 'Falha ao gerar PDF');
    } finally {
      setLoadingLucros(false);
    }
  };

  const renderModalLucros = () => {
    const totais = totaisLucros();
    return (
      <Modal visible={modalLucrosVisivel} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalLucrosContainer}>
          <View style={styles.modalLucrosHeader}>
            <TouchableOpacity onPress={() => setModalLucrosVisivel(false)} style={styles.btnVoltar}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalLucrosTitulo}>Lucros & Comissões</Text>
            <TouchableOpacity
              onPress={() => { setMostrarFormCustomLucros(false); setModalPdfLucrosVisivel(true); }}
              style={styles.btnPdfHeader}
            >
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>PDF</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
            {loadingLucros ? (
              <ActivityIndicator color="#8e44ad" size="large" style={{ marginTop: 40 }} />
            ) : (
              <>
                <View style={styles.cardLucroPrincipal}>
                  <Text style={styles.cardLucroLabel}>Lucro Total Previsto</Text>
                  <Text style={styles.cardLucroValor}>{formatarMoeda(totais.lucroTotal, moedaGlobal)}</Text>
                  <View style={styles.cardLucroRow}>
                    <View style={styles.cardLucroMini}>
                      <Text style={styles.cardLucroMiniLabel}>Já Recebido</Text>
                      <Text style={[styles.cardLucroMiniValor, { color: '#2ecc71' }]}>
                        {formatarMoeda(totais.lucroRecebido, moedaGlobal)}
                      </Text>
                    </View>
                    <View style={[styles.cardLucroMini, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.3)' }]}>
                      <Text style={styles.cardLucroMiniLabel}>A Receber</Text>
                      <Text style={[styles.cardLucroMiniValor, { color: '#f39c12' }]}>
                        {formatarMoeda(totais.lucroTotal - totais.lucroRecebido, moedaGlobal)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.gridIndicadores}>
                  <View style={styles.indicadorCard}>
                    <Ionicons name="cash-outline" size={22} color="#2980b9" />
                    <Text style={styles.indicadorValor}>{formatarMoeda(totais.capitalTotal, moedaGlobal)}</Text>
                    <Text style={styles.indicadorLabel}>Capital Total</Text>
                  </View>
                  <View style={styles.indicadorCard}>
                    <Ionicons name="trending-up-outline" size={22} color="#8e44ad" />
                    <Text style={styles.indicadorValor}>
                      {totais.capitalTotal > 0 ? ((totais.lucroTotal / totais.capitalTotal) * 100).toFixed(1) + '%' : '0%'}
                    </Text>
                    <Text style={styles.indicadorLabel}>Rentabilidade</Text>
                  </View>
                  <View style={styles.indicadorCard}>
                    <Ionicons name="people-outline" size={22} color="#e67e22" />
                    <Text style={[styles.indicadorValor, { color: '#e67e22' }]}>{formatarMoeda(totais.comissaoTotal, moedaGlobal)}</Text>
                    <Text style={styles.indicadorLabel}>Comissões Pagas</Text>
                  </View>
                  <View style={styles.indicadorCard}>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#2ecc71" />
                    <Text style={[styles.indicadorValor, { color: '#2ecc71' }]}>{totais.qtdQuitados}</Text>
                    <Text style={styles.indicadorLabel}>Quitados</Text>
                  </View>
                  <View style={styles.indicadorCard}>
                    <Ionicons name="time-outline" size={22} color="#3498db" />
                    <Text style={[styles.indicadorValor, { color: '#3498db' }]}>{totais.qtdAtivos}</Text>
                    <Text style={styles.indicadorLabel}>Ativos</Text>
                  </View>
                  <View style={styles.indicadorCard}>
                    <Ionicons name="calculator-outline" size={22} color="#7f8c8d" />
                    <Text style={styles.indicadorValor}>{formatarMoeda(totais.lucroRecebido - totais.comissaoTotal, moedaGlobal)}</Text>
                    <Text style={styles.indicadorLabel}>Lucro Líquido</Text>
                  </View>
                </View>

                {resumoComissionados.length > 0 && (
                  <View style={styles.comissionadosCard}>
                    <View style={styles.comissionadosHeader}>
                      <Ionicons name="people" size={18} color="#8e44ad" />
                      <Text style={styles.comissionadosTitle}>Comissões por Parceiro</Text>
                    </View>
                    {resumoComissionados.map((com, idx) => (
                      <View key={idx} style={styles.comissionadoRow}>
                        <View style={styles.comissionadoAvatar}>
                          <Text style={styles.comissionadoAvatarText}>{com.nome[0].toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.comissionadoNome}>{com.nome}</Text>
                          <Text style={styles.comissionadoPago}>Pago: {formatarMoeda(com.totalPago, moedaGlobal)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.comissionadoAcordado}>{formatarMoeda(com.totalAcordado, moedaGlobal)}</Text>
                          <Text style={styles.comissionadoLabel}>acordado</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroLucrosBar}>
                  {(['TODOS', 'ATIVO', 'QUITADO'] as const).map(f => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFiltroLucros(f)}
                      style={[styles.filtroChip, filtroLucros === f && { backgroundColor: f === 'TODOS' ? '#2c3e50' : corStatus(f) }]}
                    >
                      <Text style={[styles.filtroChipText, filtroLucros === f && { color: '#fff' }]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {listaFiltrada.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#95a5a6', marginTop: 30 }}>Nenhum contrato encontrado.</Text>
                ) : (
                  listaFiltrada.map(c => {
                    const lucroP = calcularLucroPrevisto(c);
                    const lucroAR = calcularLucroAReceber(c);
                    const progressoPct = lucroP > 0 ? Math.min(c.jurosRecebidos / lucroP, 1) : 0;
                    return (
                      <View key={c.id} style={styles.empCard}>
                        <View style={styles.empCabecalho}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.empNome}>{c.nomeCliente}</Text>
                            {c.telefoneCliente ? (
                              <Text style={{ fontSize: 11, color: '#7f8c8d' }}>
                                <Ionicons name="logo-whatsapp" size={11} color="#25D366" /> {c.telefoneCliente}
                              </Text>
                            ) : null}
                          </View>
                          <View style={[styles.badgeStatus, { backgroundColor: corStatus(c.status) }]}>
                            <Text style={styles.badgeStatusText}>{c.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.empData}>
                          Emitido em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </Text>
                        <View style={styles.empGrid}>
                          <View style={styles.empGridItem}>
                            <Text style={styles.empGridLabel}>Capital</Text>
                            <Text style={[styles.empGridValor, { color: '#2980b9' }]}>{formatarMoeda(c.valor_principal, moedaGlobal)}</Text>
                          </View>
                          <View style={styles.empGridItem}>
                            <Text style={styles.empGridLabel}>Juros Rec.</Text>
                            <Text style={[styles.empGridValor, { color: '#27ae60' }]}>+ {formatarMoeda(c.jurosRecebidos, moedaGlobal)}</Text>
                          </View>
                          <View style={styles.empGridItem}>
                            <Text style={styles.empGridLabel}>Comissão</Text>
                            <Text style={[styles.empGridValor, { color: '#8e44ad' }]}>{formatarMoeda(c.comissoesPagas, moedaGlobal)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>

          <Modal visible={modalPdfLucrosVisivel} animationType="fade" transparent>
            <View style={styles.overlay}>
              <View style={styles.modalPdf}>
                {!mostrarFormCustomLucros ? (
                  <>
                    <Text style={styles.modalPdfTitle}>Exportar Relatório</Text>
                    <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDFLucros('HOJE')}><Text style={styles.btnPdfOptionText}>Hoje</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDFLucros('MES')}><Text style={styles.btnPdfOptionText}>Mês</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDFLucros('TUDO')}><Text style={styles.btnPdfOptionText}>Tudo</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnPdfCancel} onPress={() => setModalPdfLucrosVisivel(false)}><Text style={styles.btnPdfCancelText}>Fechar</Text></TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </Modal>
    );
  };

  if (!temPermissao(['DIRETOR', 'LANÇADOR'])) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed" size={80} color="#bdc3c7" />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#7f8c8d', marginTop: 20 }}>Acesso Restrito</Text>
        <Text style={{ fontSize: 14, color: '#bdc3c7', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }}>
          Seu perfil de Cadastrador não tem permissão para acessar o Caixa.
        </Text>
      </SafeAreaView>
    );
  }

  const listaCaixaFiltrada = listaCaixa; // Simplificado

  return (
    <SafeAreaView style={styles.container}>
      <ModalReciboProlabore visivel={modalReciboVisivel} onClose={() => setModalReciboVisivel(false)} usuarioAtual={usuarioAtual} />
      {renderModalLucros()}

      <FlatList
        data={listaCaixaFiltrada}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.headerSimples}>
              <View>
                <Text style={styles.labelSaldo}>Saldo Disponível ({moedaGlobal})</Text>
                <Text style={[styles.saldoText, { color: saldo >= 0 ? '#2ecc71' : '#e74c3c' }]}>{formatarMoeda(saldo, moedaGlobal)}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalPdfVisivel(true)}><Ionicons name="print" size={28} color="#3498db" /></TouchableOpacity>
            </View>

            {temPermissao(['DIRETOR']) && (
              <View style={styles.diretorAcoes}>
                <TouchableOpacity style={styles.btnAcaoDir} onPress={() => { setModalLucrosVisivel(true); carregarLucros(); }}>
                  <Ionicons name="trending-up" size={20} color="#fff" />
                  <Text style={styles.btnAcaoDirText}>Lucros</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAcaoDir, { backgroundColor: '#8e44ad' }]} onPress={() => setModalReciboVisivel(true)}>
                  <Ionicons name="receipt" size={20} color="#fff" />
                  <Text style={styles.btnAcaoDirText}>Recibos</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.form}>
              <Text style={styles.formTitle}>Lançamento Manual</Text>
              <View style={styles.rowTipos}>
                <TouchableOpacity style={[styles.tipoBtn, tipoLancamento === 'ENTRADA' && styles.tipoBtnAtivo]} onPress={() => setTipoLancamento('ENTRADA')}><Text>Entrada</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.tipoBtn, tipoLancamento === 'SAIDA' && styles.tipoBtnAtivo]} onPress={() => setTipoLancamento('SAIDA')}><Text>Saída</Text></TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="Valor" keyboardType="numeric" value={valor} onChangeText={setValor} />
              <TextInput style={styles.input} placeholder="Descrição" value={descricao} onChangeText={setDescricao} />
              <TouchableOpacity style={styles.btnLancar} onPress={handleLancarCaixa}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Lançar</Text></TouchableOpacity>
            </View>

            <Text style={styles.listaTitle}>Últimas Movimentações</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCaixa}>
            <Ionicons name={item.tipo === 'ENTRADA' ? 'arrow-up-circle' : 'arrow-down-circle'} size={24} color={item.tipo === 'ENTRADA' ? '#2ecc71' : '#e74c3c'} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.descricao}</Text>
              <Text style={{ fontSize: 12, color: '#7f8c8d' }}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
            </View>
            <Text style={{ fontWeight: 'bold', color: item.tipo === 'ENTRADA' ? '#2ecc71' : '#e74c3c' }}>{formatarMoeda(item.valor, moedaGlobal)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  headerSimples: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  labelSaldo: { fontSize: 12, color: '#7f8c8d', fontWeight: 'bold' },
  saldoText: { fontSize: 32, fontWeight: 'bold' },
  diretorAcoes: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btnAcaoDir: { flex: 1, backgroundColor: '#3498db', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnAcaoDirText: { color: '#fff', fontWeight: 'bold' },
  form: { backgroundColor: '#fff', padding: 16, borderRadius: 14, elevation: 2, marginBottom: 20 },
  formTitle: { fontWeight: 'bold', marginBottom: 12 },
  rowTipos: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tipoBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#f1f2f6', alignItems: 'center' },
  tipoBtnAtivo: { backgroundColor: '#dfe4ea' },
  input: { borderBottomWidth: 1, borderBottomColor: '#dfe4ea', padding: 10, marginBottom: 12 },
  btnLancar: { backgroundColor: '#2ecc71', padding: 14, borderRadius: 10, alignItems: 'center' },
  listaTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  itemCaixa: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, alignItems: 'center' },
  modalLucrosContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  modalLucrosHeader: { backgroundColor: '#8e44ad', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnVoltar: { padding: 4 },
  modalLucrosTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  btnPdfHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  cardLucroPrincipal: { backgroundColor: '#8e44ad', margin: 16, padding: 20, borderRadius: 16, elevation: 4 },
  cardLucroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  cardLucroValor: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  cardLucroRow: { flexDirection: 'row', marginTop: 10 },
  cardLucroMini: { flex: 1 },
  cardLucroMiniLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  cardLucroMiniValor: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  gridIndicadores: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  indicadorCard: { width: '45%', backgroundColor: '#fff', margin: '2.5%', padding: 15, borderRadius: 14, elevation: 2 },
  indicadorValor: { fontSize: 14, fontWeight: 'bold', marginVertical: 4 },
  indicadorLabel: { fontSize: 10, color: '#7f8c8d' },
  comissionadosCard: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 16, elevation: 2 },
  comissionadosHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  comissionadosTitle: { marginLeft: 8, fontWeight: 'bold', color: '#2c3e50' },
  comissionadoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  comissionadoAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f2f6', justifyContent: 'center', alignItems: 'center' },
  comissionadoAvatarText: { fontWeight: 'bold', color: '#8e44ad' },
  comissionadoNome: { fontWeight: 'bold', fontSize: 13 },
  comissionadoPago: { fontSize: 11, color: '#7f8c8d' },
  comissionadoAcordado: { fontWeight: 'bold', fontSize: 13, color: '#2c3e50' },
  comissionadoLabel: { fontSize: 9, color: '#bdc3c7', textTransform: 'uppercase' },
  filtroLucrosBar: { paddingHorizontal: 16, marginBottom: 15 },
  filtroChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#ecf0f1', marginRight: 8 },
  filtroChipText: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d' },
  empCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16, elevation: 2 },
  empCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  empNome: { fontWeight: 'bold', fontSize: 15 },
  badgeStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeStatusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  empData: { fontSize: 11, color: '#bdc3c7', marginTop: 4, marginBottom: 12 },
  empGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  empGridItem: { width: '33.33%', marginBottom: 10 },
  empGridLabel: { fontSize: 9, color: '#bdc3c7', textTransform: 'uppercase' },
  empGridValor: { fontSize: 12, fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalPdf: { backgroundColor: '#fff', width: '85%', padding: 20, borderRadius: 16 },
  modalPdfTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  btnPdfOption: { padding: 12, backgroundColor: '#f1f2f6', borderRadius: 10, marginBottom: 8 },
  btnPdfOptionText: { fontWeight: 'bold' },
  btnPdfCancel: { marginTop: 10, alignItems: 'center' },
  btnPdfCancelText: { color: '#e74c3c', fontWeight: 'bold' }
});
