// Baixa os logos das empresas (brapi.dev) para logos/ e marca em data/acoes.json quais existem.
// Uso: node scripts/baixar-logos.mjs   (baixa só os que ainda não estão na pasta)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const arquivoAcoes = new URL('../data/acoes.json', import.meta.url);
const pasta = new URL('../logos/', import.meta.url);
mkdirSync(pasta, { recursive: true });
const dados = JSON.parse(readFileSync(arquivoAcoes, 'utf8'));

const faltando = [];
let baixados = 0;
for (const acao of dados.acoes) {
  const destino = new URL(`${acao.ticker}.svg`, pasta);
  if (!existsSync(destino)) {
    try {
      const resp = await fetch(`https://icons.brapi.dev/icons/${acao.ticker}.svg`);
      const tipo = resp.headers.get('content-type') ?? '';
      const svg = await resp.text();
      // Só aceita SVG de verdade, sem scripts nem referências externas.
      if (!resp.ok || !tipo.includes('svg') || !svg.trimStart().startsWith('<svg') || /<script|href\s*=\s*["']https?:/i.test(svg)) {
        throw new Error(`resposta inválida (${resp.status})`);
      }
      writeFileSync(destino, svg);
      baixados += 1;
    } catch (erro) {
      faltando.push(`${acao.ticker} (${erro.message})`);
    }
  }
  acao.logo = existsSync(destino);
}

writeFileSync(arquivoAcoes, JSON.stringify(dados, null, 2) + '\n');
console.log(`${baixados} logos baixados; ${dados.acoes.filter((a) => a.logo).length} de ${dados.acoes.length} ações têm logo.`);
if (faltando.length) console.log(`Sem logo (vão usar o selo com iniciais): ${faltando.join(', ')}`);
