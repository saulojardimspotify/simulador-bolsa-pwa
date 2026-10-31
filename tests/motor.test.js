import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sortearEventos, variacaoAcao, valorCarteira, aplicarEvento, avaliarPalpite, licaoFinal,
  LIMIAR_IGUAL, eventoAfetaCarteira,
} from '../js/motor.js';
import { SETORES, CORES_SETOR } from '../js/setores.js';

const meio = () => 0.5; // ruído zero

function lcg(semente) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const acao = (ticker, setor, preco = 10) =>
  ({ ticker, nome: ticker, setor, porte: 'Grande', bonsDividendos: false, preco });

const MGLU = acao('MGLU3', 'Varejo e Consumo');
const LREN = acao('LREN3', 'Varejo e Consumo');
const ITUB = acao('ITUB4', 'Bancos e Finanças');
const PETR = acao('PETR4', 'Petróleo e Gás');

const selic = {
  id: 'selic-sobe',
  manchete: 'Selic sobe',
  explicacao: 'x',
  impactoSetores: { 'Varejo e Consumo': -6, 'Bancos e Finanças': 3 },
  impactoAcoes: { MGLU3: -9 },
  motivos: { 'Varejo e Consumo': 'Varejo é sensível aos juros' },
};

function carteira(acoes, percentuais, capital = 10000) {
  return {
    valorInicial: capital,
    posicoes: acoes.map((a, i) => ({
      acao: a,
      percentual: percentuais[i],
      quantidade: (capital * percentuais[i]) / 100 / a.preco,
      preco: a.preco,
    })),
  };
}

