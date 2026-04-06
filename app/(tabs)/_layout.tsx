import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: '#3498db', // Cor azul quando a aba está selecionada
        headerShown: false // Esconde o cabeçalho padrão para ficar mais limpo
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Carteira', 
          tabBarIcon: ({ color }) => <Ionicons name="wallet" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="clientes" 
        options={{ 
          title: 'Cadastros', 
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="caixa" 
        options={{ 
          title: 'Caixa', 
          tabBarIcon: ({ color }) => <Ionicons name="cash" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="cobranca" 
        options={{ 
          title: 'Cobrança', 
          tabBarIcon: ({ color }) => <Ionicons name="logo-whatsapp" size={24} color={color} /> 
        }} 
      />
      
      {/* NOVA ABA DE PERFIL (Onde fica o botão de trancar o app) */}
      <Tabs.Screen 
        name="perfil" 
        options={{ 
          title: 'Perfil', 
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}