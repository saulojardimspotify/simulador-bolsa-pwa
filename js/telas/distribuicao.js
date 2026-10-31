import { el, seloAcao, formatarReais, umaVez } from '../ui.js';
import { PERCENTUAIS_PADRAO, ajustarPercentual, statusDistribuicao, criarCarteira } from '../carteira.js';
import { sortearEventos, eventoAfetaCarteira } from '../motor.js';
import { efeitos } from '../som.js';

const CAPITAL = 10000;

export function render(container, estado, irPara) {
  const acoes = estado.selecionadas.map((t) => estado.acoes.find((a) => a.ticker === t));
  if (!estado.percentuais) estado.percentuais = [...PERCENTUAIS_PADRAO];
  const linhas = el('div', { class: 'distribuicao-linhas' });
  const status = el('p', { class: 'status-distribuicao', 'aria-live': 'polite' });
  const confirmar = el('button', { class: 'botao botao-primario' }, 'Confirmar carteira ▶');

  confirmar.addEventListener('click', umaVez(() => {
    efeitos.sino();
    estado.carteira = criarCarteira(acoes, estado.percentuais, CAPITAL);
    estado.eventosPartida = sortearEventos(estado.eventos, 5, Math.random,
      (ev) => eventoAfetaCarteira(ev, estado.carteira));
    estado.rodada = 0;
    estado.acertos = 0;
    estado.historico = [];
    irPara('rodada');
  }));

  function ajustar(indice, delta) {
    estado.percentuais = ajustarPercentual(estado.percentuais, indice, delta);
    desenhar();
  }

  function desenhar() {
    linhas.replaceChildren(...acoes.map((a, i) => {
      const p = estado.percentuais[i];
      return el('div', { class: `linha-distribuicao${p === 0 ? ' zerada' : ''}` },
        seloAcao(a, true),
        el('div', { class: 'linha-info' },
          el('div', { class: 'card-nome' }, a.nome),
          el('div', { class: 'suave' }, a.ticker, ' · ', a.setor),
          el('div', { class: 'linha-reais' }, p === 0 ? 'Não investida' : formatarReais((CAPITAL * p) / 100))),
        el('div', { class: 'ajuste' },
          el('button', { class: 'botao-redondo', 'aria-label': `Menos 10% em ${a.nome}`, disabled: p === 0, onclick: () => ajustar(i, -10) }, '−'),
          el('div', { class: 'ajuste-valor' }, `${p}%`),
          el('button', { class: 'botao-redondo', 'aria-label': `Mais 10% em ${a.nome}`, disabled: p === 100, onclick: () => ajustar(i, 10) }, '+')));
    }));
    const { falta } = statusDistribuicao(estado.percentuais);
    status.className = `status-distribuicao ${falta === 0 ? 'ok' : 'pendente'}`;
    status.textContent = falta === 0 ? '✓ Tudo distribuído!'
      : falta > 0 ? `Falta distribuir ${falta}%` : `Passou ${-falta}% do total`;
    confirmar.disabled = falta !== 0;
  }

  container.append(el('section', { class: 'tela-distribuicao' },
    el('header', { class: 'cabecalho-tela' },
      el('div', {},
        el('h1', {}, 'Quanto investir em cada uma?'),
        el('p', { class: 'suave' }, 'Você tem R$ 10.000. Use − e + para dividir em partes de 10%. Pode deixar alguma com 0%.'))),
    linhas,
    status,
    el('div', { class: 'rodape-botoes' },
      el('button', { class: 'botao botao-secundario', onclick: () => irPara('escolha') }, '◀ Trocar ações'),
      confirmar)));
  desenhar();
}
