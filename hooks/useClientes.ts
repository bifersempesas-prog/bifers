import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useMoeda } from './useMoeda'; // IMPORTANTE: Trazendo o contexto da moeda

export interface Contrato {
  id: string;
  cliente_id: string;
  valor_principal: number;
  saldo_devedor: number;
  moeda: 'BRL' | 'USD';
  taxa_juros: number;
  frequencia: 'DIARIO' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
  data_vencimento: string;
  status: 'ATIVO' | 'QUITADO' | 'INADIMPLENTE';
}

export const useClientes = () => {
  const { moedaGlobal } = useMoeda(); // Pega se estamos em BRL ou USD no painel
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // 1. LISTAR CLIENTES (Filtrado pela moeda ativa)
  // ==========================================
  const listarClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('moeda', moedaGlobal) // O Segredo: Só traz clientes da moeda atual
      .order('nome', { ascending: true });

    setLoading(false);
    if (error) {
      setError(error.message);
      return [];
    }
    return data;
  };

  // ==========================================
  // 2. CADASTRAR APENAS CLIENTE (Sem empréstimo ainda)
  // ==========================================
  const cadastrarCliente = async (nome: string, telefone: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ 
        nome, 
        telefone, 
        moeda: moedaGlobal // O cliente já nasce amarrado à moeda selecionada no app
      }])
      .select()
      .single();

    setLoading(false);
    if (error) {
      setError(error.message);
      return { sucesso: false, error: error.message };
    }
    return { sucesso: true, cliente: data };
  };

  // ==========================================
  // FUNÇÃO AUXILIAR: CALCULAR VENCIMENTO
  // ==========================================
  const calcularVencimento = (frequencia: string) => {
    const data = new Date();
    if (frequencia === 'DIARIO') data.setDate(data.getDate() + 1);
    if (frequencia === 'SEMANAL') data.setDate(data.getDate() + 7);
    if (frequencia === 'QUINZENAL') data.setDate(data.getDate() + 15);
    if (frequencia === 'MENSAL') data.setMonth(data.getMonth() + 1);
    return data.toISOString();
  };

  // ==========================================
  // 3. LÓGICA DE CRIAÇÃO (CLIENTE + CONTRATO + CAIXA)
  // ==========================================
  const criarEmprestimo = async (dados: {
    nome: string;
    telefone: string;
    valor: number;
    taxa: number;
    frequencia: string;
    moeda: 'BRL' | 'USD';
  }) => {
    setLoading(true);
    setError(null);

    try {
      // A. Criar Cliente (Agora incluindo a moeda!)
      const { data: cliente, error: erroCliente } = await supabase
        .from('clientes')
        .insert({ 
          nome: dados.nome, 
          telefone: dados.telefone,
          moeda: dados.moeda // Garante que o cliente seja criado no lado certo
        })
        .select()
        .single();
      
      if (erroCliente) throw new Error('Erro ao criar cliente: ' + erroCliente.message);

      // B. Criar Contrato
      const vencimento = calcularVencimento(dados.frequencia);
      const { data: contrato, error: erroContrato } = await supabase
        .from('contratos')
        .insert({
          cliente_id: cliente.id,
          valor_principal: dados.valor,
          saldo_devedor: dados.valor,
          moeda: dados.moeda,
          taxa_juros: dados.taxa,
          frequencia: dados.frequencia,
          data_emprestimo: new Date().toISOString(),
          data_vencimento: vencimento,
          status: 'ATIVO'
        })
        .select()
        .single();
        
      if (erroContrato) throw new Error('Erro ao criar contrato: ' + erroContrato.message);

      // C. Registrar a Movimentação (Para Histórico e Relatórios)
      const { data: movimentacao, error: erroMov } = await supabase
        .from('movimentacoes_contrato')
        .insert({
          contrato_id: contrato.id,
          tipo_acao: 'CRIACAO',
          valor_recebido: 0,
          lucro_registrado: 0,
          capital_recuperado: 0
        })
        .select()
        .single();
        
      if (erroMov) throw new Error('Erro ao registrar movimentação');

      // D. Debitar do Fluxo de Caixa Pessoal (SAÍDA)
      const { error: erroCaixa } = await supabase
        .from('fluxo_pessoal')
        .insert({
          tipo: 'SAIDA',
          valor: dados.valor,
          moeda: dados.moeda,
          descricao: `Empréstimo concedido a ${dados.nome}`,
          movimentacao_id: movimentacao.id
        });
        
      if (erroCaixa) throw new Error('Erro ao registrar saída de caixa');

      return { sucesso: true };
    } catch (err: any) {
      setError(err.message);
      return { sucesso: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. EDIÇÃO E EXCLUSÃO DE CLIENTES
  // ==========================================
  const editarCliente = async (id: string, nome: string, telefone: string) => {
    setLoading(true);
    const { error } = await supabase.from('clientes').update({ nome, telefone }).eq('id', id);
    setLoading(false);
    if (error) { setError(error.message); return { sucesso: false, error: error.message }; }
    return { sucesso: true };
  };

  const excluirCliente = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    setLoading(false);
    if (error) { setError(error.message); return { sucesso: false, error: error.message }; }
    return { sucesso: true };
  };

  // ==========================================
  // 5. EDIÇÃO E EXCLUSÃO DE COMISSIONADOS
  // ==========================================
  const editarComissionado = async (id: string, nome: string, valor_padrao: number, tipo_padrao: string) => {
    setLoading(true);
    const { error } = await supabase.from('comissionados').update({ nome, valor_padrao, tipo_padrao }).eq('id', id);
    setLoading(false);
    if (error) { setError(error.message); return { sucesso: false, error: error.message }; }
    return { sucesso: true };
  };

  const excluirComissionado = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from('comissionados').delete().eq('id', id);
    setLoading(false);
    if (error) { setError(error.message); return { sucesso: false, error: error.message }; }
    return { sucesso: true };
  };

  // Exportando todas as funções para as telas poderem usar
  return { 
    loading, 
    error, 
    criarEmprestimo, 
    listarClientes, 
    cadastrarCliente,
    editarCliente,
    excluirCliente,
    editarComissionado,
    excluirComissionado
  };
};