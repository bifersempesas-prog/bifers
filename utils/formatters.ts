export const formatarMoeda = (valor: number, moeda: 'BRL' | 'USD' = 'BRL') => {
  // 1. Previne erro de valor vazio/nulo
  const valorSeguro = Number(valor) || 0; 
  
  // 2. Previne erro de moeda vazia/nula (que causou a tela vermelha)
  const moedaSegura = moeda === 'USD' ? 'USD' : 'BRL'; 
  
  // 3. Define a formatação americana para USD e brasileira para BRL
  const locale = moedaSegura === 'USD' ? 'en-US' : 'pt-BR';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moedaSegura,
  }).format(valorSeguro);
};