import { create } from 'zustand';

interface MoedaState {
  moedaGlobal: 'BRL' | 'USD';
  setMoeda: (novaMoeda: 'BRL' | 'USD') => void;
}

export const useMoeda = create<MoedaState>((set) => ({
  moedaGlobal: 'BRL', // O app sempre vai abrir no Brasil por padrão
  setMoeda: (novaMoeda) => set({ moedaGlobal: novaMoeda }),
}));