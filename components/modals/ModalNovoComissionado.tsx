import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoeda } from '../../hooks/useMoeda';
import { useClientes } from '../../hooks/useClientes';
import { supabase } from '../../lib/supabase';

interface Props {
  visivel: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dadosParaEditar?: any | null;
}

export default function ModalNovoComissionado({ visivel, onClose, onSuccess, dadosParaEditar }: Props) {
  const { moedaGlobal } = useMoeda();
  const { editarComissionado, loading } = useClientes();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'PERCENTUAL' | 'FIXO'>('PERCENTUAL');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const modoEdicao = !!dadosParaEditar;

  // Preenche os campos ao abrir em modo edição
  useEffect(() => {
    if (visivel) {
      if (dadosParaEditar) {
        setNome(dadosParaEditar.nome || '');
        setTipo(dadosParaEditar.tipo_padrao || 'PERCENTUAL');
        setValor(String(dadosParaEditar.valor_padrao || ''));
      } else {
        setNome('');
        setTipo('PERCENTUAL');
        setValor('');
      }
    }
  }, [visivel, dadosParaEditar]);

  const handleSalvar = async () => {
    if (!nome.trim() || !valor.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios!');
      return;
    }

    const valorNum = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      Alert.alert('Atenção', 'Digite um valor de comissão válido!');
      return;
    }

    setSalvando(true);

    let res;
    if (modoEdicao) {
      res = await editarComissionado(dadosParaEditar.id, nome.trim(), valorNum, tipo);
    } else {
      const { error } = await supabase.from('comissionados').insert([{
        nome: nome.trim(),
        tipo_padrao: tipo,
        valor_padrao: valorNum,
        moeda: moedaGlobal,
        ativo: true,
      }]);
      res = error ? { sucesso: false, error: error.message } : { sucesso: true };
    }

    setSalvando(false);

    if (res?.sucesso) {
      Alert.alert('Sucesso', modoEdicao ? 'Parceiro atualizado com sucesso!' : 'Parceiro cadastrado com sucesso!');
      onSuccess();
      onClose();
    } else {
      Alert.alert('Erro', res?.error || 'Não foi possível salvar o parceiro.');
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name={modoEdicao ? 'create' : 'briefcase'} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>
                {modoEdicao ? 'Editar Parceiro' : 'Novo Parceiro'}
              </Text>
              <Text style={styles.subtitle}>
                {modoEdicao
                  ? `Atualizando dados de ${dadosParaEditar?.nome}`
                  : `Parceiro será cadastrado em ${moedaGlobal}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.btnFechar}>
              <Ionicons name="close" size={22} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 20 }}>
            {/* Campo Nome */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Parceiro *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="briefcase-outline" size={18} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  placeholder="Ex: Carlos Indicador"
                  placeholderTextColor="#bdc3c7"
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Tipo de Comissão */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Comissão Padrão *</Text>
              <View style={styles.tipoRow}>
                <TouchableOpacity
                  style={[styles.btnTipo, tipo === 'PERCENTUAL' && styles.btnTipoAtivo]}
                  onPress={() => setTipo('PERCENTUAL')}
                >
                  <Ionicons
                    name="trending-up-outline"
                    size={16}
                    color={tipo === 'PERCENTUAL' ? '#fff' : '#7f8c8d'}
                  />
                  <Text style={[styles.btnTipoText, tipo === 'PERCENTUAL' && styles.btnTipoTextAtivo]}>
                    Porcentagem (%)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnTipo, tipo === 'FIXO' && styles.btnTipoAtivo, { marginLeft: 8 }]}
                  onPress={() => setTipo('FIXO')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={tipo === 'FIXO' ? '#fff' : '#7f8c8d'}
                  />
                  <Text style={[styles.btnTipoText, tipo === 'FIXO' && styles.btnTipoTextAtivo]}>
                    Valor Fixo ($)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Campo Valor */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {tipo === 'PERCENTUAL' ? 'Percentual de Comissão (%)' : 'Valor Fixo por Contrato'} *
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name={tipo === 'PERCENTUAL' ? 'percent-outline' : 'logo-usd'}
                  size={18}
                  color="#f39c12"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder={tipo === 'PERCENTUAL' ? 'Ex: 10' : 'Ex: 50'}
                  placeholderTextColor="#bdc3c7"
                  style={styles.input}
                  keyboardType="numeric"
                  value={valor}
                  onChangeText={setValor}
                />
                <Text style={styles.inputSuffix}>
                  {tipo === 'PERCENTUAL' ? '%' : moedaGlobal}
                </Text>
              </View>
            </View>

            {/* Preview da comissão */}
            {valor.length > 0 && !isNaN(parseFloat(valor)) && (
              <View style={styles.previewCard}>
                <Ionicons name="information-circle-outline" size={16} color="#3498db" />
                <Text style={styles.previewText}>
                  {tipo === 'PERCENTUAL'
                    ? `Este parceiro receberá ${valor}% do valor de cada empréstimo`
                    : `Este parceiro receberá ${moedaGlobal} ${valor} fixo por empréstimo`}
                </Text>
              </View>
            )}

            {/* Botões */}
            <TouchableOpacity
              style={[styles.btnSalvar, modoEdicao && styles.btnEditar, { marginTop: 24 }]}
              onPress={handleSalvar}
              disabled={salvando || loading}
            >
              {salvando || loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={modoEdicao ? 'checkmark-circle' : 'briefcase'} size={18} color="#fff" />
                  <Text style={styles.btnText}>
                    {modoEdicao ? '  SALVAR ALTERAÇÕES' : '  CADASTRAR PARCEIRO'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.btnCancelar}>
              <Text style={styles.btnTextCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 2,
  },
  btnFechar: {
    padding: 6,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#2c3e50',
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginLeft: 4,
  },
  tipoRow: {
    flexDirection: 'row',
  },
  btnTipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#dfe6e9',
  },
  btnTipoAtivo: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  btnTipoText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  btnTipoTextAtivo: {
    color: '#fff',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eaf4fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  previewText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#2980b9',
  },
  btnSalvar: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  btnEditar: {
    backgroundColor: '#f39c12',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnCancelar: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnTextCancelar: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
