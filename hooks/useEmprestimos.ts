import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useMoeda } from './useMoeda';
import { Alert } from 'react-native'; // <-- Adicionado para mostrar o erro na tela

export const useEmprestimos = () => {
  const { moedaGlobal } = useMoeda();
  const [loading, setLoading] = useState(false);
  const [contratos, setContratos] = useState<any[]>([]);
  
  const [totais, setTotais] = useState({ 
    emprestado: 0, receber: 0, ativo: 0, lucro: 0, comissao: 0 
  });

  const carregarDados = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data: clientes, error: errCli } = await supabase
        .from('clientes')
        .select('*')
        .eq('moeda', moedaGlobal)
        .order('nome', { ascending: true });

      if (errCli) throw errCli;

      const { data: todosContratos } = await supabase
        .from('contratos')
        .select('*')
        .eq('moeda', moedaGlobal);

      const { data: dataMovs } = await supabase
        .from('movimentacoes_contrato')
        .select('valor_juros_pago, comissao_paga, contrato_id!inner(moeda)')
        .eq('contrato_id.moeda', moedaGlobal);

      const listaParaWallet: any[] = [];
      let tEmprestado = 0; let tReceber = 0; let cAtivo = 0;

      clientes?.forEach(cliente => {
        const contratosDoCliente = todosContratos?.filter(c => c.cliente_id === cliente.id) || [];

        if (contratosDoCliente.length > 0) {
          contratosDoCliente.forEach(c => {
            tEmprestado += Number(c.valor_principal) || 0;
            tReceber += Number(c.saldo_devedor) || 0;
            if (c.status !== 'QUITADO') cAtivo += Number(c.valor_principal) || 0;

            listaParaWallet.push({
              ...c,
              clientes: { nome: cliente.nome, telefone: cliente.telefone }
            });
          });
        } else {
          listaParaWallet.push({
            id: `vazio-${cliente.id}`,
            cliente_id: cliente.id,
            valor_principal: 0,
            saldo_devedor: 0,
            status: 'SEM_CONTRATO',
            moeda: cliente.moeda,
            clientes: { nome: cliente.nome, telefone: cliente.telefone }
          });
        }
      });

      setContratos(listaParaWallet);

      // SOMA O LUCRO PARA O DASHBOARD (Garantindo que leia como número)
      const totalLucro = dataMovs?.reduce((acc, curr) => acc + (Number(curr.valor_juros_pago) || 0), 0) || 0;
      const totalComissao = dataMovs?.reduce((acc, curr) => acc + (Number(curr.comissao_paga) || 0), 0) || 0;

      setTotais({ 
        emprestado: tEmprestado, 
        receber: tReceber, 
        ativo: cAtivo, 
        lucro: totalLucro, 
        comissao: totalComissao 
      });

    } catch (e: any) {
      console.error("Erro na Carteira:", e.message);
    } finally {
      setLoading(false);
    }
  }, [moedaGlobal]);

  // NOVO: Adicionado o parâmetro opcional dataPagamentoManual
  const registrarPagamento = async (contrato: any, valorPago: number, jurosPagos: number = 0, comissao: number = 0, dataPagamentoManual?: string) => {
    setLoading(true);
    try {
      // 1. GARANTIA DE NÚMEROS (Evita que o banco trave por causa de texto)
      const vPago = Number(valorPago) || 0;
      const vJuros = Number(jurosPagos) || 0;
      const vComissao = Number(comissao) || 0;

      if (vPago <= 0) {
        throw new Error("O valor pago precisa ser maior que zero!");
      }

      // CONVERSÃO DA DATA MANUAL (SE EXISTIR) PARA O FORMATO DO BANCO DE DADOS
      let dataFinal = new Date().toISOString();
      if (dataPagamentoManual) {
        const [d, m, y] = dataPagamentoManual.split('/');
        dataFinal = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0).toISOString();
      }

      const novoSaldo = contrato.saldo_devedor - vPago;
      const statusAt = novoSaldo <= 0 ? 'QUITADO' : 'ATIVO';

      // 2. ATUALIZA O SALDO DO CONTRATO
      const { error: errUpdate } = await supabase
        .from('contratos')
        .update({ saldo_devedor: novoSaldo < 0 ? 0 : novoSaldo, status: statusAt })
        .eq('id', contrato.id);
        
      if (errUpdate) throw new Error(`Erro ao atualizar contrato: ${errUpdate.message}`);

      // 3. REGISTRA A MOVIMENTAÇÃO (Para aparecer no Dashboard de Lucro e Comissões)
      const { data: mov, error: errMov } = await supabase.from('movimentacoes_contrato').insert({
        contrato_id: contrato.id, 
        tipo_acao: 'PAGAMENTO', 
        valor_recebido: vPago,
        valor_juros_pago: vJuros, 
        lucro_registrado: vJuros, 
        capital_recuperado: vPago - vJuros,
        comissao_paga: vComissao,
        created_at: dataFinal // <-- SALVA COM A DATA ESCOLHIDA
      }).select().single();

      if (errMov) throw new Error(`Erro na Movimentação: ${errMov.message}`);

      // 4. LANÇA NO CAIXA AUTOMATICAMENTE
      const { error: errCaixa } = await supabase.from('fluxo_pessoal').insert({ 
        tipo: 'ENTRADA', 
        valor: vPago, 
        moeda: contrato.moeda, 
        descricao: `Pagamento: ${contrato.clientes?.nome || 'Cliente'} (#${contrato.numero_contrato || contrato.id.substring(0,4)})`, 
        movimentacao_id: mov.id,
        created_at: dataFinal // <-- SALVA COM A DATA ESCOLHIDA
      });

      if (errCaixa) throw new Error(`Erro no Caixa: ${errCaixa.message}`);

      // Atualiza a tela automaticamente
      await carregarDados(); 
      return { sucesso: true };

    } catch (error: any) {
      console.error(error);
      // O ALERTA FORÇADO: Isso vai mostrar na sua tela o que o Supabase recusou!
      Alert.alert("Erro ao Processar Pagamento", error.message);
      return { sucesso: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // --- NOVAS FUNÇÕES ADICIONADAS ---

  const deletarContrato = async (id: string) => {
    Alert.alert(
      "Excluir Empréstimo",
      "Deseja realmente apagar este registro? Isso não pode ser desfeito.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.from('contratos').delete().eq('id', id);
              if (error) throw error;
              await carregarDados();
            } catch (e: any) {
              Alert.alert("Erro ao excluir", e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const atualizarContrato = async (id: string, novosDados: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('contratos').update(novosDados).eq('id', id);
      if (error) throw error;
      await carregarDados();
      return { sucesso: true };
    } catch (e: any) {
      Alert.alert("Erro ao atualizar", e.message);
      return { sucesso: false };
    } finally {
      setLoading(false);
    }
  };

  return { 
    contratos, 
    totais, 
    loading, 
    carregarDados, 
    registrarPagamento, 
    deletarContrato, 
    atualizarContrato 
  };
};