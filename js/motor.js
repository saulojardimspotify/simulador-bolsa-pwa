// Regras do jogo, sem acesso ao DOM. `rng` devolve um número em [0, 1).

/**
 * @typedef {{ticker:string, nome:string, setor:string, porte:string, bonsDividendos:boolean, preco:number}} Acao
 * @typedef {{id:string, manchete:string, explicacao:string, impactoSetores:Object<string,number>,
 *   impactoAcoes?:Object<string,number>, motivos?:Object<string,string>, grupo?:string}} Evento
 * @typedef {{acao:Acao, percentual:number, quantidade:number, preco:number}} Posicao
 * @typedef {{posicoes:Posicao[], valorInicial:number}} Carteira
 */

// Variação da carteira (em %) abaixo da qual o palpite certo é "fica igual".
export const LIMIAR_IGUAL = 0.5;

function embaralhar(lista, rng) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function eventoAfetaCarteira(evento, carteira) {
  return carteira.posicoes.some((p) => p.percentual > 0 &&
    (evento.impactoAcoes?.[p.acao.ticker] !== undefined || evento.impactoSetores?.[p.acao.setor] !== undefined));
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
  const proprio = evento.impactoAcoes?.[acao.ticker];
  const doSetor = evento.impactoSetores?.[acao.setor];
  const base = proprio ?? doSetor;
  // O ruído evita ações idênticas no mesmo setor; é proporcional ao impacto para nunca inverter o sinal.
  const ruido = (b) => (rng() * 2 - 1) * Math.min(1, Math.abs(b) * 0.3);
  if (base === undefined) {
    const mercado = evento.impactoMercado;
    if (!mercado) return { pct: 0, afetada: false, origem: null, motivo: null };
    return { pct: mercado + ruido(mercado), afetada: false, origem: 'mercado', motivo: evento.motivoMercado ?? 'Acompanhou o mercado' };
  }
  const motivo = evento.motivos?.[acao.ticker] ?? evento.motivos?.[acao.setor] ?? null;
  return { pct: base + ruido(base), afetada: true, origem: proprio !== undefined ? 'acao' : 'setor', motivo };
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
  // Arredonda para evitar que 100,5 vire 0,49999…% por erro de ponto flutuante.
  const pct = Math.round(((valorDepois - valorAntes) / valorAntes) * 1e6) / 1e4;
  if (palpite === 'sobe') return pct >= LIMIAR_IGUAL;
  if (palpite === 'cai') return pct <= -LIMIAR_IGUAL;
  return Math.abs(pct) < LIMIAR_IGUAL;
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
