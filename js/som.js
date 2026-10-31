// Efeitos sonoros e música de fundo com Web Audio. A maioria é sintetizada; os que têm arquivo em
// sons/ tocam o arquivo (guardado pelo service worker para funcionar offline).
import { carregarPreferenciasSom, salvarPreferenciasSom } from './preferencias-som.js';

let ctx = null;
let mestre = null;
let storage = null;
let prefs = carregarPreferenciasSom(null);
const ouvintes = new Set();

// Efeitos com arquivo próprio. Se o arquivo não carregar, toca a versão sintetizada.
const ARQUIVOS_SOM = { plantao: './sons/breaking_news.mp3', conquista: './sons/applause.mp3' };
const MAX_SEGUNDOS_ARQUIVO = 4.5;
const buffers = {};
const tocando = {};

export function iniciarSom(armazenamento) {
  storage = armazenamento;
  prefs = carregarPreferenciasSom(storage);
  // Navegadores só liberam áudio depois de um toque do usuário.
  document.addEventListener('pointerdown', desbloquear, { capture: true });
}

function desbloquear() {
  if (!ctx) {
    const Contexto = window.AudioContext ?? window.webkitAudioContext;
    if (!Contexto) return;
    ctx = new Contexto();
    mestre = ctx.createGain();
    mestre.connect(ctx.destination);
    aplicarVolume();
    carregarArquivos();
    if (prefs.musica) musica.ligar();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function carregarArquivos() {
  for (const [nome, url] of Object.entries(ARQUIVOS_SOM)) {
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((dados) => ctx.decodeAudioData(dados))
      .then((buffer) => { buffers[nome] = buffer; })
      .catch(() => {});
  }
}

// Toca o arquivo do efeito, cortando com fade depois de MAX_SEGUNDOS_ARQUIVO. Devolve false se não houver arquivo.
function tocarArquivo(nome, ganho = 0.8) {
  const buffer = buffers[nome];
  if (!buffer) return false;
  parar(nome);
  const fonte = ctx.createBufferSource();
  const g = ctx.createGain();
  const t = ctx.currentTime;
  const fim = Math.min(buffer.duration, MAX_SEGUNDOS_ARQUIVO);
  fonte.buffer = buffer;
  g.gain.setValueAtTime(ganho, t);
  g.gain.setValueAtTime(ganho, t + fim - 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + fim);
  fonte.connect(g).connect(mestre);
  fonte.start(t);
  fonte.stop(t + fim + 0.05);
  tocando[nome] = { fonte, g };
  fonte.onended = () => { if (tocando[nome]?.fonte === fonte) delete tocando[nome]; };
  return true;
}

function parar(nome) {
  const atual = tocando[nome];
  if (!atual) return;
  atual.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  try {
    atual.fonte.stop(ctx.currentTime + 0.3);
  } catch {
    // já tinha parado
  }
  delete tocando[nome];
}

function aplicarVolume() {
  if (mestre) mestre.gain.setTargetAtTime(prefs.mudo ? 0 : prefs.volume, ctx.currentTime, 0.02);
}

export function preferencias() {
  return { ...prefs };
}

export function ajustar(mudancas) {
  prefs = { ...prefs, ...mudancas };
  salvarPreferenciasSom(storage, prefs);
  aplicarVolume();
  if (ctx && 'musica' in mudancas) (prefs.musica ? musica.ligar() : musica.desligar());
  for (const fn of ouvintes) fn(preferencias());
}

export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function pronto() {
  return ctx && ctx.state === 'running' && !prefs.mudo;
}

// Uma nota com envelope simples. `quando` é em segundos a partir de agora.
function nota(freq, quando, duracao, { tipo = 'sine', ganho = 0.2, ataque = 0.005, destino = mestre, deslizarPara } = {}) {
  const t = ctx.currentTime + quando;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t);
  if (deslizarPara) osc.frequency.exponentialRampToValueAtTime(deslizarPara, t + duracao);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(ganho, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  osc.connect(g).connect(destino);
  osc.start(t);
  osc.stop(t + duracao + 0.05);
}

const NOTA = { A3: 220, C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };

// Campainha metálica: parciais inarmônicos com decaimento longo, como o sino do pregão.
function badalada(quando, base = 830) {
  const parciais = [[1, 0.35], [2.0, 0.18], [2.76, 0.14], [3.2, 0.08], [5.4, 0.06], [8.9, 0.03]];
  for (const [razao, ganho] of parciais) {
    nota(base * razao, quando, 2.4 / Math.sqrt(razao), { ganho, ataque: 0.002 });
  }
}

export const efeitos = {
  clique() {
    if (pronto()) nota(1400, 0, 0.04, { tipo: 'triangle', ganho: 0.06 });
  },
  sino() {
    if (!pronto()) return;
    badalada(0);
    badalada(0.45);
    badalada(0.9);
  },
  plantao() {
    if (!pronto() || tocarArquivo('plantao')) return;
    nota(NOTA.A5, 0, 0.12, { tipo: 'square', ganho: 0.05 });
    nota(NOTA.A5, 0.16, 0.12, { tipo: 'square', ganho: 0.05 });
    nota(NOTA.E5 * 2, 0.32, 0.28, { tipo: 'square', ganho: 0.05 });
  },
  contagem(segundos = 1.1) {
    if (!pronto()) return;
    parar('plantao'); // a vinheta não pode atropelar a revelação
    const passos = 14;
    for (let i = 0; i < passos; i++) nota(700 + i * 45, (i * segundos) / passos, 0.03, { tipo: 'triangle', ganho: 0.04 });
  },
  acertoTotal() {
    if (!pronto()) return;
    [NOTA.C5, NOTA.E5, NOTA.G5, NOTA.C6].forEach((f, i) => nota(f, i * 0.09, 0.35, { tipo: 'triangle', ganho: 0.15 }));
    nota(NOTA.C6 * 2, 0.4, 0.5, { ganho: 0.05 });
  },
  acertoParcial() {
    if (!pronto()) return;
    nota(NOTA.E5, 0, 0.25, { ganho: 0.15 });
    nota(NOTA.A5, 0.12, 0.4, { ganho: 0.15 });
  },
  erro() {
    if (pronto()) nota(NOTA.A3, 0, 0.45, { ganho: 0.14, deslizarPara: 180 });
  },
  fanfarra() {
    if (!pronto()) return;
    [NOTA.G4, NOTA.C5, NOTA.E5, NOTA.G5].forEach((f, i) => nota(f, i * 0.12, 0.25, { tipo: 'sawtooth', ganho: 0.05 }));
    for (const f of [NOTA.C5, NOTA.E5, NOTA.G5, NOTA.C6]) nota(f, 0.5, 1.1, { tipo: 'triangle', ganho: 0.08 });
  },
  neutro() {
    if (!pronto()) return;
    for (const f of [NOTA.A3, NOTA.C4, NOTA.E4]) nota(f, 0, 1.2, { ganho: 0.08, ataque: 0.05 });
  },
  conquista() {
    if (!pronto() || tocarArquivo('conquista')) return;
    [NOTA.C6, NOTA.E5 * 2, NOTA.G5 * 2, NOTA.C6 * 2].forEach((f, i) => nota(f, i * 0.11, 0.9, { ganho: 0.09, ataque: 0.004 }));
  },
};

// Música de fundo: batida eletrônica discreta em loop (Lá menor, Fá, Dó, Sol), 96 bpm.
const musica = (() => {
  const BPM = 96;
  const tempo = 60 / BPM / 2; // colcheia
  const acordes = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
  let saida = null;
  let timer = null;
  let proximo = 0;
  let passo = 0;

  function agendar() {
    while (proximo < ctx.currentTime + 0.3) {
      const acorde = acordes[Math.floor(passo / 8) % acordes.length];
      const quando = proximo - ctx.currentTime;
      if (passo % 8 === 0) for (const f of acorde) nota(f, quando, tempo * 8, { ganho: 0.03, ataque: 0.2, destino: saida });
      if (passo % 2 === 0) nota(acorde[0] / 2, quando, tempo * 1.5, { tipo: 'triangle', ganho: 0.07, destino: saida });
      nota(acorde[passo % 3] * 2, quando, tempo * 0.8, { tipo: 'triangle', ganho: 0.015, destino: saida });
      proximo += tempo;
      passo += 1;
    }
  }

  return {
    ligar() {
      if (timer) return;
      saida = ctx.createGain();
      saida.gain.value = 0.6;
      saida.connect(mestre);
      proximo = ctx.currentTime + 0.1;
      passo = 0;
      timer = setInterval(agendar, 100);
    },
    desligar() {
      clearInterval(timer);
      timer = null;
      if (saida) {
        saida.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        const velha = saida;
        setTimeout(() => velha.disconnect(), 600);
        saida = null;
      }
    },
  };
})();