test('setores: 12 setores com cor', () => {
  assert.equal(SETORES.length, 12);
  assert.equal(SETORES[0], 'Bancos e Finanças');
  assert.equal(SETORES[11], 'Indústria e Papel');
  for (const s of SETORES) assert.match(CORES_SETOR[s], /^#[0-9a-f]{6}$/i);
});

test('variacaoAcao: impacto próprio da ação vence o do setor', () => {
  const r = variacaoAcao(MGLU, selic, meio);
  assert.equal(r.pct, -9);
  assert.equal(r.afetada, true);
});

test('variacaoAcao: sem impacto próprio usa o setor e seu motivo', () => {
  const r = variacaoAcao(LREN, selic, meio);
  assert.equal(r.pct, -6);
  assert.equal(r.afetada, true);
  assert.equal(r.motivo, 'Varejo é sensível aos juros');
});

test('variacaoAcao: setor não citado fica em zero', () => {
  const r = variacaoAcao(PETR, selic, meio);
  assert.equal(r.pct, 0);
  assert.equal(r.afetada, false);
  assert.equal(r.motivo, null);
});

test('variacaoAcao: ação fora dos setores citados acompanha o mercado', () => {
  const ev = { ...selic, impactoMercado: -2 };
  const r = variacaoAcao(PETR, ev, meio);
  assert.equal(r.pct, -2);
  assert.equal(r.afetada, false);
  assert.equal(r.origem, 'mercado');
  assert.equal(r.motivo, 'Acompanhou o mercado');
  assert.equal(variacaoAcao(PETR, { ...ev, motivoMercado: 'Bolsa toda caiu' }, meio).motivo, 'Bolsa toda caiu');
});

test('variacaoAcao: ruído nunca inverte o sinal de um efeito pequeno', () => {
  const ev = { id: 'e', impactoSetores: {}, impactoMercado: -0.5 };
  assert.ok(variacaoAcao(PETR, ev, () => 0.999999).pct < 0);
  assert.ok(variacaoAcao(PETR, ev, () => 0).pct < 0);
  assert.ok(Math.abs(variacaoAcao(PETR, ev, () => 0).pct - -0.65) < 1e-9);
});

test('variacaoAcao: origem indica de onde veio o impacto', () => {
  assert.equal(variacaoAcao(MGLU, selic, meio).origem, 'acao');
  assert.equal(variacaoAcao(LREN, selic, meio).origem, 'setor');
});

test('variacaoAcao: ação não afetada não recebe ruído', () => {
  assert.equal(variacaoAcao(PETR, selic, () => 0).pct, 0);
  assert.equal(variacaoAcao(PETR, selic, () => 0.99).pct, 0);
});

test('aplicarEvento: carteira sem ação afetada fica exatamente igual', () => {
  const ev = { id: 'e', manchete: '', explicacao: '', impactoSetores: { 'Saúde': 5 } };
  const r = aplicarEvento(carteira([PETR, ITUB, LREN], [40, 30, 30]), ev, () => 0);
  assert.equal(r.valorDepois, r.valorAntes);
  assert.equal(r.algumaInvestidaAfetada, false);
});

test('variacaoAcao: motivo por ticker tem prioridade', () => {
  const ev = { ...selic, motivos: { MGLU3: 'Muito endividada', 'Varejo e Consumo': 'Varejo' } };
  assert.equal(variacaoAcao(MGLU, ev, meio).motivo, 'Muito endividada');
});

test('variacaoAcao: ruído fica entre -1 e +1', () => {
  assert.equal(variacaoAcao(LREN, selic, () => 0).pct, -7);
  assert.ok(Math.abs(variacaoAcao(LREN, selic, () => 0.999999).pct - -5) < 0.001);
});

test('aplicarEvento: -10% no setor da 1ª ação com 40% derruba 400', () => {
  const ev = { id: 'e', manchete: '', explicacao: '', impactoSetores: { 'Varejo e Consumo': -10 } };
  const c = carteira([LREN, ITUB, PETR], [40, 30, 30]);
  const r = aplicarEvento(c, ev, meio);
  assert.equal(r.valorAntes, 10000);
  assert.ok(Math.abs(r.valorDepois - 9600) < 1e-9);
  assert.ok(Math.abs(r.carteira.posicoes[0].preco - 9) < 1e-9);
  assert.equal(c.posicoes[0].preco, 10, 'não muta a entrada');
  assert.equal(r.resultados[0].ticker, 'LREN3');
  assert.ok(Math.abs(r.resultados[0].variacaoReais - -400) < 1e-9);
  assert.equal(r.algumaInvestidaAfetada, true);
});

test('aplicarEvento: efeitos se acumulam entre rodadas', () => {
  const ev = { id: 'e', manchete: '', explicacao: '', impactoSetores: { 'Petróleo e Gás': 10 } };
  const c1 = aplicarEvento(carteira([PETR, ITUB, LREN], [40, 30, 30]), ev, meio).carteira;
  const c2 = aplicarEvento(c1, ev, meio).carteira;
  assert.ok(Math.abs(c2.posicoes[0].preco - 12.1) < 1e-9);
});

test('aplicarEvento: ação com 0% muda de preço mas não o valor', () => {
  const ev = { id: 'e', manchete: '', explicacao: '', impactoSetores: { 'Bancos e Finanças': 10 } };
  const r = aplicarEvento(carteira([PETR, ITUB, LREN], [100, 0, 0]), ev, meio);
  assert.equal(r.valorDepois, r.valorAntes);
  assert.equal(r.resultados[1].investida, false);
  assert.equal(r.resultados[1].afetada, true);
  assert.equal(r.algumaInvestidaAfetada, false);
  assert.ok(Math.abs(r.resultados[1].precoDepois - 11) < 1e-9);
});

test('valorCarteira soma quantidade × preço', () => {
  assert.equal(valorCarteira(carteira([PETR, ITUB, LREN], [40, 30, 30])), 10000);
});

test('avaliarPalpite: sobe e cai precisam de pelo menos 0,5%', () => {
  assert.equal(LIMIAR_IGUAL, 0.5);
  assert.equal(avaliarPalpite('sobe', 100, 101), true);
  assert.equal(avaliarPalpite('sobe', 100, 100.5), true);
  assert.equal(avaliarPalpite('sobe', 100, 100.4), false);
  assert.equal(avaliarPalpite('cai', 100, 101), false);
  assert.equal(avaliarPalpite('cai', 100, 99), true);
  assert.equal(avaliarPalpite('cai', 100, 99.6), false);
  assert.equal(avaliarPalpite('cai', 100, 100), false);
});

test('avaliarPalpite: fica igual acerta só dentro de ±0,5%', () => {
  assert.equal(avaliarPalpite('igual', 100, 100), true);
  assert.equal(avaliarPalpite('igual', 100, 100.4), true);
  assert.equal(avaliarPalpite('igual', 100, 99.6), true);
  assert.equal(avaliarPalpite('igual', 100, 100.5), false);
  assert.equal(avaliarPalpite('igual', 100, 99.5), false);
});

test('eventoAfetaCarteira: só conta ações com mais de 0%', () => {
  const c = carteira([PETR, ITUB, LREN], [100, 0, 0]);
  assert.equal(eventoAfetaCarteira({ impactoSetores: { 'Petróleo e Gás': 3 } }, c), true);
  assert.equal(eventoAfetaCarteira({ impactoSetores: { 'Bancos e Finanças': 3 } }, c), false);
  assert.equal(eventoAfetaCarteira({ impactoSetores: {}, impactoAcoes: { PETR4: 5 } }, c), true);
});

test('sortearEventos: prioriza eventos que afetam a carteira', () => {
  const eventos = Array.from({ length: 20 }, (_, i) => ({
    id: `e${i}`, impactoSetores: {}, relevante: i < 6, grupo: i === 0 || i === 1 ? 'juros' : undefined,
  }));
  const rng = lcg(7);
  for (let k = 0; k < 200; k++) {
    const s = sortearEventos(eventos, 5, rng, (e) => e.relevante);
    assert.equal(s.length, 5);
    assert.ok(s.every((e) => e.relevante), s.map((e) => e.id).join());
    assert.ok(s.filter((e) => e.grupo === 'juros').length <= 1);
  }
});

test('sortearEventos: completa com outros quando faltam relevantes', () => {
  const eventos = Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, impactoSetores: {}, relevante: i < 2 }));
  const s = sortearEventos(eventos, 5, lcg(3), (e) => e.relevante);
  assert.equal(s.length, 5);
  assert.equal(s.filter((e) => e.relevante).length, 2);
});

