import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useMoeda } from '../../hooks/useMoeda';
import { supabase } from '../../lib/supabase'; 

interface Props {
  visivel: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalNovoCliente({ visivel, onClose, onSuccess }: Props) {
  const { moedaGlobal } = useMoeda(); 
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSalvar = async () => {
    if (!nome) {
      Alert.alert('Erro', 'O nome do cliente é obrigatório!');
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('clientes')
      .insert([{ 
        nome: nome, 
        telefone: telefone, 
        moeda: moedaGlobal 
      }]);

    setLoading(false);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', `Cliente cadastrado na base ${moedaGlobal}!`);
      setNome('');
      setTelefone('');
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal visible={visivel} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Novo Cliente ({moedaGlobal})</Text>
          <Text style={styles.subtitle}>Este cliente só aparecerá no país {moedaGlobal}.</Text>
          
          <TextInput 
            placeholder="Nome Completo" 
            style={styles.input} 
            value={nome} 
            onChangeText={setNome} 
          />
          <TextInput 
            placeholder="WhatsApp (Opcional)" 
            style={styles.input} 
            value={telefone} 
            onChangeText={setTelefone} 
            keyboardType="phone-pad" 
          />

          <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CADASTRAR</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.btnCancelar}>
            <Text style={styles.btnTextCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 15, padding: 25, elevation: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  input: { height: 50, borderBottomWidth: 1, borderBottomColor: '#bdc3c7', marginBottom: 20, fontSize: 16 },
  btnSalvar: { backgroundColor: '#3498db', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnCancelar: { marginTop: 15, padding: 10, alignItems: 'center' },
  btnTextCancelar: { color: '#e74c3c', fontWeight: 'bold' }
});