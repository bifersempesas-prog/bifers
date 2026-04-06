import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useMoeda } from './useMoeda';

export const useComissionados = () => {
  const { moedaGlobal } = useMoeda();

  const listarComissionados = async () => {
    const { data, error } = await supabase
      .from('comissionados')
      .select('*')
      .eq('moeda', moedaGlobal)
      .eq('ativo', true);
    return data || [];
  };

  return { listarComissionados };
};