test('sortearEventos: 5 únicos e no máximo 1 por grupo', () => {
  const eventos = Array.from({ length: 10 }, (_, i) => ({
    id: `e${i}`, manchete: '', explicacao: '', impactoSetores: {},
    grupo: i < 2 ? 'juros' : undefined,
  }));
  const rng = lcg(42);
  for (let k = 0; k < 200; k++) {
    const s = sortearEventos(eventos, 5, rng);
    assert.equal(s.length, 5);
    assert.equal(new Set(s.map((e) => e.id)).size, 5);
    assert.ok(s.filter((e) => e.grupo === 'juros').length <= 1);
  }
});

test('sortearEventos: lança se não há eventos suficientes', () => {
  const eventos = [1, 2, 3].map((i) => ({ id: `e${i}`, impactoSetores: {} }));
  assert.throws(() => sortearEventos(eventos, 5), /Eventos insuficientes/);
});

const BANCO = acao('BBAS3', 'Bancos e Finanças');
const MINA = acao('VALE3', 'Mineração e Siderurgia');

test('licaoFinal: aposta concentrada numa ação', () => {
  const l = licaoFinal(carteira([PETR, ITUB, LREN], [80, 10, 10]), 3);
  assert.deepEqual(l, ['Você apostou quase tudo numa ação só: o resultado dependeu dela.']);
});

test('licaoFinal: todas no mesmo setor', () => {
  const l = licaoFinal(carteira([ITUB, BANCO, acao('BBDC4', 'Bancos e Finanças')], [40, 30, 30]), 3);
  assert.equal(l[0], 'Carteira concentrada: tudo subiu ou caiu junto. Diversificar reduz o risco.');
});

test('licaoFinal: duas no mesmo setor', () => {
  const l = licaoFinal(carteira([ITUB, BANCO, PETR], [40, 30, 30]), 3);
  assert.equal(l[0], 'Diversificação parcial: duas ações dependiam das mesmas notícias.');
});

test('licaoFinal: três setores diferentes', () => {
  const l = licaoFinal(carteira([ITUB, PETR, MINA], [40, 30, 30]), 3);
  assert.equal(l[0], 'Boa diversificação: quando um setor caía, outro segurava.');
});

test('licaoFinal: ação com 0% é ignorada', () => {
  const l = licaoFinal(carteira([ITUB, PETR, BANCO], [50, 50, 0]), 3);
  assert.equal(l[0], 'Boa diversificação: quando um setor caía, outro segurava.');
});

test('licaoFinal: comentário extra para retornos grandes', () => {
  const c = carteira([ITUB, PETR, MINA], [40, 30, 30]);
  assert.equal(licaoFinal(c, 12)[1],
    'Retorno alto também significa risco alto: ganhar muito em pouco tempo na bolsa envolve sorte.');
  assert.equal(licaoFinal(c, -12)[1],
    'Perdas fazem parte. Ações são investimento de longo prazo, e diversificar ajuda a amortecer quedas.');
  assert.equal(licaoFinal(c, 5).length, 1);
});
