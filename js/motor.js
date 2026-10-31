// Regras do jogo, sem acesso ao DOM. `rng` devolve um número em [0, 1).

/**
 * @typedef {{ticker:string, nome:string, setor:string, porte:string, bonsDividendos:boolean, preco:number}} Acao
 * @typedef {{id:string, manchete:string, explicacao:string, impactos:Object<string,number>,
 *   motivos:Object<string,string>, grupo?:string, impactoGeral?:number, motivoGeral?:string}} Evento
 *   (impactos e motivos por ticker; impactoGeral vale para as empresas não citadas)
 * @typedef {{acao:Acao, percentual:number, quantidade:number, preco:number}} Posicao
 * @typedef {{posicoes:Posicao[], valorInicial:number}} Carteira
 */

function embaralhar(lista, rng) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function eventoAfetaCarteira(evento, carteira) {
  return carteira.posicoes.some((p) => p.percentual > 0 && evento.impactos?.[p.acao.ticker] !== undefined);
}

// Prefere os eventos para os quais `relevante` devolve true; completa com os demais se faltar.
export function sortearEventos(eventos, n = 5, rng = Math.random, relevante = () => true) {
  const embaralhados = embaralhar(eventos, rng);
  const candidatos = [...embaralhados.filter(relevante), ...embaralhados.filter((e) => !relevante(e))];
  const escolhidos = [];
  const grupos = new Set();
  for (const ev of candidatos) {
    if (escolhidos.length === n) break;
    if (ev.grupo && grupos.has(ev.grupo)) continue;
    if (ev.grupo) grupos.add(ev.grupo);
    escolhidos.push(ev);
  }
  if (escolhidos.length < n) throw new Error('Eventos insuficientes');
  return embaralhar(escolhidos, rng);
}

export function variacaoAcao(acao, evento, rng = Math.random) {
  const propria = evento.impactos?.[acao.ticker];
  // Notícias de economia geral (juros, PIB...) também movem, menos, as empresas não citadas.
  const base = propria ?? evento.impactoGeral;
  if (!base) return { pct: 0, afetada: false, direcao: 'neutra', motivo: null };
  // O ruído evita ações idênticas; é proporcional ao impacto para nunca inverter o sinal.
  const ruido = (rng() * 2 - 1) * Math.min(0.5, Math.abs(base) * 0.1);
  const motivo = propria !== undefined ? evento.motivos?.[acao.ticker] ?? null : evento.motivoGeral ?? null;
  return { pct: base + ruido, afetada: true, direcao: base > 0 ? 'sobe' : 'cai', motivo };
}

export function valorCarteira(carteira) {
  return carteira.posicoes.reduce((soma, p) => soma + p.quantidade * p.preco, 0);
}

export function aplicarEvento(carteira, evento, rng = Math.random) {
  const valorAntes = valorCarteira(carteira);
  const resultados = [];
  const posicoes = carteira.posicoes.map((p) => {
    const { pct, afetada, direcao, motivo } = variacaoAcao(p.acao, evento, rng);
    const precoDepois = p.preco * (1 + pct / 100);
    resultados.push({
      ticker: p.acao.ticker,
      precoAntes: p.preco,
      precoDepois,
      pct,
      afetada,
      direcao,
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

// palpites: { TICKER: 'sobe' | 'neutra' | 'cai' }
export function contarAcertos(palpites, resultados) {
  return resultados.filter((r) => palpites[r.ticker] === r.direcao).length;
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
