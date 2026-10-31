import { el, seloAcao, formatarReais, formatarPct, classeVariacao, umaVez } from '../ui.js';
import { valorCarteira, licaoFinal } from '../motor.js';
import { efeitos } from '../som.js';

export function render(container, estado, irPara) {
  const c = estado.carteira;
  const final = valorCarteira(c);
  const retorno = (final / c.valorInicial - 1) * 100;
  estado.retornoFinal = retorno;
  if (retorno >= 0) efeitos.fanfarra(); else efeitos.neutro();

  container.append(el('section', { class: 'tela-resultado' },
    el('header', { class: 'cabecalho-tela' }, el('h1', {}, '🏁 Resultado da sua carteira')),
    el('div', { class: 'resultado-destaque' },
      el('div', { class: 'bloco' }, el('span', { class: 'suave' }, 'Você começou com'), el('b', {}, formatarReais(c.valorInicial))),
      el('div', { class: 'bloco' }, el('span', { class: 'suave' }, 'Terminou com'), el('b', { class: classeVariacao(retorno) }, formatarReais(final))),
      el('div', { class: 'bloco grande' }, el('span', { class: 'suave' }, 'Retorno'), el('b', { class: classeVariacao(retorno) }, formatarPct(retorno))),
      el('div', { class: 'bloco' }, el('span', { class: 'suave' }, 'Palpites certos'), el('b', {}, `${estado.acertos} de 15`))),
    el('div', { class: 'res-lista' }, c.posicoes.map((p) => {
      const pct = (p.preco / p.acao.preco - 1) * 100;
      return el('div', { class: `res-linha ${classeVariacao(pct)}${p.percentual === 0 ? ' nao-investida' : ''}` },
        seloAcao(p.acao),
        el('div', { class: 'res-info' },
          el('div', { class: 'card-nome' }, p.acao.nome),
          el('div', { class: 'res-motivo' }, p.percentual === 0 ? 'Você não investiu nesta ação' : `${p.percentual}% da carteira`)),
        el('div', { class: 'res-numeros' },
          el('span', { class: 'res-preco' }, `${formatarReais(p.acao.preco)} → ${formatarReais(p.preco)}`),
          el('span', { class: 'res-pct' }, formatarPct(pct))));
    })),
    el('div', { class: 'licoes' }, el('h2', {}, '💡 O que dá para aprender'), licaoFinal(c, retorno).map((l) => el('p', {}, l))),
    el('div', { class: 'rodape-botoes' },
      el('button', { class: 'botao botao-primario botao-enorme', onclick: umaVez(() => irPara('ranking')) }, 'Entrar no ranking 🏆'))));
}
