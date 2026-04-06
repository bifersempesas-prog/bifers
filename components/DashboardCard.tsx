import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarMoeda } from '../utils/formatters';

interface Props {
  moeda: string;
  ativo: number;
  lucro: number;
  comissao: number;
  receber: number;
  totalEmprestado: number;
}

interface CardProps {
  label: string;
  valor: string;
  cor: string;
  icone: any;
  destaque?: boolean;
}

function MetricaCard({ label, valor, cor, icone, destaque }: CardProps) {
  return (
    <View style={[styles.card, { backgroundColor: cor }, destaque && styles.cardDestaque]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icone} size={18} color="rgba(255,255,255,0.85)" />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.valor, destaque && styles.valorDestaque]}>{valor}</Text>
    </View>
  );
}

export default function DashboardCard({ moeda, ativo, lucro, comissao, receber, totalEmprestado }: Props) {
  // Lucro líquido = lucro recebido - comissões pagas
  const lucroLiquido = lucro - comissao;

  return (
    <View style={styles.container}>
      {/* Linha 1: Capital Ativo + Total Emprestado */}
      <View style={styles.row}>
        <MetricaCard
          label="Capital Ativo"
          valor={formatarMoeda(ativo, moeda)}
          cor="#2980b9"
          icone="cash-outline"
          destaque
        />
        <MetricaCard
          label="Total Emprestado"
          valor={formatarMoeda(totalEmprestado, moeda)}
          cor="#16a085"
          icone="trending-up-outline"
        />
      </View>

      {/* Linha 2: A Receber + Lucro Juros */}
      <View style={styles.row}>
        <MetricaCard
          label="A Receber"
          valor={formatarMoeda(receber, moeda)}
          cor="#e74c3c"
          icone="time-outline"
        />
        <MetricaCard
          label="Lucro em Juros"
          valor={formatarMoeda(lucro, moeda)}
          cor="#27ae60"
          icone="stats-chart-outline"
        />
      </View>

      {/* Linha 3: Comissões + Lucro Líquido */}
      <View style={styles.row}>
        <MetricaCard
          label="Comissões Pagas"
          valor={formatarMoeda(comissao, moeda)}
          cor="#e67e22"
          icone="people-outline"
        />
        <MetricaCard
          label="Lucro Líquido"
          valor={formatarMoeda(lucroLiquido, moeda)}
          cor={lucroLiquido >= 0 ? '#8e44ad' : '#c0392b'}
          icone="wallet-outline"
          destaque
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    width: '48.5%',
    padding: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  cardDestaque: {
    elevation: 6,
    shadowOpacity: 0.2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 5,
    flex: 1,
  },
  valor: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  valorDestaque: {
    fontSize: 17,
  },
});
