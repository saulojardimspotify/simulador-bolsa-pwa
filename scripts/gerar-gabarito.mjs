// Gera gabarito.xlsx com a resposta certa (sobe, cai ou neutra) e a variação de cada ação em cada notícia.
// Uso: node scripts/gerar-gabarito.mjs   (rode de novo sempre que editar data/eventos.json)
import { readFileSync, writeFileSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const ler = (arq) => JSON.parse(readFileSync(new URL(arq, raiz), 'utf8'));
const eventos = ler('data/eventos.json');
const { acoes, dataReferencia } = ler('data/acoes.json');
const porTicker = Object.fromEntries(acoes.map((a) => [a.ticker, a]));
const tickers = [...acoes].sort((a, b) => a.setor.localeCompare(b.setor) || a.ticker.localeCompare(b.ticker)).map((a) => a.ticker);

// ---------- Estilos (índices de cellXfs em styles.xml) ----------
const E = {
  texto: 0, cabecalho: 1, quebra: 2, sobe: 3, cai: 4, neutra: 5,
  pctSobe: 6, pctCai: 7, pctNeutra: 8, negrito: 9, titulo: 10, centro: 11,
};
const RESPOSTA = { sobe: ['▲ Sobe', E.sobe, E.pctSobe], cai: ['▼ Cai', E.cai, E.pctCai], neutra: ['● Neutra', E.neutra, E.pctNeutra] };
const direcao = (v) => (v > 0 ? 'sobe' : v < 0 ? 'cai' : 'neutra');

// ---------- Células e planilhas ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function coluna(n) {
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
const txt = (v, s = E.texto) => ({ t: 's', v, s });
const num = (v, s = E.texto) => ({ t: 'n', v, s });

function planilha(linhas, { larguras = [], congelar = null, filtro = false, alturas = {} } = {}) {
  const xmlLinhas = linhas.map((cels, r) => {
    const ht = alturas[r] ? ` ht="${alturas[r]}" customHeight="1"` : '';
    const c = cels.map((cel, i) => {
      if (cel == null) return '';
      const ref = `${coluna(i)}${r + 1}`;
      return cel.t === 'n'
        ? `<c r="${ref}" s="${cel.s}"><v>${cel.v}</v></c>`
        : `<c r="${ref}" s="${cel.s}" t="inlineStr"><is><t xml:space="preserve">${esc(cel.v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}"${ht}>${c}</row>`;
  }).join('');
  const pane = congelar
    ? `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${congelar[0]}" ySplit="${congelar[1]}" topLeftCell="${coluna(congelar[0])}${congelar[1] + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const cols = larguras.length ? `<cols>${larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const ultima = `${coluna(Math.max(...linhas.map((l) => l.length)) - 1)}${linhas.length}`;
  const auto = filtro ? `<autoFilter ref="A1:${ultima}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${xmlLinhas}</sheetData>${auto}</worksheet>`;
}

// ---------- Aba 1: gabarito por evento ----------
const cab1 = ['Nº', 'Manchete', 'Empresa', 'Código', 'Setor', 'Resposta certa', 'Variação no jogo', 'Por quê'];
const linhas1 = [cab1.map((c) => txt(c, E.cabecalho))];
eventos.forEach((ev, i) => {
  const citadas = Object.entries(ev.impactos).sort((a, b) => b[1] - a[1]);
  for (const [t, v] of citadas) {
    const [rotulo, estilo, estiloPct] = RESPOSTA[direcao(v)];
    const a = porTicker[t];
    linhas1.push([num(i + 1, E.centro), txt(ev.manchete, E.quebra), txt(a.nome), txt(t), txt(a.setor),
      txt(rotulo, estilo), num(v / 100, estiloPct), txt(ev.motivos[t], E.quebra)]);
  }
  const g = ev.impactoGeral ?? 0;
  const [rotulo, estilo, estiloPct] = RESPOSTA[direcao(g)];
  linhas1.push([num(i + 1, E.centro), txt(ev.manchete, E.quebra), txt('Todas as outras ações', E.negrito), txt('—'), txt('—'),
    txt(rotulo, estilo), num(g / 100, estiloPct),
    txt(g ? ev.motivoGeral : 'A notícia não é sobre essas empresas', E.quebra)]);
});

// ---------- Aba 2: matriz notícia × ação ----------
const linhas2 = [[txt('Nº', E.cabecalho), txt('Manchete', E.cabecalho), ...tickers.map((t) => txt(t, E.cabecalho))]];
linhas2.push([txt('', E.cabecalho), txt('Setor →', E.cabecalho), ...tickers.map((t) => txt(porTicker[t].setor, E.cabecalho))]);
eventos.forEach((ev, i) => {
  linhas2.push([num(i + 1, E.centro), txt(ev.manchete, E.quebra), ...tickers.map((t) => {
    const v = ev.impactos[t] ?? ev.impactoGeral ?? 0;
    return num(v / 100, RESPOSTA[direcao(v)][2]);
  })]);
});

// ---------- Aba 3: leia-me ----------
const [ano, mes, dia] = dataReferencia.split('-');
const linhas3 = [
  [txt('Gabarito do Simulador da Bolsa', E.titulo)],
  [txt(`Gerado a partir de data/eventos.json (${eventos.length} notícias) e data/acoes.json (${acoes.length} ações, preços de ${dia}/${mes}/${ano}).`)],
  [txt('')],
  [txt('Como ler', E.negrito)],
  [txt('• "Gabarito por evento": para cada notícia, as empresas citadas com a resposta certa e a variação, e uma linha final "Todas as outras ações".')],
  [txt('• "Todas as outras ações" sobe ou cai só nas notícias de economia geral (juros, PIB, crise...). Nas outras notícias elas ficam neutras (0%).')],
  [txt('• "Matriz": a variação de qualquer ação em qualquer notícia. Verde = sobe, vermelho = cai, cinza = neutra.')],
  [txt('')],
  [txt('Sobre a variação', E.negrito)],
  [txt('• No jogo, a variação recebe um pequeno sorteio de até 10% do valor (no máximo 0,5 ponto) para as ações não ficarem idênticas.')],
  [txt('  Ex.: +6,0% pode aparecer entre +5,5% e +6,5%. A resposta certa (sobe, cai ou neutra) nunca muda.')],
  [txt('• Os efeitos se acumulam de uma rodada para a outra: o preço da rodada seguinte parte do preço da anterior.')],
  [txt('')],
  [txt('Para atualizar esta planilha depois de editar as notícias: node scripts/gerar-gabarito.mjs', E.negrito)],
];

// ---------- styles.xml ----------
const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="+0.0%;-0.0%;0.0%"/></numFmts>
<fonts count="6">
<font><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
<font><b/><sz val="10"/><color rgb="FF0B6B3A"/><name val="Arial"/></font>
<font><b/><sz val="10"/><color rgb="FFB42318"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="14"/><name val="Arial"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF16213A"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD7F5E5"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFDE2E1"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEEF1F5"/></patternFill></fill>
</fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFD0D5DD"/></left><right style="thin"><color rgb="FFD0D5DD"/></right><top style="thin"><color rgb="FFD0D5DD"/></top><bottom style="thin"><color rgb="FFD0D5DD"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
</cellXfs>
</styleSheet>`;

const abas = [
  ['Gabarito por evento', planilha(linhas1, { larguras: [5, 48, 26, 10, 22, 14, 14, 44], congelar: [0, 1], filtro: true, alturas: { 0: 30 } })],
  ['Matriz', planilha(linhas2, { larguras: [5, 46, ...tickers.map(() => 9)], congelar: [2, 2], alturas: { 1: 60 } })],
  ['Leia-me', planilha(linhas3, { larguras: [120] })],
];

const arquivos = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${abas.map(([nome], i) => `<sheet name="${esc(nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${'<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'Gabarito por evento\'!$A$1:$H$' + linhas1.length + '</definedName></definedNames>'}
</workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  'xl/styles.xml': estilos,
  ...Object.fromEntries(abas.map(([, xml], i) => [`xl/worksheets/sheet${i + 1}.xml`, xml])),
};

// ---------- ZIP (sem compressão) ----------
const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(entradas) {
  const partes = [];
  const central = [];
  let offset = 0;
  for (const [nome, conteudo] of Object.entries(entradas)) {
    const dados = Buffer.from(conteudo, 'utf8');
    const nomeBuf = Buffer.from(nome, 'utf8');
    const crc = crc32(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0x00210000, 10); // data fixa 01/01/1980
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dados.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    partes.push(local, nomeBuf, dados);
    const cab = Buffer.alloc(46);
    cab.writeUInt32LE(0x02014b50, 0);
    cab.writeUInt16LE(20, 4);
    cab.writeUInt16LE(20, 6);
    cab.writeUInt16LE(0x0800, 8);
    cab.writeUInt32LE(0x00210000, 12);
    cab.writeUInt32LE(crc, 16);
    cab.writeUInt32LE(dados.length, 20);
    cab.writeUInt32LE(dados.length, 24);
    cab.writeUInt16LE(nomeBuf.length, 28);
    cab.writeUInt32LE(offset, 42);
    central.push(cab, nomeBuf);
    offset += 30 + nomeBuf.length + dados.length;
  }
  const centralBuf = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(Object.keys(entradas).length, 8);
  fim.writeUInt16LE(Object.keys(entradas).length, 10);
  fim.writeUInt32LE(centralBuf.length, 12);
  fim.writeUInt32LE(offset, 16);
  return Buffer.concat([...partes, centralBuf, fim]);
}

const destino = new URL('gabarito.xlsx', raiz);
writeFileSync(destino, zip(arquivos));
console.log(`gabarito.xlsx gerado: ${linhas1.length - 1} linhas no gabarito, matriz ${eventos.length} × ${tickers.length}.`);
