// Atualiza os preços de data/acoes.json com a última cotação do Yahoo Finance.
// Uso: node scripts/atualizar-precos.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const arquivo = new URL('../data/acoes.json', import.meta.url);
const dados = JSON.parse(readFileSync(arquivo, 'utf8'));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function cotacao(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?range=5d&interval=1d`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const meta = (await resp.json()).chart.result[0].meta;
  return { preco: Math.round(meta.regularMarketPrice * 100) / 100, quando: meta.regularMarketTime };
}

const falhas = [];
let maisRecente = 0;
for (const acao of dados.acoes) {
  try {
    const { preco, quando } = await cotacao(acao.ticker);
    acao.preco = preco;
    maisRecente = Math.max(maisRecente, quando);
  } catch (erro) {
    falhas.push(`${acao.ticker} (${erro.message})`);
  }
  await pausa(200);
}

if (maisRecente) dados.dataReferencia = new Date(maisRecente * 1000).toISOString().slice(0, 10);
writeFileSync(arquivo, JSON.stringify(dados, null, 2) + '\n');

console.log(`${dados.acoes.length - falhas.length} preços atualizados (data ${dados.dataReferencia}).`);
if (falhas.length) console.log(`Mantiveram o preço anterior: ${falhas.join(', ')}`);
const semPreco = dados.acoes.filter((a) => !(a.preco > 0)).map((a) => a.ticker);
if (semPreco.length) {
  console.error(`Sem preço: ${semPreco.join(', ')}`);
  process.exit(1);
}
