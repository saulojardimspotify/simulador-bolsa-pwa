// Ponto de entrada: carrega os dados, guarda o estado da partida e troca as telas.
import { carregarRanking, dataHoje } from './ranking.js';
import { iniciarInatividade } from './inatividade.js';
import { el, formatarReais } from './ui.js';
import * as inicio from './telas/inicio.js';
import * as escolha from './telas/escolha.js';
import * as distribuicao from './telas/distribuicao.js';
import * as rodada from './telas/rodada.js';
import * as resultado from './telas/resultado.js';
import * as ranking from './telas/ranking.js';

const telas = { inicio, escolha, distribuicao, rodada, resultado, ranking };
const app = document.getElementById('app');
const contagem = document.getElementById('contagem');

function abrirStorage() {
  try {
    const s = window.localStorage;
    s.getItem('teste');
    return s;
  } catch {
    return null;
  }
}

export const estado = {
  acoes: [],
  eventos: [],
  dataReferencia: '',
  storage: abrirStorage(),
  ranking: [],
  rankingData: '',
  filtros: { setores: [], portes: [], soDividendos: false, busca: '' },
};

export function novaPartida() {
  Object.assign(estado, {
    selecionadas: [],
    percentuais: null,
    carteira: null,
    eventosPartida: [],
    rodada: 0,
    acertos: 0,
    historico: [],
    filtros: { setores: [], portes: [], soDividendos: false, busca: '' },
  });
}

export function atualizarRankingDoDia() {
  const hoje = dataHoje();
  if (estado.rankingData !== hoje) {
    estado.ranking = carregarRanking(estado.storage, hoje);
    estado.rankingData = hoje;
  }
}

const inatividade = iniciarInatividade({
  aoExpirar: () => irPara('inicio'),
  aoAvisar: (s) => {
    contagem.hidden = false;
    contagem.textContent = `Voltando ao início em ${s}…  Toque na tela para continuar.`;
  },
  aoCancelar: () => { contagem.hidden = true; },
});

const TRAVA_TROCA_MS = 400;
let travaTimer = null;

export function irPara(nome) {
  document.querySelectorAll('.modal-fundo').forEach((m) => m.remove());
  // Ignora toques logo após trocar de tela, para o 2º toque de um toque duplo não cair na tela nova.
  app.inert = true;
  clearTimeout(travaTimer);
  travaTimer = setTimeout(() => { app.inert = false; }, TRAVA_TROCA_MS);
  app.replaceChildren();
  app.dataset.tela = nome;
  window.scrollTo(0, 0);
  if (nome === 'inicio') inatividade.parar();
  else inatividade.reiniciar();
  telas[nome].render(app, estado, irPara);
}

function montarLetreiro() {
  const faixa = document.getElementById('letreiro');
  const itens = estado.acoes.map((a) =>
    el('span', { class: 'letreiro-item' }, el('b', {}, a.ticker), ' ', formatarReais(a.preco)));
  // Duas cópias para a rolagem infinita não ter emenda.
  faixa.replaceChildren(...itens, ...itens.map((n) => n.cloneNode(true)));
}

function formatarData(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

async function carregarDados() {
  app.replaceChildren(el('p', { class: 'carregando' }, 'Carregando…'));
  try {
    const [acoes, eventos] = await Promise.all([
      fetch('./data/acoes.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch('./data/eventos.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ]);
    estado.acoes = acoes.acoes;
    estado.dataReferencia = acoes.dataReferencia;
    estado.eventos = eventos;
    document.getElementById('aviso').textContent =
      `Preços de ${formatarData(acoes.dataReferencia)} · Simulação educativa`;
    montarLetreiro();
    novaPartida();
    atualizarRankingDoDia();
    irPara('inicio');
  } catch {
    app.replaceChildren(el('div', { class: 'erro-carga' },
      el('h1', {}, 'Não foi possível carregar os dados'),
      el('button', { class: 'botao botao-primario', onclick: carregarDados }, 'Tentar de novo')));
  }
}

document.addEventListener('contextmenu', (e) => e.preventDefault());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
carregarDados();
