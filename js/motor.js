// Regras do jogo, sem acesso ao DOM. `rng` devolve um número em [0, 1).

/**
 * @typedef {{ticker:string, nome:string, setor:string, porte:string, bonsDividendos:boolean, preco:number}} Acao
 * @typedef {{id:string, manchete:string, explicacao:string, impactoSetores:Object<string,number>,
 *   impactoAcoes?:Object<string,number>, motivos?:Object<string,string>, grupo?:string}} Evento
 * @typedef {{acao:Acao, percentual:number, quantidade:number, preco:number}} Posicao
 * @typedef {{posicoes:Posicao[], valorInicial:number}} Carteira
 */

export function sortearEventos(eventos, n = 5, rng = Math.random) {
  const embaralhados = [...eventos];
  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
  }
  const escolhidos = [];
  const grupos = new Set();
  for (const ev of embaralhados) {
    if (escolhidos.length === n) break;
    if (ev.grupo && grupos.has(ev.grupo)) continue;
    if (ev.grupo) grupos.add(ev.grupo);
    escolhidos.push(ev);
  }
  if (escolhidos.length < n) throw new Error('Eventos insuficientes');
  return escolhidos;
}

export function variacaoAcao(acao, evento, rng = Math.random) {
  const proprio = evento.impactoAcoes?.[acao.ticker];
  const doSetor = evento.impactoSetores?.[acao.setor];
  const base = proprio ?? doSetor;
  if (base === undefined) return { pct: 0, afetada: false, motivo: null };
  // O ruído só existe para ações afetadas não ficarem idênticas dentro do mesmo setor.
  const ruido = rng() * 2 - 1;
  const motivo = evento.motivos?.[acao.ticker] ?? evento.motivos?.[acao.setor] ?? null;
  return { pct: base + ruido, afetada: true, motivo };
}

export function valorCarteira(carteira) {
  return carteira.posicoes.reduce((soma, p) => soma + p.quantidade * p.preco, 0);
}

export function aplicarEvento(carteira, evento, rng = Math.random) {
  const valorAntes = valorCarteira(carteira);
  const resultados = [];
  const posicoes = carteira.posicoes.map((p) => {
    const { pct, afetada, motivo } = variacaoAcao(p.acao, evento, rng);
    const precoDepois = p.preco * (1 + pct / 100);
    resultados.push({
      ticker: p.acao.ticker,
      precoAntes: p.preco,
      precoDepois,
      pct,
      afetada,
      investida: p.percentual > 0,
      motivo,
      variacaoReais: p.quantidade * (precoDepois - p.preco),
    });
    return { ...p, preco: precoDepois };
  });
  const nova = { ...carteira, posicoes };
  return {
    carteira: nova,
    resultados,
    valorAntes,
    valorDepois: valorCarteira(nova),
    algumaInvestidaAfetada: resultados.some((r) => r.investida && r.afetada),
  };
}

export function avaliarPalpite(palpite, valorAntes, valorDepois) {
  const diferenca = valorDepois - valorAntes;
  if (diferenca === 0) return true;
  return palpite === 'sobe' ? diferenca > 0 : diferenca < 0;
}

export function licaoFinal(carteira, retornoPct) {
  const investidas = carteira.posicoes.filter((p) => p.percentual > 0);
  const setores = new Set(investidas.map((p) => p.acao.setor));
  const licoes = [];
  if (investidas.some((p) => p.percentual >= 70)) {
    licoes.push('Você apostou quase tudo numa ação só: o resultado dependeu dela.');
  } else if (setores.size === 1) {
    licoes.push('Carteira concentrada: tudo subiu ou caiu junto. Diversificar reduz o risco.');
  } else if (setores.size < investidas.length) {
    licoes.push('Diversificação parcial: duas ações dependiam das mesmas notícias.');
  } else {
    licoes.push('Boa diversificação: quando um setor caía, outro segurava.');
  }
  if (retornoPct > 10) {
    licoes.push('Retorno alto também significa risco alto: ganhar muito em pouco tempo na bolsa envolve sorte.');
  } else if (retornoPct < -10) {
    licoes.push('Perdas fazem parte. Ações são investimento de longo prazo, e diversificar ajuda a amortecer quedas.');
  }
  return licoes;
}
