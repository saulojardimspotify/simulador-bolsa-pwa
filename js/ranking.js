// Ranking do dia: validação de nomes, ordenação e persistência no localStorage.
import { semAcento } from './carteira.js';

export const TITULOS = ['Mestre', 'Investidor(a)', 'Administrador(a)', 'Dr(a).', 'Chefe', 'CEO', 'Magnata', 'Professor(a)'];
export const CHAVE_RANKING = 'simulador-bolsa:ranking';

const FORMATO_NOME = /^[A-Za-zÀ-ÿ ]{1,12}$/;
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a' };

// Bloqueados se aparecerem em qualquer parte do nome (sem espaços).
const PALAVROES_TRECHO = [
  'porra', 'caralho', 'carai', 'buceta', 'boceta', 'xoxota', 'xereca', 'piroca', 'punheta',
  'cacete', 'foder', 'fodase', 'foda', 'merda', 'bosta', 'puta', 'arrombad', 'desgraca',
  'otario', 'babaca', 'idiota', 'imbecil', 'retardad', 'corno', 'vagabund', 'vadia', 'cuzao',
  'bunda', 'viado', 'sapatao', 'traveco', 'safado', 'broxa', 'peido', 'chupa', 'mamada',
  'nazista', 'hitler', 'escroto', 'lixo',
];
// Bloqueados só como palavra inteira, para não barrar nomes como Paula ou Escudero.
const PALAVROES_PALAVRA = ['cu', 'pau', 'fdp', 'pqp', 'vsf', 'tnc', 'krl', 'crl', 'bicha', 'piranha', 'macaco', 'mona'];

export function normalizarNome(texto) {
  return texto.trim().replace(/\s+/g, ' ');
}

function temPalavrao(nome) {
  const limpo = semAcento(nome).replace(/[0134578@]/g, (c) => LEET[c] ?? c);
  const compacto = limpo.replace(/\s/g, '');
  if (PALAVROES_TRECHO.some((p) => compacto.includes(p))) return true;
  const palavras = [...limpo.split(' '), compacto];
  return palavras.some((p) => PALAVROES_PALAVRA.includes(p));
}

export function nomePermitido(nome) {
  const n = normalizarNome(nome);
  if (n && temPalavrao(n)) return { ok: false, motivo: 'palavrao' };
  if (!FORMATO_NOME.test(n)) return { ok: false, motivo: 'formato' };
  return { ok: true };
}

function comparar(a, b) {
  return b.retornoPct - a.retornoPct || b.acertos - a.acertos || a.timestamp - b.timestamp;
}

export function inserirNoRanking(lista, entrada) {
  const nova = [...lista, entrada].sort(comparar);
  return { lista: nova, posicao: nova.indexOf(entrada) + 1 };
}

export function topN(lista, n = 10) {
  return lista.slice(0, n);
}

export function removerEntrada(lista, timestamp) {
  return lista.filter((e) => e.timestamp !== timestamp);
}

export function carregarRanking(storage, hoje) {
  try {
    const dados = JSON.parse(storage.getItem(CHAVE_RANKING));
    if (dados?.data !== hoje || !Array.isArray(dados.entradas)) return [];
    return dados.entradas;
  } catch {
    return [];
  }
}

export function salvarRanking(storage, hoje, lista) {
  try {
    storage.setItem(CHAVE_RANKING, JSON.stringify({ data: hoje, entradas: lista }));
    return true;
  } catch {
    return false;
  }
}

export function dataHoje(agora = new Date()) {
  const dois = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}
