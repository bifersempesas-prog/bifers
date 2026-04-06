import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoeda } from '../../hooks/useMoeda';
import { useClientes } from '../../hooks/useClientes';
import { supabase } from '../../lib/supabase';
import { useComissionados } from '../../hooks/useComissionados';

export default function ModalNovoEmprestimo({ visivel, onClose, onSuccess, clientePreSelecionado }: any) {
  const { moedaGlobal } = useMoeda();
  const { listarClientes } = useClientes();
  const { listarComissionados } = useComissionados();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSel, setClienteSel] = useState<any>(null);
  
  const tipoContrato = 'EMPRESTIMO'; 
  const [tipoJuros, setTipoJuros] = useState<'PERCENTUAL' | 'FIXO'>('PERCENTUAL');
  const [multa, setMulta] = useState('0.00');
  
  const [form, setForm] = useState({ valor: '', taxa: '', frequencia: 'SEMANAL' });
  const [prazo, setPrazo] = useState('1'); 
  const [garantia, setGarantia] = useState('');

  // NOVO: Estado para data de empréstimo manual (Padrão: Hoje)
  const [dataEmprestimoManual, setDataEmprestimoManual] = useState(() => new Date().toLocaleDateString('pt-BR'));

  const [diasCobrar, setDiasCobrar] = useState<number[]>([1, 2, 3, 4, 5]); 
  const [feriados, setFeriados] = useState<string[]>([]);
  const [feriadoInput, setFeriadoInput] = useState('');

  const [comissionados, setComissionados] = useState<any[]>([]);
  const [comissionadosSelecionados, setComissionadosSelecionados] = useState<any[]>([]);

  useEffect(() => {
    if (visivel) {
      if (clientePreSelecionado) {
        setClienteSel(clientePreSelecionado);
      } else {
        listarClientes().then(setClientes);
        setClienteSel(null);
      }
      listarComissionados().then(setComissionados);
      setComissionadosSelecionados([]); 
      setDataEmprestimoManual(new Date().toLocaleDateString('pt-BR')); // Reseta para hoje ao abrir
    }
  }, [visivel, clientePreSelecionado]);

  const toggleComissionado = (parceiro: any) => {
    if (comissionadosSelecionados.find(c => c.id === parceiro.id)) {
      setComissionadosSelecionados(prev => prev.filter(c => c.id !== parceiro.id));
    } else {
      setComissionadosSelecionados(prev => [...prev, { ...parceiro, valorDigitado: '0', tipoComissao: 'PERCENTUAL', obs: '' }]);
    }
  };

  const mudarTipoComissao = (id: string, tipo: 'PERCENTUAL' | 'FIXO') => {
    setComissionadosSelecionados(prev => prev.map(c => c.id === id ? { ...c, tipoComissao: tipo } : c));
  };

  const toggleDia = (dia: number) => {
    if (diasCobrar.includes(dia)) {
      setDiasCobrar(diasCobrar.filter(d => d !== dia));
    } else {
      setDiasCobrar([...diasCobrar, dia]);
    }
  };

  const addFeriado = () => {
    if (feriadoInput.length === 10) {
      setFeriados([...feriados, feriadoInput]);
      setFeriadoInput('');
    } else {
      Alert.alert('Formato', 'Use DD/MM/AAAA');
    }
  };

  const removeFeriado = (data: string) => {
    setFeriados(feriados.filter(f => f !== data));
  };

  const handleSalvar = async () => {
    if (!clienteSel || !form.valor || !form.taxa) return Alert.alert('Erro', 'Preencha tudo!');
    if (dataEmprestimoManual.length !== 10) return Alert.alert('Erro', 'Data de empréstimo inválida!');

    setLoading(true);
    const v = parseFloat(form.valor.replace(',', '.'));
    const t = parseFloat(form.taxa.replace(',', '.'));
    const vMulta = parseFloat(multa.replace(',', '.'));
    
    const valorTotalComJuros = tipoJuros === 'PERCENTUAL' ? v + (v * (t / 100)) : v + t;
    
    const valorTotalComissao = comissionadosSelecionados.reduce((acc, curr) => {
      let valorInd = parseFloat(curr.valorDigitado.replace(',', '.')) || 0;
      if (curr.tipoComissao === 'PERCENTUAL') {
        valorInd = v * (valorInd / 100); 
      }
      return acc + valorInd;
    }, 0);

    const numPrazo = parseInt(prazo) || 1;

    // CONVERSÃO DA DATA MANUAL PARA OBJETO DATE
    const [dia, mes, ano] = dataEmprestimoManual.split('/');
    const dataInicio = new Date(Number(ano), Number(mes) - 1, Number(dia), 12, 0, 0);
    const dataVencimento = new Date(dataInicio);

    if (form.frequencia === 'DIARIO') dataVencimento.setDate(dataInicio.getDate() + numPrazo);
    else if (form.frequencia === 'SEMANAL') dataVencimento.setDate(dataInicio.getDate() + (numPrazo * 7));
    else if (form.frequencia === 'QUINZENAL') dataVencimento.setDate(dataInicio.getDate() + (numPrazo * 15));
    else if (form.frequencia === 'MENSAL') dataVencimento.setMonth(dataInicio.getMonth() + numPrazo);

    const valorDaParcela = valorTotalComJuros / numPrazo;

    try {
      const { data: contrato, error: errC } = await supabase.from('contratos').insert([{
        cliente_id: clienteSel.id,
        valor_principal: v,
        saldo_devedor: valorTotalComJuros,
        taxa_juros: t,
        frequencia: form.frequencia,
        moeda: moedaGlobal,
        status: 'ATIVO',
        comissionado_id: comissionadosSelecionados.length > 0 ? comissionadosSelecionados[0].id : null, 
        valor_comissao_acordado: valorTotalComissao,
        obs_comissao: "Múltiplos comissionados (Ver Detalhes)", 
        data_emprestimo: dataInicio.toISOString(), // <--- AGORA USA A DATA MANUAL
        data_vencimento: dataVencimento.toISOString(),
        garantia: garantia,
        tipo_contrato: tipoContrato,
        tipo_juros: tipoJuros,
        multa_diaria: vMulta,
        dias_cobrar: form.frequencia === 'DIARIO' ? diasCobrar : null,
        feriados: form.frequencia === 'DIARIO' ? feriados : null,
        comissionados_detalhes: comissionadosSelecionados,
        quantidade_parcelas: numPrazo, 
        valor_parcela: valorDaParcela  
      }]).select().single();

      if (errC) throw errC;

      const { data: mov, error: errMov } = await supabase.from('movimentacoes_contrato').insert({
        contrato_id: contrato.id,
        tipo_acao: 'EMPRESTIMO',
        valor_recebido: 0,
        lucro_registrado: 0,
        capital_recuperado: 0,
        comissao_paga: 0,
        created_at: dataInicio.toISOString() // <--- COMISSÃO SÓ É REGISTRADA NO PAGAMENTO
      }).select().single();

      if (errMov) throw errMov;

      const { error: errCaixa } = await supabase.from('fluxo_pessoal').insert({
        tipo: 'SAIDA',
        valor: v,
        moeda: moedaGlobal,
        descricao: `Empréstimo para ${clienteSel.nome}`,
        movimentacao_id: mov.id,
        created_at: dataInicio.toISOString() // <--- CAIXA TAMBÉM SEGUE A DATA MANUAL
      });

      if (errCaixa) throw errCaixa;

      Alert.alert('Sucesso!', `Contrato gerado com sucesso!`);
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro no Banco', e.message || 'Ocorreu um erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <Text style={styles.title}>Novo Contrato</Text>
            
            {clientePreSelecionado ? (
              <View style={styles.clienteFixoContainer}>
                <Text style={styles.label}>Cliente:</Text>
                <Text style={styles.nomeClienteFixo}>{clientePreSelecionado.nome}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Pasta do Cliente:</Text>
                <ScrollView horizontal style={{maxHeight: 50, marginBottom: 15}}>
                  {clientes.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.chip, clienteSel?.id === c.id && styles.chipAtivo]} onPress={() => setClienteSel(c)}>
                      <Text style={{color: clienteSel?.id === c.id ? '#fff' : '#7f8c8d'}}>{c.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* CAMPO NOVO: DATA DO EMPRÉSTIMO */}
            <Text style={styles.label}>Data do Empréstimo:</Text>
            <TextInput 
              placeholder="DD/MM/AAAA" 
              style={styles.input} 
              keyboardType="numeric" 
              value={dataEmprestimoManual} 
              onChangeText={(t) => {
                let text = t.replace(/\D/g, '');
                if (text.length > 2) text = text.replace(/(\d{2})(\d)/, '$1/$2');
                if (text.length > 5) text = text.replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
                setDataEmprestimoManual(text.substring(0, 10));
              }} 
            />

            <Text style={styles.label}>Valor Principal ({moedaGlobal}):</Text>
            <TextInput placeholder="Ex: 1000" style={styles.input} keyboardType="numeric" value={form.valor} onChangeText={v => setForm({...form, valor: v})} />

            <Text style={styles.label}>Tipo de Juros</Text>
            <View style={styles.segmentContainer}>
              <TouchableOpacity style={[styles.segmentBtn, tipoJuros === 'PERCENTUAL' && styles.segmentBtnAtivoAzul]} onPress={() => setTipoJuros('PERCENTUAL')}>
                <Text style={[styles.segmentText, tipoJuros === 'PERCENTUAL' && styles.segmentTextAtivo]}>Porcentagem (%)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, tipoJuros === 'FIXO' && styles.segmentBtnAtivoAzul]} onPress={() => setTipoJuros('FIXO')}>
                <Text style={[styles.segmentText, tipoJuros === 'FIXO' && styles.segmentTextAtivo]}>Valor Fixo ($)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 10}}>
                <Text style={styles.label}>{tipoJuros === 'PERCENTUAL' ? 'Taxa (%)' : 'Juros ($)'}</Text>
                <TextInput placeholder={tipoJuros === 'PERCENTUAL' ? "20" : "200"} style={styles.input} keyboardType="numeric" value={form.taxa} onChangeText={t => setForm({...form, taxa: t})} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Multa Diária</Text>
                <TextInput placeholder="0.00" style={styles.input} keyboardType="numeric" value={multa} onChangeText={setMulta} />
              </View>
            </View>

            <Text style={styles.label}>Modalidade</Text>
            <View style={styles.row}>
              {['DIARIO', 'SEMANAL', 'QUINZENAL', 'MENSAL'].map(f => (
                <TouchableOpacity key={f} style={[styles.fBtn, form.frequencia === f && styles.fBtnAtivo]} onPress={() => setForm({...form, frequencia: f})}>
                  <Text style={{color: form.frequencia === f ? '#fff' : '#7f8c8d', fontSize: 12, fontWeight: 'bold'}}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dinamicoContainer}>
              {form.frequencia === 'DIARIO' && (
                <>
                  <Text style={styles.label}>Quantos dias?</Text>
                  <TextInput placeholder="Ex: 25" style={styles.input} keyboardType="numeric" value={prazo} onChangeText={setPrazo} />
                  
                  <Text style={styles.label}>Quais dias cobrar?</Text>
                  <View style={styles.diasContainer}>
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((letra, index) => (
                      <TouchableOpacity key={index} style={[styles.diaCircle, diasCobrar.includes(index) && styles.diaCircleAtivo]} onPress={() => toggleDia(index)}>
                        <Text style={{color: diasCobrar.includes(index) ? '#fff' : '#7f8c8d', fontWeight: 'bold'}}>{letra}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Pular Datas Específicas (Feriados):</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TextInput 
                      placeholder="DD/MM/AAAA" 
                      style={[styles.input, {flex: 1, marginBottom: 0}]} 
                      keyboardType="numeric" 
                      value={feriadoInput}
                      onChangeText={(t) => {
                        let text = t.replace(/\D/g, '');
                        if (text.length > 2) text = text.replace(/(\d{2})(\d)/, '$1/$2');
                        if (text.length > 5) text = text.replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
                        setFeriadoInput(text.substring(0, 10));
                      }} 
                    />
                    <TouchableOpacity style={styles.btnAddFeriado} onPress={addFeriado}>
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 15}}>
                    {feriados.map(f => (
                      <TouchableOpacity key={f} style={styles.feriadoChip} onPress={() => removeFeriado(f)}>
                        <Text style={{color: '#fff', fontSize: 12}}>{f}  ✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {form.frequencia === 'SEMANAL' && (
                <>
                  <Text style={styles.label}>Quantas Semanas?</Text>
                  <TextInput placeholder="Ex: 4" style={styles.input} keyboardType="numeric" value={prazo} onChangeText={setPrazo} />
                </>
              )}

              {form.frequencia === 'QUINZENAL' && (
                <>
                  <Text style={styles.label}>Quantas Quinzenas?</Text>
                  <TextInput placeholder="Ex: 2" style={styles.input} keyboardType="numeric" value={prazo} onChangeText={setPrazo} />
                </>
              )}

              {form.frequencia === 'MENSAL' && (
                <>
                  <Text style={styles.label}>Quantos Meses?</Text>
                  <TextInput placeholder="Ex: 1" style={styles.input} keyboardType="numeric" value={prazo} onChangeText={setPrazo} />
                </>
              )}
            </View>

            <Text style={styles.label}>Garantia:</Text>
            <TextInput placeholder="Ex: Documento de Carro, Celular..." style={styles.input} value={garantia} onChangeText={setGarantia} />

            <Text style={styles.label}>Comissões (Selecione um ou mais):</Text>
            <ScrollView horizontal style={{maxHeight: 50, marginBottom: 10}}>
              {comissionados.map(c => {
                const selecionado = comissionadosSelecionados.find(item => item.id === c.id);
                return (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.chip, selecionado && styles.chipAtivoAzulEscuro]} 
                    onPress={() => toggleComissionado(c)}
                  >
                    <Text style={{color: selecionado ? '#fff' : '#7f8c8d'}}>{c.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {comissionadosSelecionados.length > 0 && (
              <View style={styles.comissaoBox}>
                <Text style={styles.labelMini}>Defina o valor e observação para cada parceiro:</Text>
                {comissionadosSelecionados.map((item, index) => (
                  <View key={item.id} style={styles.parceiroCard}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                      <Text style={{fontWeight: 'bold', color: '#2c3e50'}}>{item.nome}</Text>
                      <TouchableOpacity onPress={() => toggleComissionado(item)}><Ionicons name="trash" size={18} color="#e74c3c" /></TouchableOpacity>
                    </View>

                    <View style={styles.segmentContainerMini}>
                      <TouchableOpacity 
                        style={[styles.segmentBtnMini, item.tipoComissao === 'PERCENTUAL' && styles.segmentBtnMiniAtivo]} 
                        onPress={() => mudarTipoComissao(item.id, 'PERCENTUAL')}
                      >
                        <Text style={[styles.segmentTextMini, item.tipoComissao === 'PERCENTUAL' && styles.segmentTextMiniAtivo]}>Porcentagem (%)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.segmentBtnMini, item.tipoComissao === 'FIXO' && styles.segmentBtnMiniAtivo]} 
                        onPress={() => mudarTipoComissao(item.id, 'FIXO')}
                      >
                        <Text style={[styles.segmentTextMini, item.tipoComissao === 'FIXO' && styles.segmentTextMiniAtivo]}>Fixo ($)</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput 
                      style={styles.inputMini} 
                      keyboardType="numeric" 
                      placeholder={item.tipoComissao === 'PERCENTUAL' ? "Ex: 10 (para 10%)" : "Ex: 150 (para R$ 150)"}
                      value={item.valorDigitado} 
                      onChangeText={(txt) => {
                        const novaLista = [...comissionadosSelecionados];
                        novaLista[index].valorDigitado = txt;
                        setComissionadosSelecionados(novaLista);
                      }} 
                    />
                    <TextInput 
                      style={styles.inputMini} 
                      placeholder="Obs: (Ex: Indicação / Sociedade)"
                      value={item.obs} 
                      onChangeText={(txt) => {
                        const novaLista = [...comissionadosSelecionados];
                        novaLista[index].obs = txt;
                        setComissionadosSelecionados(novaLista);
                      }} 
                    />
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSalvarText}>CONFIRMAR EMPRÉSTIMO</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onClose} style={{padding: 10}}>
              <Text style={{color: '#95a5a6', textAlign: 'center', marginTop: 5, fontSize: 16}}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modal: { backgroundColor: '#fff', margin: 15, borderRadius: 15, padding: 20, maxHeight: '92%', elevation: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#2c3e50' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495e', marginBottom: 8 },
  labelMini: { fontSize: 12, color: '#7f8c8d', marginBottom: 5 },
  
  segmentContainer: { flexDirection: 'row', backgroundColor: '#f0f3f5', borderRadius: 8, padding: 4, marginBottom: 15 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  segmentBtnAtivo: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1} },
  segmentBtnAtivoAzul: { backgroundColor: '#3498db', elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: 'bold', color: '#95a5a6' },
  segmentTextAtivo: { color: '#2c3e50' },

  segmentContainerMini: { flexDirection: 'row', backgroundColor: '#ecf0f1', borderRadius: 6, padding: 2, marginBottom: 8 },
  segmentBtnMini: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 4 },
  segmentBtnMiniAtivo: { backgroundColor: '#34495e', elevation: 1 },
  segmentTextMini: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d' },
  segmentTextMiniAtivo: { color: '#fff' },
  
  clienteFixoContainer: { marginBottom: 20, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#3498db' },
  nomeClienteFixo: { fontSize: 18, fontWeight: 'bold', color: '#3498db' },
  chip: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#ecf0f1', borderRadius: 20, marginRight: 8, height: 40, justifyContent: 'center' },
  chipAtivo: { backgroundColor: '#3498db' },
  chipAtivoAzulEscuro: { backgroundColor: '#2c3e50' },
  
  input: { borderWidth: 1, borderColor: '#ecf0f1', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, color: '#2c3e50', backgroundColor: '#fff' },
  inputMini: { borderWidth: 1, borderColor: '#ecf0f1', borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 5, backgroundColor: '#fff' },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f0f3f5', marginHorizontal: 2, borderRadius: 8 },
  fBtnAtivo: { backgroundColor: '#bdc3c7' },
  
  dinamicoContainer: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 15 },
  
  diasContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  diaCircle: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#ecf0f1', justifyContent: 'center', alignItems: 'center' },
  diaCircleAtivo: { backgroundColor: '#3498db' },
  
  btnAddFeriado: { backgroundColor: '#3498db', height: 48, width: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  feriadoChip: { backgroundColor: '#e74c3c', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, marginRight: 5, marginBottom: 5 },

  comissaoBox: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 10, marginBottom: 15 },
  parceiroCard: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ecf0f1' },

  btnSalvar: { backgroundColor: '#2ecc71', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});