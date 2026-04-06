import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoeda } from '../../hooks/useMoeda';
import { useClientes } from '../../hooks/useClientes';

interface Props {
  visivel: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dadosParaEditar?: any | null;
}

export default function ModalNovoCliente({ visivel, onClose, onSuccess, dadosParaEditar }: Props) {
  const { moedaGlobal } = useMoeda();
  const { cadastrarCliente, editarCliente, loading } = useClientes();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const modoEdicao = !!dadosParaEditar;

  // Preenche os campos ao abrir em modo edição
  useEffect(() => {
    if (visivel) {
      if (dadosParaEditar) {
        setNome(dadosParaEditar.nome || '');
        setTelefone(dadosParaEditar.telefone || '');
      } else {
        setNome('');
        setTelefone('');
      }
    }
  }, [visivel, dadosParaEditar]);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome do cliente é obrigatório!');
      return;
    }

    let res;
    if (modoEdicao) {
      res = await editarCliente(dadosParaEditar.id, nome.trim(), telefone.trim());
    } else {
      res = await cadastrarCliente(nome.trim(), telefone.trim());
    }

    if (res?.sucesso) {
      Alert.alert('Sucesso', modoEdicao ? 'Cliente atualizado com sucesso!' : `Cliente cadastrado na base ${moedaGlobal}!`);
      onSuccess();
      onClose();
    } else {
      Alert.alert('Erro', res?.error || 'Não foi possível salvar o cliente.');
    }
  };

  return (
    <Modal visible={visivel} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name={modoEdicao ? 'create' : 'person-add'} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>
                {modoEdicao ? 'Editar Cliente' : 'Novo Cliente'}
              </Text>
              <Text style={styles.subtitle}>
                {modoEdicao
                  ? `Atualizando dados de ${dadosParaEditar?.nome}`
                  : `Este cliente será cadastrado em ${moedaGlobal}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.btnFechar}>
              <Ionicons name="close" size={22} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Campo Nome */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  placeholder="Ex: João da Silva"
                  placeholderTextColor="#bdc3c7"
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Campo Telefone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp / Telefone</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={styles.inputIcon} />
                <TextInput
                  placeholder="Ex: (11) 99999-9999"
                  placeholderTextColor="#bdc3c7"
                  style={styles.input}
                  value={telefone}
                  onChangeText={setTelefone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Botões */}
            <TouchableOpacity
              style={[styles.btnSalvar, modoEdicao && styles.btnEditar]}
              onPress={handleSalvar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={modoEdicao ? 'checkmark-circle' : 'person-add'} size={18} color="#fff" />
                  <Text style={styles.btnText}>
                    {modoEdicao ? '  SALVAR ALTERAÇÕES' : '  CADASTRAR CLIENTE'}
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
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 20,
  },
  modalView: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3498db',
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
    paddingHorizontal: 20,
    paddingTop: 18,
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
  btnSalvar: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    margin: 20,
    marginTop: 24,
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
    paddingBottom: 20,
    alignItems: 'center',
  },
  btnTextCancelar: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
