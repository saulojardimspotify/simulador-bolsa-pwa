// Gera os ícones PNG do app (gráfico de barras subindo) sem dependências.
// Uso: node scripts/gerar-icones.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const FUNDO = [11, 18, 32];
const VERDE = [34, 197, 94];
const OURO = [250, 204, 21];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function bloco(tipo, dados) {
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}

function png(tamanho, pixel) {
  const linhas = [];
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 4);
    for (let x = 0; x < tamanho; x++) {
      const [r, g, b, a] = pixel(x / tamanho, y / tamanho);
      linha.set([r, g, b, a], 1 + x * 4);
    }
    linhas.push(linha);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(Buffer.concat(linhas))),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

// Distância do ponto (px, py) ao segmento (ax, ay)-(bx, by).
function distSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function desenho(margem, arredondar) {
  const escala = 1 - 2 * margem;
  return (u, v) => {
    if (arredondar) {
      const cx = Math.max(0.18 - u, u - 0.82, 0);
      const cy = Math.max(0.18 - v, v - 0.82, 0);
      if (Math.hypot(cx, cy) > 0.18) return [0, 0, 0, 0];
    }
    const x = (u - margem) / escala;
    const y = (v - margem) / escala;
    const barras = [[0.18, 0.62], [0.42, 0.48], [0.66, 0.3]];
    for (const [inicio, topo] of barras) {
      if (x >= inicio && x <= inicio + 0.16 && y >= topo && y <= 0.82) return [...VERDE, 255];
    }
    const seta = [[0.14, 0.5], [0.42, 0.3], [0.56, 0.4], [0.84, 0.16]];
    for (let i = 0; i < seta.length - 1; i++) {
      if (distSegmento(x, y, ...seta[i], ...seta[i + 1]) < 0.035) return [...OURO, 255];
    }
    if (distSegmento(x, y, 0.84, 0.16, 0.72, 0.17) < 0.035 || distSegmento(x, y, 0.84, 0.16, 0.83, 0.28) < 0.035) {
      return [...OURO, 255];
    }
    return [...FUNDO, 255];
  };
}

const pasta = new URL('../icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', pasta), png(192, desenho(0.08, true)));
writeFileSync(new URL('icon-512.png', pasta), png(512, desenho(0.08, true)));
writeFileSync(new URL('icon-maskable-512.png', pasta), png(512, desenho(0.2, false)));
console.log('Ícones gerados em icons/');
