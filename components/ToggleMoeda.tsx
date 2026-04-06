import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMoeda } from '../hooks/useMoeda';

export default function ToggleMoeda() {
  const { moedaGlobal, setMoeda } = useMoeda();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.botao, moedaGlobal === 'BRL' && styles.botaoAtivo]} 
        onPress={() => setMoeda('BRL')}
      >
        <Text style={[styles.texto, moedaGlobal === 'BRL' && styles.textoAtivo]}>🇧🇷 Real</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.botao, moedaGlobal === 'USD' && styles.botaoAtivo]} 
        onPress={() => setMoeda('USD')}
      >
        <Text style={[styles.texto, moedaGlobal === 'USD' && styles.textoAtivo]}>🇺🇸 Dólar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    marginHorizontal: 15, // Adicionado para não encostar nas bordas
  },
  botao: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  botaoAtivo: {
    backgroundColor: '#fff',
    elevation: 2, // Sombra no Android
    shadowColor: '#000', // Sombra no iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  texto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  textoAtivo: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
});