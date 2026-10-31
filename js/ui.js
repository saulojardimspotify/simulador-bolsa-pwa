// Utilitários de interface: criação de elementos, formatação e animações.
import { CORES_SETOR } from './setores.js';

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatarReais(valor) {
  return reais.format(valor);
}

export function formatarPct(valor) {
  const arredondado = Math.round(valor * 10) / 10;
  if (arredondado > 0) return `▲ +${decimal1.format(arredondado)}%`;
  if (arredondado < 0) return `▼ −${decimal1.format(-arredondado)}%`;
  return `● ${decimal1.format(0)}%`;
}

export function classeVariacao(valor) {
  const arredondado = Math.round(valor * 10) / 10;
  if (arredondado > 0) return 'sobe';
  if (arredondado < 0) return 'cai';
  return 'neutro';
}

export function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const f of filhos.flat()) {
    if (f === null || f === undefined || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

export function seloAcao(acao, grande = false) {
  return el('div', {
    class: grande ? 'selo selo-grande' : 'selo',
    style: `--cor-setor: ${CORES_SETOR[acao.setor] ?? '#64748b'}`,
    'aria-hidden': 'true',
  }, acao.ticker.slice(0, 4));
}

// Evita que um toque duplo dispare a ação duas vezes.
export function umaVez(acao) {
  let usado = false;
  return (evento) => {
    if (usado) return;
    usado = true;
    if (evento?.currentTarget) evento.currentTarget.disabled = true;
    acao(evento);
  };
}

export function animarNumero(elemento, de, ate, ms, formatador) {
  const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduzir || ms <= 0) {
    elemento.textContent = formatador(ate);
    return Promise.resolve();
  }
  return new Promise((resolver) => {
    const inicio = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / ms);
      const suave = 1 - (1 - t) ** 3;
      elemento.textContent = formatador(de + (ate - de) * suave);
      if (t < 1) requestAnimationFrame(passo);
      else resolver();
    };
    requestAnimationFrame(passo);
  });
}

export function confete(container) {
  const cores = ['#22c55e', '#facc15', '#38bdf8', '#f472b6', '#a78bfa'];
  const camada = el('div', { class: 'confete', 'aria-hidden': 'true' });
  for (let i = 0; i < 60; i++) {
    camada.append(el('span', {
      style: `left:${Math.random() * 100}%; background:${cores[i % cores.length]};` +
        `animation-delay:${Math.random() * 0.4}s; animation-duration:${1.4 + Math.random()}s;` +
        `transform: rotate(${Math.random() * 360}deg)`,
    }));
  }
  container.append(camada);
  setTimeout(() => camada.remove(), 2800);
}

// Chama `acao` quando o dedo fica parado sobre o elemento por `ms` milissegundos.
export function pressionarLongo(elemento, ms, acao) {
  let timer = null;
  const cancelar = () => { clearTimeout(timer); timer = null; };
  elemento.addEventListener('pointerdown', () => {
    cancelar();
    timer = setTimeout(() => { timer = null; acao(); }, ms);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) elemento.addEventListener(ev, cancelar);
}
