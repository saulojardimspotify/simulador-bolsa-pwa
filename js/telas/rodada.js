import { el, seloAcao, formatarReais, formatarPct, classeVariacao, animarNumero, confete, umaVez } from '../ui.js';
import { aplicarEvento, contarAcertos, valorCarteira } from '../motor.js';

const TOTAL_RODADAS = 5;
const OPCOES = [
  { valor: 'sobe', rotulo: '▲ Sobe', classe: 'opcao-sobe' },
  { valor: 'neutra', rotulo: '● Neutra', classe: 'opcao-neutra' },
  { valor: 'cai', rotulo: '▼ Cai', classe: 'opcao-cai' },
];
const NOME_DIRECAO = { sobe: '▲ sobe', neutra: '● neutra', cai: '▼ cai' };
const ANIMACAO_MS = 1200;

export function render(container, estado, irPara) {
  const evento = estado.eventosPartida[estado.rodada];
  const posicoes = estado.carteira.posicoes;
  const maxAcertos = TOTAL_RODADAS * posicoes.length;
  const valorEl = el('b', { class: 'placar-valor' }, formatarReais(valorCarteira(estado.carteira)));
  const acertosEl = el('b', {}, `${estado.acertos} de ${maxAcertos}`);
  const area = el('div', { class: 'rodada-area' });
  const palpites = {};

  const placar = el('div', { class: 'placar' },
    el('div', {}, el('span', { class: 'suave' }, 'Rodada '), el('b', {}, `${estado.rodada + 1} de ${TOTAL_RODADAS}`)),
    el('div', {}, el('span', { class: 'suave' }, 'Sua carteira '), valorEl),
    el('div', {}, el('span', { class: 'suave' }, 'Palpites certos '), acertosEl));

  const manchete = el('article', { class: 'manchete' },
    el('div', { class: 'plantao' }, '🔴 PLANTÃO DE NOTÍCIAS'),
    el('h1', {}, evento.manchete));

  const revelarBtn = el('button', { class: 'botao botao-primario botao-enorme', disabled: true }, 'Ver o que aconteceu ▶');

  let revelado = false;
  function revelar() {
    // Trava única: um toque duplo não aplica o evento duas vezes.
    if (revelado || Object.keys(palpites).length < posicoes.length) return;
    revelado = true;
    const r = aplicarEvento(estado.carteira, evento);
    const acertos = contarAcertos(palpites, r.resultados);
    estado.carteira = r.carteira;
    estado.acertos += acertos;
    estado.historico.push({ eventoId: evento.id, palpites: { ...palpites }, acertos, valorAntes: r.valorAntes, valorDepois: r.valorDepois });

    const variacaoTotal = ((r.valorDepois - r.valorAntes) / r.valorAntes) * 100;
    const ultima = estado.rodada === TOTAL_RODADAS - 1;
    const linhas = r.resultados.map((res, i) => {
      const acao = estado.carteira.posicoes[i].acao;
      const certo = palpites[res.ticker] === res.direcao;
      const precoEl = el('span', { class: 'res-preco' }, formatarReais(res.precoAntes));
      animarNumero(precoEl, res.precoAntes, res.precoDepois, ANIMACAO_MS, formatarReais);
      return el('div', { class: `res-linha ${classeVariacao(res.pct)}${res.investida ? '' : ' nao-investida'}` },
        seloAcao(acao),
        el('div', { class: 'res-info' },
          el('div', { class: 'card-nome' }, acao.nome, res.investida ? '' : el('span', { class: 'etiqueta' }, 'não investida')),
          el('div', { class: 'res-motivo' }, res.motivo ?? 'A notícia não é sobre esta empresa'),
          el('div', { class: `res-palpite ${certo ? 'certo' : 'errado'}` },
            certo ? '✓ ' : '✗ ', `Você disse ${NOME_DIRECAO[palpites[res.ticker]]}`,
            certo ? '' : ` · ficou ${NOME_DIRECAO[res.direcao]}`)),
        el('div', { class: 'res-numeros' },
          precoEl,
          el('span', { class: 'res-pct' }, formatarPct(res.pct)),
          res.investida && res.pct !== 0 ? el('span', { class: 'res-reais' }, `${res.variacaoReais >= 0 ? '+' : '−'}${formatarReais(Math.abs(res.variacaoReais))}`) : null));
    });

    const seguir = el('button', {
      class: 'botao botao-primario botao-enorme',
      onclick: umaVez(() => {
        if (ultima) {
          irPara('resultado');
        } else {
          estado.rodada += 1;
          irPara('rodada');
        }
      }),
    }, ultima ? 'Ver resultado 🏁' : 'Seguir em frente ▶');

    const titulo = acertos === posicoes.length ? '🎯 Acertou todas!'
      : acertos === 0 ? '😅 Não foi dessa vez' : `👍 Você acertou ${acertos} de ${posicoes.length}`;
    area.replaceChildren(el('div', { class: 'revelacao' },
      el('div', { class: `feedback ${acertos === posicoes.length ? 'acertou' : 'errou'}` },
        titulo,
        el('span', { class: 'feedback-detalhe' }, ' Sua carteira nesta rodada: ',
          el('b', { class: classeVariacao(variacaoTotal) }, formatarPct(variacaoTotal)))),
      el('div', { class: 'res-lista' }, linhas),
      r.resultados.some((res) => res.afetada) ? null
        : el('p', { class: 'ileso' }, 'Essa notícia não era sobre nenhuma das suas empresas: as três ficaram neutras.'),
      el('div', { class: 'explicacao' }, el('h2', {}, 'Por que isso aconteceu?'), el('p', {}, evento.explicacao)),
      seguir));

    animarNumero(valorEl, r.valorAntes, r.valorDepois, ANIMACAO_MS, formatarReais);
    acertosEl.textContent = `${estado.acertos} de ${maxAcertos}`;
    if (acertos === posicoes.length) confete(container);
  }
  revelarBtn.addEventListener('click', revelar);

  const linhasPalpite = posicoes.map((p) => {
    const botoes = OPCOES.map((o) => el('button', {
      class: `opcao ${o.classe}`,
      'aria-pressed': 'false',
      onclick: () => {
        palpites[p.acao.ticker] = o.valor;
        for (const b of botoes) b.setAttribute('aria-pressed', b === botaoDe[o.valor] ? 'true' : 'false');
        revelarBtn.disabled = Object.keys(palpites).length < posicoes.length;
      },
    }, o.rotulo));
    const botaoDe = Object.fromEntries(OPCOES.map((o, i) => [o.valor, botoes[i]]));
    return el('div', { class: `palpite-linha${p.percentual === 0 ? ' zerada' : ''}` },
      seloAcao(p.acao),
      el('div', { class: 'palpite-acao' },
        el('div', { class: 'card-nome' }, p.acao.nome),
        el('div', { class: 'suave' }, `${p.acao.ticker} · ${p.percentual}% da carteira`)),
      el('div', { class: 'opcoes', role: 'group', 'aria-label': `Palpite para ${p.acao.nome}` }, botoes));
  });

  area.append(el('div', { class: 'palpite' },
    el('h2', {}, 'Com essa notícia, cada ação sobe, fica neutra ou cai?'),
    el('div', { class: 'palpite-lista' }, linhasPalpite),
    revelarBtn));

  container.append(el('section', { class: 'tela-rodada' }, placar, manchete, area));
}
