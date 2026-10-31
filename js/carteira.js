// Escolha das ações e distribuição do dinheiro, sem acesso ao DOM.

export const PERCENTUAIS_PADRAO = [40, 30, 30];
const MAX_ACOES = 3;

export function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filtrarAcoes(acoes, { setores = [], portes = [], soDividendos = false, busca = '' } = {}) {
  const termo = semAcento(busca.trim());
  return acoes.filter((a) =>
    (setores.length === 0 || setores.includes(a.setor)) &&
    (portes.length === 0 || portes.includes(a.porte)) &&
    (!soDividendos || a.bonsDividendos) &&
    (termo === '' || semAcento(a.ticker).includes(termo) || semAcento(a.nome).includes(termo)));
}

export function alternarSelecao(selecionadas, ticker) {
  if (selecionadas.includes(ticker)) return selecionadas.filter((t) => t !== ticker);
  if (selecionadas.length >= MAX_ACOES) return selecionadas;
  return [...selecionadas, ticker];
}

export function ajustarPercentual(percentuais, indice, delta) {
  return percentuais.map((p, i) => (i === indice ? Math.min(100, Math.max(0, p + delta)) : p));
}

export function statusDistribuicao(percentuais) {
  const total = percentuais.reduce((s, p) => s + p, 0);
  return { total, falta: 100 - total };
}

export function criarCarteira(acoes, percentuais, capital = 10000) {
  if (statusDistribuicao(percentuais).total !== 100) throw new Error('Total deve ser 100%');
  return {
    valorInicial: capital,
    posicoes: acoes.map((acao, i) => ({
      acao,
      percentual: percentuais[i],
      quantidade: (capital * percentuais[i]) / 100 / acao.preco,
      preco: acao.preco,
    })),
  };
}
