import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useClientes } from '../../hooks/useClientes';

export default function ModalAcao({ visivel, contrato, onClose, onSuccess }) {
  const [valorPago, setValorPago] = useState('');
  const { processarPagamento, loading } = useClientes();

  const handleConfirmar = async () => {
    if (!valorPago) return;
    const res = await processarPagamento(contrato, parseFloat(valorPago), 'USER_ID_AQUI');
    if (res.sucesso) {
      onSuccess();
      onClose();
      setValorPago('');
    }
  };

  if (!contrato) return null;

  return (
    <Modal visible={visivel} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Registrar Pagamento</Text>
          <Text style={styles.subtitle}>Saldo Atual: {contrato.saldo_devedor}</Text>
          
          <TextInput
            placeholder="Valor recebido"
            keyboardType="numeric"
            style={styles.input}
            value={valorPago}
            onChangeText={setValorPago}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>* O sistema calculará os juros sobre o capital e abaterá o restante do Saldo Devedor automaticamente.</Text>
          </View>

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: '#27ae60' }]} 
            onPress={handleConfirmar}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Processando...' : 'CONFIRMAR'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 15 }}>
            <Text style={{ color: '#7f8c8d' }}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 15, padding: 25, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#7f8c8d', marginBottom: 20 },
  input: { width: '100%', height: 50, borderBottomWidth: 2, borderBottomColor: '#27ae60', fontSize: 22, textAlign: 'center', marginBottom: 20 },
  infoBox: { backgroundColor: '#f1f2f6', padding: 10, borderRadius: 5, marginBottom: 20 },
  infoText: { fontSize: 11, color: '#7f8c8d', fontStyle: 'italic' },
  btn: { width: '100%', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});