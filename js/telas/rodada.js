import { el, seloAcao, formatarReais, formatarPct, classeVariacao, animarNumero, confete, umaVez } from '../ui.js';
import { aplicarEvento, avaliarPalpite, valorCarteira, LIMIAR_IGUAL } from '../motor.js';

const TOTAL_RODADAS = 5;
const PALPITES = { sobe: '▲ subir', igual: '● fica igual', cai: '▼ cair' };
const ANIMACAO_MS = 1200;

export function render(container, estado, irPara) {
  const evento = estado.eventosPartida[estado.rodada];
  const valorAtual = valorCarteira(estado.carteira);
  const valorEl = el('b', { class: 'placar-valor' }, formatarReais(valorAtual));
  const acertosEl = el('b', {}, `${estado.acertos}`);
  const area = el('div', { class: 'rodada-area' });

  const placar = el('div', { class: 'placar' },
    el('div', {}, el('span', { class: 'suave' }, 'Rodada '), el('b', {}, `${estado.rodada + 1} de ${TOTAL_RODADAS}`)),
    el('div', {}, el('span', { class: 'suave' }, 'Sua carteira '), valorEl),
    el('div', {}, el('span', { class: 'suave' }, 'Palpites certos '), acertosEl));

  const manchete = el('article', { class: 'manchete' },
    el('div', { class: 'plantao' }, '🔴 PLANTÃO DE NOTÍCIAS'),
    el('h1', {}, evento.manchete));

  let revelado = false;
  function revelar(palpite) {
    // Subir e Cair dividem a mesma trava: um toque com dois dedos não aplica o evento duas vezes.
    if (revelado) return;
    revelado = true;
    const r = aplicarEvento(estado.carteira, evento);
    const acertou = avaliarPalpite(palpite, r.valorAntes, r.valorDepois);
    estado.carteira = r.carteira;
    if (acertou) estado.acertos += 1;
    estado.historico.push({ eventoId: evento.id, palpite, acertou, valorAntes: r.valorAntes, valorDepois: r.valorDepois });

    const variacaoTotal = ((r.valorDepois - r.valorAntes) / r.valorAntes) * 100;
    const ultima = estado.rodada === TOTAL_RODADAS - 1;
    const linhas = r.resultados.map((res, i) => {
      const acao = estado.carteira.posicoes[i].acao;
      const precoEl = el('span', { class: 'res-preco' }, formatarReais(res.precoAntes));
      animarNumero(precoEl, res.precoAntes, res.precoDepois, ANIMACAO_MS, formatarReais);
      return el('div', { class: `res-linha ${classeVariacao(res.pct)}${res.investida ? '' : ' nao-investida'}` },
        seloAcao(acao),
        el('div', { class: 'res-info' },
          el('div', { class: 'card-nome' }, acao.nome, res.investida ? '' : el('span', { class: 'etiqueta' }, 'não investida')),
          el('div', { class: 'res-motivo' }, res.motivo ?? (res.afetada ? 'Afetada pela notícia' : 'Pouco afetada por esta notícia'))),
        el('div', { class: 'res-numeros' },
          precoEl,
          el('span', { class: 'res-pct' }, formatarPct(res.pct)),
          res.investida && res.afetada ? el('span', { class: 'res-reais' }, `${res.variacaoReais >= 0 ? '+' : '−'}${formatarReais(Math.abs(res.variacaoReais))}`) : null));
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

    area.replaceChildren(el('div', { class: 'revelacao' },
      el('div', { class: `feedback ${acertou ? 'acertou' : 'errou'}` },
        acertou ? '🎯 Você acertou!' : '😅 Não foi dessa vez',
        el('span', { class: 'feedback-detalhe' },
          ` Você disse ${PALPITES[palpite]}. Sua carteira: `,
          el('b', { class: classeVariacao(variacaoTotal) }, formatarPct(variacaoTotal)),
          Math.abs(variacaoTotal) < LIMIAR_IGUAL ? ` (menos de ${LIMIAR_IGUAL.toLocaleString('pt-BR')}% conta como "fica igual")` : '')),
      el('div', { class: 'res-lista' }, linhas),
      r.algumaInvestidaAfetada ? null
        : el('p', { class: 'ileso' }, 'Seu setor passou ileso desta vez, e isso também é diversificação!'),
      el('div', { class: 'explicacao' }, el('h2', {}, 'Por que isso aconteceu?'), el('p', {}, evento.explicacao)),
      seguir));

    animarNumero(valorEl, r.valorAntes, r.valorDepois, ANIMACAO_MS, formatarReais);
    acertosEl.textContent = `${estado.acertos}`;
    if (acertou) confete(container);
  }

  area.append(el('div', { class: 'palpite' },
    el('h2', {}, 'O que acontece com sua carteira depois dessa notícia?'),
    el('div', { class: 'carteira-mini' }, estado.carteira.posicoes.map((p) =>
      el('span', { class: `mini${p.percentual === 0 ? ' zerada' : ''}` }, seloAcao(p.acao), `${p.acao.nome} · ${p.percentual}%`))),
    el('div', { class: 'palpite-botoes' },
      el('button', { class: 'botao botao-sobe botao-enorme', onclick: umaVez(() => revelar('sobe')) }, '▲ Subir'),
      el('button', { class: 'botao botao-igual botao-enorme', onclick: umaVez(() => revelar('igual')) }, '● Fica igual'),
      el('button', { class: 'botao botao-cai botao-enorme', onclick: umaVez(() => revelar('cai')) }, '▼ Cair'))));

  container.append(el('section', { class: 'tela-rodada' }, placar, manchete, area));
}
