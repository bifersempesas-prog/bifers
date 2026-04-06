import React, { useState, useEffect, useCallback } from 'react';
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

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type PeriodoPDF = 'TUDO' | 'HOJE' | 'MES' | 'CUSTOM';
type TipoLancamento = 'ENTRADA' | 'SAIDA';

interface EmprestimoItem {
  id: string;
  devedor_nome: string;
  valor_principal: number;
  valor_total: number;
  juros_percentual: number;
  parcelas_total: number;
  parcelas_pagas: number;
  status: string;         // 'ATIVO' | 'QUITADO' | 'ATRASADO'
  created_at: string;
  moeda: string;
  // Campos opcionais que podem existir na sua tabela
  comissao_percentual?: number;
  descricao?: string;
}

export default function CaixaScreen() {
  const { moedaGlobal } = useMoeda();

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
  const [listaEmprestimos, setListaEmprestimos] = useState<EmprestimoItem[]>([]);
  const [loadingLucros, setLoadingLucros] = useState(false);
  const [filtroLucros, setFiltroLucros] = useState<'TODOS' | 'ATIVO' | 'QUITADO' | 'ATRASADO'>('TODOS');
  const [modalPdfLucrosVisivel, setModalPdfLucrosVisivel] = useState(false);
  const [mostrarFormCustomLucros, setMostrarFormCustomLucros] = useState(false);
  const [dataInicioLucros, setDataInicioLucros] = useState('');
  const [dataFimLucros, setDataFimLucros] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // CAIXA — carga de dados
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // LUCROS / COMISSÕES — carga de dados
  // ─────────────────────────────────────────────────────────────────────────
  const carregarLucros = async () => {
    setLoadingLucros(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('moeda', moedaGlobal)
        .order('created_at', { ascending: false });

      if (error) console.error('Erro ao buscar empréstimos:', error);
      if (data) setListaEmprestimos(data as EmprestimoItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLucros(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarSaldo();
    }, [moedaGlobal])
  );

  useEffect(() => { carregarSaldo(); }, [moedaGlobal]);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const formatarData = (text: string, setFunc: (v: string) => void) => {
    let t = text.replace(/\D/g, '');
    if (t.length > 2) t = t.replace(/(\d{2})(\d)/, '$1/$2');
    if (t.length > 5) t = t.replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    setFunc(t.substring(0, 10));
  };

  // Lucro = valor total pago esperado − capital emprestado
  const calcularLucroEmprestimo = (emp: EmprestimoItem): number => {
    const totalEsperado = Number(emp.valor_total) || 0;
    const principal = Number(emp.valor_principal) || 0;
    return totalEsperado - principal;
  };

  // Lucro já recebido = proporção de parcelas pagas
  const calcularLucroRecebido = (emp: EmprestimoItem): number => {
    const lucroTotal = calcularLucroEmprestimo(emp);
    const pagas = Number(emp.parcelas_pagas) || 0;
    const total = Number(emp.parcelas_total) || 1;
    return (lucroTotal / total) * pagas;
  };

  // Comissão (se houver campo comissao_percentual)
  const calcularComissao = (emp: EmprestimoItem): number => {
    const perc = Number(emp.comissao_percentual) || 0;
    return (Number(emp.valor_principal) * perc) / 100;
  };

  // Totais consolidados
  const totaisLucros = useCallback(() => {
    const lista = listaEmprestimos.filter(e => e.moeda === moedaGlobal);
    return lista.reduce(
      (acc, emp) => {
        acc.capitalTotal += Number(emp.valor_principal) || 0;
        acc.lucroTotal += calcularLucroEmprestimo(emp);
        acc.lucroRecebido += calcularLucroRecebido(emp);
        acc.comissaoTotal += calcularComissao(emp);
        acc.qtdAtivos += emp.status === 'ATIVO' ? 1 : 0;
        acc.qtdQuitados += emp.status === 'QUITADO' ? 1 : 0;
        acc.qtdAtrasados += emp.status === 'ATRASADO' ? 1 : 0;
        return acc;
      },
      { capitalTotal: 0, lucroTotal: 0, lucroRecebido: 0, comissaoTotal: 0, qtdAtivos: 0, qtdQuitados: 0, qtdAtrasados: 0 }
    );
  }, [listaEmprestimos, moedaGlobal]);

  const listaEmpFiltrada = listaEmprestimos.filter(e => {
    if (filtroLucros === 'TODOS') return true;
    return e.status === filtroLucros;
  });

  const corStatus = (s: string) => {
    if (s === 'ATIVO') return '#3498db';
    if (s === 'QUITADO') return '#2ecc71';
    if (s === 'ATRASADO') return '#e74c3c';
    return '#95a5a6';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LANÇAR NO CAIXA
  // ─────────────────────────────────────────────────────────────────────────
  const handleLancarCaixa = async () => {
    if (!valor) return Alert.alert('Erro', 'Digite um valor!');
    if (dataLancamento.length !== 10) return Alert.alert('Erro', 'Digite uma data completa (DD/MM/AAAA)');

    const valorTratado = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorTratado) || valorTratado <= 0) return Alert.alert('Erro', 'Valor inválido!');

    const [dia, mes, ano] = dataLancamento.split('/');
    const dataFinalParaBanco = new Date(Number(ano), Number(mes) - 1, Number(dia), new Date().getHours(), new Date().getMinutes());

    const { error } = await supabase.from('fluxo_pessoal').insert([{
      tipo: tipoLancamento,
      valor: valorTratado,
      moeda: moedaGlobal,
      descricao: descricao || (tipoLancamento === 'ENTRADA' ? 'Aporte / Adição de Saldo' : 'Retirada / Despesa'),
      created_at: dataFinalParaBanco.toISOString(),
    }]);

    if (error) {
      Alert.alert('Erro no Banco', error.message);
    } else {
      Alert.alert('Sucesso', `Lançamento salvo no caixa de ${moedaGlobal}!`);
      setValor('');
      setDescricao('');
      setDataLancamento(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      carregarSaldo();
    }
  };

  const deletarLancamento = (id: string) => {
    Alert.alert('Excluir Lançamento', 'Deseja realmente apagar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await supabase.from('fluxo_pessoal').delete().eq('id', id);
          carregarSaldo();
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FILTRO LISTA CAIXA
  // ─────────────────────────────────────────────────────────────────────────
  const listaFiltrada = listaCaixa.filter(item => {
    if (filtroPeriodo === 'TUDO') return true;
    const dataItem = new Date(item.created_at);
    const hoje = new Date();
    if (filtroPeriodo === 'HOJE') {
      return dataItem.getDate() === hoje.getDate() && dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
    }
    if (filtroPeriodo === 'MES') {
      return dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PDF — CAIXA
  // ─────────────────────────────────────────────────────────────────────────
  const gerarPDF = async (periodoEscolhido: PeriodoPDF) => {
    let startDate: Date = new Date(), endDate: Date = new Date();
    let tituloPeriodo: string = periodoEscolhido;

    if (periodoEscolhido === 'CUSTOM') {
      if (dataInicio.length !== 10 || dataFim.length !== 10)
        return Alert.alert('Erro', 'Preencha as datas completamente (DD/MM/AAAA).');
      const [d1, m1, y1] = dataInicio.split('/');
      const [d2, m2, y2] = dataFim.split('/');
      startDate = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
      endDate = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
        return Alert.alert('Erro', 'Data inválida.');
      tituloPeriodo = `${dataInicio} a ${dataFim}`;
    }

    setModalPdfVisivel(false);
    setMostrarFormCustom(false);
    setLoading(true);

    const listaParaPDF = listaCaixa.filter(item => {
      if (periodoEscolhido === 'TUDO') return true;
      const dataItem = new Date(item.created_at);
      const hoje = new Date();
      if (periodoEscolhido === 'HOJE') return dataItem.toDateString() === hoje.toDateString();
      if (periodoEscolhido === 'MES') return dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
      if (periodoEscolhido === 'CUSTOM') return dataItem >= startDate && dataItem <= endDate;
      return true;
    });

    const saldoDoPeriodo = listaParaPDF.reduce((acc, curr) => {
      const v = Number(curr.valor) || 0;
      return curr.tipo === 'ENTRADA' ? acc + v : acc - v;
    }, 0);

    const html = gerarHTMLCaixa(listaParaPDF, saldoDoPeriodo, tituloPeriodo);

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Relatorio_Caixa_${moedaGlobal}.pdf` });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar ou compartilhar o PDF.');
    } finally {
      setLoading(false);
    }
  };

  const gerarHTMLCaixa = (lista: any[], saldoPeriodo: number, titulo: string) => `
    <html><head><style>
      body{font-family:Helvetica,sans-serif;padding:20px;color:#2c3e50}
      .header{text-align:center;border-bottom:2px solid #3498db;padding-bottom:20px;margin-bottom:30px}
      h1{color:#3498db;font-size:22px;text-transform:uppercase;margin-bottom:4px}
      .info{color:#7f8c8d;font-size:13px;margin:2px 0}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ecf0f1;padding:11px 13px;text-align:left;font-size:12px}
      th{background:#f8f9fa;color:#34495e;font-weight:bold;text-transform:uppercase}
      tr:nth-child(even){background:#fcfcfc}
      .entrada{color:#2ecc71;font-weight:bold}
      .saida{color:#e74c3c;font-weight:bold}
      .total{margin-top:30px;text-align:right;background:#f8f9fa;padding:20px;border-radius:8px;border-left:5px solid #3498db}
      .total-label{font-size:15px;color:#7f8c8d}
      .total-value{font-size:22px;font-weight:bold;color:#2c3e50;display:block;margin-top:4px}
      .footer{margin-top:40px;text-align:center;font-size:10px;color:#bdc3c7;border-top:1px solid #ecf0f1;padding-top:10px}
    </style></head><body>
      <div class="header">
        <h1>Relatório de Caixa — Bifers</h1>
        <p class="info"><strong>Moeda:</strong> ${moedaGlobal}</p>
        <p class="info"><strong>Período:</strong> ${titulo}</p>
        <p class="info"><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>
      <table>
        <thead><tr><th width="20%">Data e Hora</th><th width="45%">Descrição</th><th width="15%">Tipo</th><th width="20%">Valor</th></tr></thead>
        <tbody>
          ${lista.map(item => `
            <tr>
              <td>${new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              <td>${item.descricao || '-'}</td>
              <td class="${item.tipo === 'ENTRADA' ? 'entrada' : 'saida'}">${item.tipo}</td>
              <td style="font-weight:bold;text-align:right">${item.tipo === 'ENTRADA' ? '+' : '-'} ${formatarMoeda(item.valor, moedaGlobal)}</td>
            </tr>`).join('')}
          ${lista.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:30px;color:#95a5a6">Nenhuma movimentação neste período.</td></tr>' : ''}
        </tbody>
      </table>
      <div class="total">
        <span class="total-label">Movimentação Líquida do Período:</span>
        <span class="total-value">${formatarMoeda(saldoPeriodo, moedaGlobal)}</span>
        <span style="font-size:11px;color:#95a5a6;display:block;margin-top:4px">Saldo total geral disponível: ${formatarMoeda(saldo, moedaGlobal)}</span>
      </div>
      <div class="footer">Documento gerado automaticamente por Bifers.</div>
    </body></html>`;

  // ─────────────────────────────────────────────────────────────────────────
  // PDF — LUCROS / COMISSÕES
  // ─────────────────────────────────────────────────────────────────────────
  const gerarPDFLucros = async (periodoEscolhido: PeriodoPDF) => {
    let startDate: Date = new Date(), endDate: Date = new Date();
    let tituloPeriodo: string = periodoEscolhido;

    if (periodoEscolhido === 'CUSTOM') {
      if (dataInicioLucros.length !== 10 || dataFimLucros.length !== 10)
        return Alert.alert('Erro', 'Preencha as datas completamente (DD/MM/AAAA).');
      const [d1, m1, y1] = dataInicioLucros.split('/');
      const [d2, m2, y2] = dataFimLucros.split('/');
      startDate = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
      endDate = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
        return Alert.alert('Erro', 'Data inválida.');
      tituloPeriodo = `${dataInicioLucros} a ${dataFimLucros}`;
    }

    setModalPdfLucrosVisivel(false);
    setMostrarFormCustomLucros(false);
    setLoadingLucros(true);

    const hoje = new Date();
    const listaParaPDF = listaEmprestimos.filter(item => {
      if (periodoEscolhido === 'TUDO') return true;
      const dataItem = new Date(item.created_at);
      if (periodoEscolhido === 'HOJE') return dataItem.toDateString() === hoje.toDateString();
      if (periodoEscolhido === 'MES') return dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
      if (periodoEscolhido === 'CUSTOM') return dataItem >= startDate && dataItem <= endDate;
      return true;
    });

    // Calcular totais do período
    const totaisPeriodo = listaParaPDF.reduce((acc, emp) => {
      acc.capital += Number(emp.valor_principal) || 0;
      acc.lucroTotal += calcularLucroEmprestimo(emp);
      acc.lucroRecebido += calcularLucroRecebido(emp);
      acc.comissao += calcularComissao(emp);
      return acc;
    }, { capital: 0, lucroTotal: 0, lucroRecebido: 0, comissao: 0 });

    const html = `
    <html><head><style>
      body{font-family:Helvetica,sans-serif;padding:20px;color:#2c3e50;font-size:13px}
      .header{text-align:center;border-bottom:3px solid #8e44ad;padding-bottom:18px;margin-bottom:28px}
      h1{color:#8e44ad;font-size:20px;text-transform:uppercase;margin-bottom:4px}
      .info{color:#7f8c8d;font-size:12px;margin:2px 0}
      .cards{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap}
      .card{flex:1;min-width:130px;background:#f8f9fa;border-radius:8px;padding:14px;border-top:4px solid #8e44ad;text-align:center}
      .card-label{font-size:11px;color:#7f8c8d;text-transform:uppercase;margin-bottom:6px}
      .card-value{font-size:18px;font-weight:bold;color:#2c3e50}
      .card-value.verde{color:#27ae60}
      .card-value.azul{color:#2980b9}
      .card-value.laranja{color:#e67e22}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ecf0f1;padding:10px 12px;text-align:left;font-size:11px}
      th{background:#f0eaf6;color:#6c3483;font-weight:bold;text-transform:uppercase}
      tr:nth-child(even){background:#fcfcfc}
      .status{display:inline-block;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:bold;color:#fff}
      .s-ativo{background:#2980b9}
      .s-quitado{background:#27ae60}
      .s-atrasado{background:#c0392b}
      .num{text-align:right;font-weight:bold}
      .lucro{color:#27ae60}
      .capital{color:#2980b9}
      .comissao{color:#e67e22}
      .summary{margin-top:24px;background:#f8f9fa;border-radius:8px;padding:18px;border-left:5px solid #8e44ad}
      .summary-title{font-size:14px;font-weight:bold;color:#6c3483;margin-bottom:14px}
      .summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #ecf0f1;font-size:13px}
      .summary-row:last-child{border-bottom:none;font-size:15px;font-weight:bold;color:#2c3e50}
      .footer{margin-top:36px;text-align:center;font-size:10px;color:#bdc3c7;border-top:1px solid #ecf0f1;padding-top:10px}
    </style></head><body>
      <div class="header">
        <h1>Relatório de Lucros e Comissões — Bifers</h1>
        <p class="info"><strong>Moeda:</strong> ${moedaGlobal} &nbsp;|&nbsp; <strong>Período:</strong> ${tituloPeriodo}</p>
        <p class="info"><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>

      <!-- CARDS RESUMO -->
      <div class="cards">
        <div class="card">
          <div class="card-label">Capital Emprestado</div>
          <div class="card-value azul">${formatarMoeda(totaisPeriodo.capital, moedaGlobal)}</div>
        </div>
        <div class="card">
          <div class="card-label">Lucro Previsto Total</div>
          <div class="card-value verde">${formatarMoeda(totaisPeriodo.lucroTotal, moedaGlobal)}</div>
        </div>
        <div class="card">
          <div class="card-label">Lucro Já Recebido</div>
          <div class="card-value verde">${formatarMoeda(totaisPeriodo.lucroRecebido, moedaGlobal)}</div>
        </div>
        <div class="card">
          <div class="card-label">Total de Contratos</div>
          <div class="card-value">${listaParaPDF.length}</div>
        </div>
      </div>

      <!-- TABELA DETALHADA -->
      <table>
        <thead>
          <tr>
            <th>Devedor</th>
            <th>Data</th>
            <th>Capital</th>
            <th>Juros %</th>
            <th>Lucro Previsto</th>
            <th>Lucro Recebido</th>
            <th>Parcelas</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${listaParaPDF.map(emp => {
            const lucroT = calcularLucroEmprestimo(emp);
            const lucroR = calcularLucroRecebido(emp);
            const pagas = Number(emp.parcelas_pagas) || 0;
            const total = Number(emp.parcelas_total) || 0;
            return `
            <tr>
              <td><strong>${emp.devedor_nome || '-'}</strong></td>
              <td>${new Date(emp.created_at).toLocaleDateString('pt-BR')}</td>
              <td class="num capital">${formatarMoeda(emp.valor_principal, moedaGlobal)}</td>
              <td class="num">${(Number(emp.juros_percentual) || 0).toFixed(1)}%</td>
              <td class="num lucro">+ ${formatarMoeda(lucroT, moedaGlobal)}</td>
              <td class="num lucro">+ ${formatarMoeda(lucroR, moedaGlobal)}</td>
              <td style="text-align:center">${pagas}/${total}</td>
              <td><span class="status s-${(emp.status || '').toLowerCase()}">${emp.status || '-'}</span></td>
            </tr>`;
          }).join('')}
          ${listaParaPDF.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:28px;color:#95a5a6">Nenhum empréstimo neste período.</td></tr>' : ''}
        </tbody>
      </table>

      <!-- SUMÁRIO FINANCEIRO -->
      <div class="summary">
        <div class="summary-title">Resumo Financeiro do Período</div>
        <div class="summary-row">
          <span>Total de Capital Emprestado</span>
          <span style="color:#2980b9;font-weight:bold">${formatarMoeda(totaisPeriodo.capital, moedaGlobal)}</span>
        </div>
        <div class="summary-row">
          <span>Lucro Previsto (juros totais)</span>
          <span style="color:#27ae60;font-weight:bold">+ ${formatarMoeda(totaisPeriodo.lucroTotal, moedaGlobal)}</span>
        </div>
        <div class="summary-row">
          <span>Lucro Já Recebido (parcelas pagas)</span>
          <span style="color:#27ae60;font-weight:bold">+ ${formatarMoeda(totaisPeriodo.lucroRecebido, moedaGlobal)}</span>
        </div>
        <div class="summary-row">
          <span>Lucro a Receber (pendente)</span>
          <span style="color:#e67e22;font-weight:bold">+ ${formatarMoeda(totaisPeriodo.lucroTotal - totaisPeriodo.lucroRecebido, moedaGlobal)}</span>
        </div>
        <div class="summary-row">
          <span>Retorno Total Esperado (capital + juros)</span>
          <span>${formatarMoeda(totaisPeriodo.capital + totaisPeriodo.lucroTotal, moedaGlobal)}</span>
        </div>
      </div>

      <div class="footer">Documento gerado automaticamente por Bifers — Administração Financeira.</div>
    </body></html>`;

    const htmlFinal = html;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlFinal, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Relatorio_Lucros_${moedaGlobal}.pdf` });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar ou compartilhar o PDF.');
    } finally {
      setLoadingLucros(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — MODAL LUCROS
  // ─────────────────────────────────────────────────────────────────────────
  const totais = totaisLucros();

  const renderModalLucros = () => (
    <Modal visible={modalLucrosVisivel} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.modalLucrosContainer}>

        {/* Cabeçalho */}
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

          {/* Cards de Resumo */}
          {loadingLucros ? (
            <ActivityIndicator color="#8e44ad" size="large" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Card principal */}
              <View style={styles.cardLucroPrincipal}>
                <Text style={styles.cardLucroLabel}>Lucro Total Previsto</Text>
                <Text style={styles.cardLucroValor}>
                  {formatarMoeda(totais.lucroTotal, moedaGlobal)}
                </Text>
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

              {/* Grid de indicadores */}
              <View style={styles.gridIndicadores}>
                <View style={styles.indicadorCard}>
                  <Ionicons name="cash-outline" size={22} color="#2980b9" />
                  <Text style={styles.indicadorValor}>{formatarMoeda(totais.capitalTotal, moedaGlobal)}</Text>
                  <Text style={styles.indicadorLabel}>Capital Total Emprestado</Text>
                </View>
                <View style={styles.indicadorCard}>
                  <Ionicons name="trending-up-outline" size={22} color="#8e44ad" />
                  <Text style={styles.indicadorValor}>
                    {totais.capitalTotal > 0 ? ((totais.lucroTotal / totais.capitalTotal) * 100).toFixed(1) + '%' : '0%'}
                  </Text>
                  <Text style={styles.indicadorLabel}>Rentabilidade Média</Text>
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
                  <Ionicons name="alert-circle-outline" size={22} color="#e74c3c" />
                  <Text style={[styles.indicadorValor, { color: '#e74c3c' }]}>{totais.qtdAtrasados}</Text>
                  <Text style={styles.indicadorLabel}>Atrasados</Text>
                </View>
                <View style={styles.indicadorCard}>
                  <Ionicons name="document-outline" size={22} color="#7f8c8d" />
                  <Text style={styles.indicadorValor}>{listaEmprestimos.length}</Text>
                  <Text style={styles.indicadorLabel}>Total de Contratos</Text>
                </View>
              </View>

              {/* Filtro de status */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroLucrosBar}>
                {(['TODOS', 'ATIVO', 'QUITADO', 'ATRASADO'] as const).map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFiltroLucros(f)}
                    style={[styles.filtroChip, filtroLucros === f && { backgroundColor: corStatus(f) === '#95a5a6' ? '#2c3e50' : corStatus(f) }]}
                  >
                    <Text style={[styles.filtroChipText, filtroLucros === f && { color: '#fff' }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lista de empréstimos */}
              {listaEmpFiltrada.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#95a5a6', marginTop: 30 }}>Nenhum empréstimo encontrado.</Text>
              ) : (
                listaEmpFiltrada.map(emp => {
                  const lucroT = calcularLucroEmprestimo(emp);
                  const lucroR = calcularLucroRecebido(emp);
                  const pagas = Number(emp.parcelas_pagas) || 0;
                  const total = Number(emp.parcelas_total) || 1;
                  const progressoPct = total > 0 ? (pagas / total) : 0;

                  return (
                    <View key={emp.id} style={styles.empCard}>
                      {/* Linha 1: Nome + Status */}
                      <View style={styles.empCabecalho}>
                        <Text style={styles.empNome}>{emp.devedor_nome || 'Devedor'}</Text>
                        <View style={[styles.badgeStatus, { backgroundColor: corStatus(emp.status) }]}>
                          <Text style={styles.badgeStatusText}>{emp.status}</Text>
                        </View>
                      </View>

                      {/* Linha 2: Data */}
                      <Text style={styles.empData}>
                        Emitido em {new Date(emp.created_at).toLocaleDateString('pt-BR')}
                        {emp.descricao ? `  •  ${emp.descricao}` : ''}
                      </Text>

                      {/* Grid de valores */}
                      <View style={styles.empGrid}>
                        <View style={styles.empGridItem}>
                          <Text style={styles.empGridLabel}>Capital</Text>
                          <Text style={[styles.empGridValor, { color: '#2980b9' }]}>
                            {formatarMoeda(emp.valor_principal, moedaGlobal)}
                          </Text>
                        </View>
                        <View style={styles.empGridItem}>
                          <Text style={styles.empGridLabel}>Juros</Text>
                          <Text style={styles.empGridValor}>{(Number(emp.juros_percentual) || 0).toFixed(1)}%</Text>
                        </View>
                        <View style={styles.empGridItem}>
                          <Text style={styles.empGridLabel}>Lucro Previsto</Text>
                          <Text style={[styles.empGridValor, { color: '#27ae60' }]}>
                            + {formatarMoeda(lucroT, moedaGlobal)}
                          </Text>
                        </View>
                        <View style={styles.empGridItem}>
                          <Text style={styles.empGridLabel}>Lucro Recebido</Text>
                          <Text style={[styles.empGridValor, { color: '#27ae60' }]}>
                            + {formatarMoeda(lucroR, moedaGlobal)}
                          </Text>
                        </View>
                        <View style={styles.empGridItem}>
                          <Text style={styles.empGridLabel}>A Receber</Text>
                          <Text style={[styles.empGridValor, { color: '#e67e22' }]}>
                            + {formatarMoeda(lucroT - lucroR, moedaGlobal)}
                          </Text>
                        </View>
                        <View style={styles.empGridItem}>
                          <Text style={styles.empGridLabel}>Retorno Total</Text>
                          <Text style={styles.empGridValor}>
                            {formatarMoeda(Number(emp.valor_principal) + lucroT, moedaGlobal)}
                          </Text>
                        </View>
                      </View>

                      {/* Barra de progresso das parcelas */}
                      <View style={styles.progressoContainer}>
                        <View style={styles.progressoInfo}>
                          <Text style={styles.progressoText}>Parcelas: {pagas}/{total}</Text>
                          <Text style={styles.progressoText}>{(progressoPct * 100).toFixed(0)}% recebido</Text>
                        </View>
                        <View style={styles.progressoBar}>
                          <View style={[styles.progressoFill, { width: `${progressoPct * 100}%` as any, backgroundColor: corStatus(emp.status) }]} />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {/* Modal PDF de Lucros */}
        <Modal visible={modalPdfLucrosVisivel} animationType="fade" transparent>
          <View style={styles.overlay}>
            <View style={styles.modalPdf}>
              {!mostrarFormCustomLucros ? (
                <>
                  <Text style={styles.modalPdfTitle}>Exportar Relatório</Text>
                  <Text style={styles.modalPdfSub}>Escolha o período para o relatório de lucros</Text>
                  <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDFLucros('HOJE')}>
                    <Ionicons name="today-outline" size={20} color="#8e44ad" />
                    <Text style={styles.btnPdfOptionText}>Apenas Hoje</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDFLucros('MES')}>
                    <Ionicons name="calendar-outline" size={20} color="#8e44ad" />
                    <Text style={styles.btnPdfOptionText}>Este Mês</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPdfOption} onPress={() => setMostrarFormCustomLucros(true)}>
                    <Ionicons name="calendar" size={20} color="#8e44ad" />
                    <Text style={styles.btnPdfOptionText}>Período Específico</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDFLucros('TUDO')}>
                    <Ionicons name="layers-outline" size={20} color="#8e44ad" />
                    <Text style={styles.btnPdfOptionText}>Todo o Histórico</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPdfCancel} onPress={() => setModalPdfLucrosVisivel(false)}>
                    <Text style={styles.btnPdfCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalPdfTitle}>Período Específico</Text>
                  <Text style={styles.modalPdfSub}>Data de início e fim</Text>
                  <TextInput style={styles.inputData} placeholder="Data Início (DD/MM/AAAA)" keyboardType="numeric" value={dataInicioLucros} onChangeText={(t) => formatarData(t, setDataInicioLucros)} />
                  <TextInput style={styles.inputData} placeholder="Data Fim (DD/MM/AAAA)" keyboardType="numeric" value={dataFimLucros} onChangeText={(t) => formatarData(t, setDataFimLucros)} />
                  <TouchableOpacity style={[styles.btnPdfOption, { backgroundColor: '#8e44ad', justifyContent: 'center' }]} onPress={() => gerarPDFLucros('CUSTOM')}>
                    <Text style={[styles.btnPdfOptionText, { color: '#fff', marginLeft: 0 }]}>GERAR RELATÓRIO</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPdfCancel} onPress={() => setMostrarFormCustomLucros(false)}>
                    <Text style={styles.btnPdfCancelText}>Voltar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </Modal>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Modal PDF Caixa */}
      <Modal visible={modalPdfVisivel} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalPdf}>
            {!mostrarFormCustom ? (
              <>
                <Text style={styles.modalPdfTitle}>Exportar PDF</Text>
                <Text style={styles.modalPdfSub}>Qual período você deseja no relatório?</Text>
                <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDF('HOJE')}>
                  <Ionicons name="today-outline" size={20} color="#3498db" />
                  <Text style={styles.btnPdfOptionText}>Apenas Hoje</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDF('MES')}>
                  <Ionicons name="calendar-outline" size={20} color="#3498db" />
                  <Text style={styles.btnPdfOptionText}>Este Mês</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPdfOption} onPress={() => setMostrarFormCustom(true)}>
                  <Ionicons name="calendar" size={20} color="#3498db" />
                  <Text style={styles.btnPdfOptionText}>Período Específico</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPdfOption} onPress={() => gerarPDF('TUDO')}>
                  <Ionicons name="layers-outline" size={20} color="#3498db" />
                  <Text style={styles.btnPdfOptionText}>Todo o Histórico</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPdfCancel} onPress={() => setModalPdfVisivel(false)}>
                  <Text style={styles.btnPdfCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalPdfTitle}>Período Específico</Text>
                <Text style={styles.modalPdfSub}>Digite a data de início e fim</Text>
                <TextInput style={styles.inputData} placeholder="Data Início (Ex: 01/01/2026)" keyboardType="numeric" value={dataInicio} onChangeText={(t) => formatarData(t, setDataInicio)} />
                <TextInput style={styles.inputData} placeholder="Data Fim (Ex: 31/01/2026)" keyboardType="numeric" value={dataFim} onChangeText={(t) => formatarData(t, setDataFim)} />
                <TouchableOpacity style={[styles.btnPdfOption, { backgroundColor: '#3498db', justifyContent: 'center' }]} onPress={() => gerarPDF('CUSTOM')}>
                  <Text style={[styles.btnPdfOptionText, { color: '#fff', marginLeft: 0 }]}>GERAR RELATÓRIO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPdfCancel} onPress={() => setMostrarFormCustom(false)}>
                  <Text style={styles.btnPdfCancelText}>Voltar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Lucros */}
      {renderModalLucros()}

      <FlatList
        data={listaFiltrada}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Meu Caixa ({moedaGlobal})</Text>
            <Text style={styles.subtitle}>Gerencie o dinheiro disponível para empréstimos</Text>

            {/* Saldo */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Saldo Disponível</Text>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saldoText}>
                  {moedaGlobal === 'BRL' ? 'R$' : '$'} {saldo.toFixed(2)}
                </Text>
              )}
            </View>

            {/* ── BOTÃO DE LUCROS / COMISSÕES ── */}
            <TouchableOpacity
              style={styles.btnLucros}
              onPress={() => {
                setModalLucrosVisivel(true);
                carregarLucros();
              }}
            >
              <View style={styles.btnLucrosLeft}>
                <Ionicons name="trending-up" size={28} color="#fff" />
                <View style={{ marginLeft: 14 }}>
                  <Text style={styles.btnLucrosTitulo}>Lucros & Comissões</Text>
                  <Text style={styles.btnLucrosSubtitulo}>Ver relatório detalhado por empréstimo</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Formulário de lançamento */}
            <View style={styles.form}>
              <Text style={styles.label}>Novo Lançamento Manual:</Text>
              <View style={styles.rowTipos}>
                <TouchableOpacity style={[styles.btnTipo, tipoLancamento === 'ENTRADA' && styles.btnTipoEntrada]} onPress={() => setTipoLancamento('ENTRADA')}>
                  <Text style={{ color: tipoLancamento === 'ENTRADA' ? '#fff' : '#2c3e50', fontWeight: 'bold' }}>+ Receita</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnTipo, tipoLancamento === 'SAIDA' && styles.btnTipoSaida]} onPress={() => setTipoLancamento('SAIDA')}>
                  <Text style={{ color: tipoLancamento === 'SAIDA' ? '#fff' : '#2c3e50', fontWeight: 'bold' }}>- Despesa</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={styles.labelMini}>Data do Lançamento:</Text>
                <TextInput style={styles.inputDescricao} placeholder="DD/MM/AAAA" keyboardType="numeric" value={dataLancamento} onChangeText={(t) => formatarData(t, setDataLancamento)} />
              </View>
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.labelMini}>Descrição:</Text>
                <TextInput style={styles.inputDescricao} placeholder="Ex: Aporte, Gasolina..." value={descricao} onChangeText={setDescricao} />
              </View>
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.labelMini}>Valor:</Text>
                <TextInput style={styles.input} placeholder="Ex: 5000" keyboardType="numeric" value={valor} onChangeText={setValor} />
              </View>

              <TouchableOpacity style={[styles.btnAdicionar, { backgroundColor: tipoLancamento === 'ENTRADA' ? '#3498db' : '#e74c3c' }]} onPress={handleLancarCaixa}>
                <Ionicons name={tipoLancamento === 'ENTRADA' ? 'add-circle' : 'remove-circle'} size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>LANÇAR NO CAIXA</Text>
              </TouchableOpacity>
            </View>

            {/* Barra de filtros */}
            <View style={styles.filterBar}>
              <Text style={{ fontWeight: 'bold', color: '#2c3e50', marginRight: 10 }}>Filtro:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                <TouchableOpacity onPress={() => setFiltroPeriodo('HOJE')} style={[styles.filterChip, filtroPeriodo === 'HOJE' && styles.filterChipAtivo]}>
                  <Text style={[styles.filterText, filtroPeriodo === 'HOJE' && styles.filterTextAtivo]}>Hoje</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFiltroPeriodo('MES')} style={[styles.filterChip, filtroPeriodo === 'MES' && styles.filterChipAtivo]}>
                  <Text style={[styles.filterText, filtroPeriodo === 'MES' && styles.filterTextAtivo]}>Este Mês</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFiltroPeriodo('TUDO')} style={[styles.filterChip, filtroPeriodo === 'TUDO' && styles.filterChipAtivo]}>
                  <Text style={[styles.filterText, filtroPeriodo === 'TUDO' && styles.filterTextAtivo]}>Tudo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setMostrarFormCustom(false); setModalPdfVisivel(true); }}
                  style={[styles.filterChip, { backgroundColor: '#34495e', flexDirection: 'row', alignItems: 'center' }]}
                >
                  <Ionicons name="document-text" size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>PDF</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const valorFormatado = Number(item.valor) || 0;
          return (
            <View style={styles.historyItem}>
              <Ionicons name={item.tipo === 'ENTRADA' ? 'arrow-up-circle' : 'arrow-down-circle'} size={36} color={item.tipo === 'ENTRADA' ? '#2ecc71' : '#e74c3c'} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyDesc}>{item.descricao}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={[styles.historyValor, { color: item.tipo === 'ENTRADA' ? '#2ecc71' : '#e74c3c' }]}>
                  {item.tipo === 'ENTRADA' ? '+' : '-'} {moedaGlobal} {valorFormatado.toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => deletarLancamento(item.id)} style={styles.btnDelete}>
                  <Ionicons name="trash" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#95a5a6', marginTop: 20 }}>Nenhuma movimentação neste período.</Text>
        }
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginTop: 20 },
  subtitle: { fontSize: 14, color: '#7f8c8d', marginBottom: 20 },
  card: { backgroundColor: '#2ecc71', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3, marginBottom: 14 },
  cardTitle: { color: '#fff', fontSize: 16, opacity: 0.9, marginBottom: 5 },
  saldoText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },

  // Botão Lucros
  btnLucros: {
    backgroundColor: '#8e44ad',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnLucrosLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  btnLucrosTitulo: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  btnLucrosSubtitulo: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  form: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 20 },
  label: { fontSize: 16, color: '#34495e', fontWeight: 'bold', marginBottom: 15 },
  labelMini: { fontSize: 12, color: '#7f8c8d', marginBottom: 5, fontWeight: 'bold' },
  rowTipos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  btnTipo: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#ecf0f1', marginHorizontal: 5 },
  btnTipoEntrada: { backgroundColor: '#2ecc71' },
  btnTipoSaida: { backgroundColor: '#e74c3c' },
  inputDescricao: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  input: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, fontSize: 18 },
  btnAdicionar: { padding: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  filterBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#ecf0f1', marginRight: 8 },
  filterChipAtivo: { backgroundColor: '#3498db' },
  filterText: { color: '#7f8c8d', fontSize: 12, fontWeight: 'bold' },
  filterTextAtivo: { color: '#fff' },

  historyItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  historyInfo: { flex: 1, marginLeft: 15 },
  historyDesc: { fontWeight: 'bold', fontSize: 15, color: '#2c3e50' },
  historyDate: { fontSize: 11, color: '#95a5a6', marginTop: 2 },
  historyRight: { alignItems: 'flex-end', flexDirection: 'row' },
  historyValor: { fontWeight: 'bold', fontSize: 16 },
  btnDelete: { marginLeft: 10, padding: 5, backgroundColor: '#fbeee6', borderRadius: 5 },

  // Modal PDF
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalPdf: { width: '85%', backgroundColor: '#fff', borderRadius: 15, padding: 25, elevation: 10 },
  modalPdfTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginBottom: 5 },
  modalPdfSub: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  btnPdfOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f3f5', padding: 15, borderRadius: 10, marginBottom: 10 },
  btnPdfOptionText: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginLeft: 10 },
  btnPdfCancel: { marginTop: 10, padding: 10 },
  btnPdfCancelText: { color: '#e74c3c', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  inputData: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, textAlign: 'center', backgroundColor: '#f9f9f9', color: '#2c3e50' },

  // Modal Lucros
  modalLucrosContainer: { flex: 1, backgroundColor: '#f4f6f9' },
  modalLucrosHeader: {
    backgroundColor: '#8e44ad', paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  btnVoltar: { padding: 4 },
  modalLucrosTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  btnPdfHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },

  cardLucroPrincipal: {
    margin: 16, backgroundColor: '#6c3483', borderRadius: 18, padding: 22,
    elevation: 6, shadowColor: '#6c3483', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  cardLucroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 6 },
  cardLucroValor: { color: '#fff', fontSize: 34, fontWeight: 'bold', marginBottom: 16 },
  cardLucroRow: { flexDirection: 'row' },
  cardLucroMini: { flex: 1, paddingLeft: 12 },
  cardLucroMiniLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 },
  cardLucroMiniValor: { fontSize: 17, fontWeight: 'bold' },

  gridIndicadores: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 8 },
  indicadorCard: {
    width: '30%', margin: '1.6%', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center', elevation: 2,
  },
  indicadorValor: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginVertical: 4 },
  indicadorLabel: { fontSize: 10, color: '#95a5a6', textAlign: 'center' },

  filtroLucrosBar: { paddingHorizontal: 16, marginBottom: 14 },
  filtroChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#ecf0f1', marginRight: 8 },
  filtroChipText: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d' },

  empCard: {
    marginHorizontal: 16, marginBottom: 14, backgroundColor: '#fff',
    borderRadius: 14, padding: 18, elevation: 2,
  },
  empCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  empNome: { fontSize: 17, fontWeight: 'bold', color: '#2c3e50', flex: 1 },
  badgeStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeStatusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  empData: { fontSize: 11, color: '#95a5a6', marginBottom: 14 },

  empGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  empGridItem: { width: '33.33%', marginBottom: 10, paddingRight: 8 },
  empGridLabel: { fontSize: 10, color: '#95a5a6', marginBottom: 2 },
  empGridValor: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },

  progressoContainer: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  progressoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressoText: { fontSize: 11, color: '#7f8c8d' },
  progressoBar: { height: 6, backgroundColor: '#ecf0f1', borderRadius: 3, overflow: 'hidden' },
  progressoFill: { height: '100%', borderRadius: 3 },
});