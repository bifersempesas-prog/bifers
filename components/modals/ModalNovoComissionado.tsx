import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useMoeda } from '../../hooks/useMoeda';
import { supabase } from '../../lib/supabase';

export default function ModalNovoComissionado({ visivel, onClose, onSuccess }: any) {
  const { moedaGlobal } = useMoeda();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'PERCENTUAL' | 'FIXO'>('PERCENTUAL');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSalvar = async () => {
    if (!nome || !valor) return Alert.alert('Erro', 'Preencha todos os campos!');
    
    setLoading(true);
    const { error } = await supabase.from('comissionados').insert([{
      nome,
      tipo_padrao: tipo,
      valor_padrao: parseFloat(valor.replace(',', '.')),
      moeda: moedaGlobal
    }]);

    setLoading(false);
    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      setNome(''); setValor('');
      onSuccess(); onClose();
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Novo Parceiro ({moedaGlobal})</Text>
          
          <TextInput placeholder="Nome do Parceiro" style={styles.input} value={nome} onChangeText={setNome} />
          
          <Text style={styles.label}>Tipo de Comissão Padrão:</Text>
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.btnTipo, tipo === 'PERCENTUAL' && styles.btnAtivo]} 
              onPress={() => setTipo('PERCENTUAL')}
            >
              <Text style={{color: tipo === 'PERCENTUAL' ? '#fff' : '#000'}}>Porcentagem (%)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btnTipo, tipo === 'FIXO' && styles.btnAtivo]} 
              onPress={() => setTipo('FIXO')}
            >
              <Text style={{color: tipo === 'FIXO' ? '#fff' : '#000'}}>Valor Fixo ($)</Text>
            </TouchableOpacity>
          </View>

          <TextInput 
            placeholder={tipo === 'PERCENTUAL' ? "Ex: 10 (%)" : "Ex: 50 (Fixo)"} 
            style={styles.input} 
            keyboardType="numeric" 
            value={valor} 
            onChangeText={setValor} 
          />

          <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CADASTRAR PARCEIRO</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onClose} style={{marginTop: 15}}>
            <Text style={{color: 'red', textAlign: 'center'}}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modal: { backgroundColor: '#fff', margin: 20, borderRadius: 15, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 20, fontSize: 16, padding: 5 },
  label: { fontSize: 14, color: '#7f8c8d', marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 20 },
  btnTipo: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#eee', borderRadius: 5, marginHorizontal: 2 },
  btnAtivo: { backgroundColor: '#3498db' },
  btnSalvar: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});