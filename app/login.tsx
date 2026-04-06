import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ImageBackground, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading } = useAuth();
  
  // Estados do Conversor (O Disfarce)
  const [cotacao, setCotacao] = useState('5.00'); 
  const [valorUSD, setValorUSD] = useState('');   
  
  // Estados Secretos (O Cofre)
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [esconderSenha, setEsconderSenha] = useState(true);

  // ==========================================
  // CONFIGURAÇÕES DE SEGURANÇA
  // ==========================================
  const VALOR_SECRETO = '777'; 
  // ==========================================

  // Cálculo funcional do conversor
  const resultadoBRL = (parseFloat(cotacao.replace(',', '.')) || 0) * (parseFloat(valorUSD.replace(',', '.')) || 0);

  useEffect(() => {
    if (valorUSD === VALOR_SECRETO) {
      setDesbloqueado(true);
    } else {
      setDesbloqueado(false);
      setEmail('');
      setSenha(''); 
      setEsconderSenha(true);
    }
  }, [valorUSD]);

  const handleEntrar = async () => {
    if (!email || !senha) {
      Alert.alert('Erro', 'Preencha email e senha.');
      return;
    }

    const res = await login(email, senha);
    if (res.sucesso) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Acesso Negado', res.error || 'Credenciais incorretas.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ImageBackground 
        source={require('../assets/images/fundo.jpg')} 
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={styles.container}
            >
              <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                
                <View style={styles.header}>
                  <Ionicons name="swap-horizontal" size={50} color="#fff" />
                  <Text style={styles.title}>Conversor USD/BRL</Text>
                </View>

                <View style={styles.converterCard}>
                  <Text style={styles.label}>Cotação do Dólar Hoje (R$):</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={cotacao}
                    onChangeText={setCotacao}
                    placeholder="Ex: 5.00"
                  />

                  <Text style={styles.label}>Valor em Dólar (US$):</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={valorUSD}
                    onChangeText={setValorUSD}
                    placeholder="Ex: 100"
                  />

                  <View style={styles.resultBox}>
                    <Text style={styles.resultLabel}>Total em Reais:</Text>
                    <Text style={styles.resultValue}>R$ {resultadoBRL.toFixed(2)}</Text>
                  </View>
                </View>

                {/* ÁREA SECRETA */}
                {desbloqueado && (
                  <View style={styles.secretBox}>
                    <Text style={styles.secretTitle}>Acesso Restrito</Text>
                    
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.secretInput}
                        placeholder="Seu Email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                        placeholderTextColor="#95a5a6"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.secretInput}
                        placeholder="Sua Senha"
                        secureTextEntry={esconderSenha}
                        value={senha}
                        onChangeText={setSenha}
                        placeholderTextColor="#95a5a6"
                      />
                      <TouchableOpacity 
                        style={styles.eyeIcon} 
                        onPress={() => setEsconderSenha(!esconderSenha)}
                      >
                        <Ionicons 
                          name={esconderSenha ? "eye-off" : "eye"} 
                          size={24} 
                          color="#7f8c8d" 
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      style={[styles.btnAcessar, loading && { opacity: 0.7 }]} 
                      onPress={handleEntrar}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnText}>ENTRAR</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* MÁGICA PARA O TECLADO */}
                {desbloqueado && <View style={{ height: 120 }} />}

              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)' }, 
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  converterCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.6)', 
    padding: 20, 
    borderRadius: 15, 
    elevation: 5 
  },
  label: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  input: { 
    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
    borderRadius: 8, 
    padding: 15, 
    fontSize: 18, 
    marginBottom: 20, 
    color: '#2c3e50', 
    fontWeight: 'bold' 
  },
  resultBox: { 
    backgroundColor: 'rgba(46, 204, 113, 0.9)', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
    marginTop: 10
  },
  resultLabel: { color: '#fff', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
  resultValue: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 5 },
  secretBox: {
    marginTop: 30,
    backgroundColor: 'rgba(44, 62, 80, 0.85)', 
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3498db'
  },
  secretTitle: { color: '#3498db', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, textTransform: 'uppercase' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
  },
  secretInput: { 
    flex: 1,
    padding: 15, 
    fontSize: 16, 
    color: '#2c3e50',
    fontWeight: 'bold'
  },
  eyeIcon: { padding: 15 },
  btnAcessar: { 
    backgroundColor: '#3498db', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
    minHeight: 55,
    justifyContent: 'center'
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
