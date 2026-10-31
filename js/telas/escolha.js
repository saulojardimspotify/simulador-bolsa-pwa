import { el, seloAcao, formatarReais, umaVez } from '../ui.js';
import { filtrarAcoes, alternarSelecao } from '../carteira.js';
import { SETORES, CORES_SETOR } from '../setores.js';

const PORTES = ['Grande', 'Média', 'Pequena'];

export function render(container, estado, irPara) {
  const f = estado.filtros;
  const grade = el('div', { class: 'grade-acoes' });
  const barra = el('div', { class: 'barra-escolha' });
  const contador = el('span', { class: 'contador-filtros' });
  const gaveta = el('aside', { class: 'filtros' });

  const alternar = (lista, valor) => (lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

  function chip(rotulo, ativo, aoTocar, cor) {
    return el('button', {
      class: `chip${ativo ? ' ativo' : ''}`,
      style: cor ? `--cor-setor:${cor}` : undefined,
      'aria-pressed': ativo ? 'true' : 'false',
      onclick: aoTocar,
    }, rotulo);
  }

  function desenharFiltros() {
    const busca = el('input', {
      class: 'busca', type: 'search', placeholder: 'Buscar por nome ou código…',
      value: f.busca, 'aria-label': 'Buscar ação', autocomplete: 'off',
      oninput: (e) => { f.busca = e.target.value; desenharGrade(); },
    });
    gaveta.replaceChildren(
      el('div', { class: 'filtros-topo' },
        el('h2', {}, 'Filtros'),
        el('button', { class: 'botao botao-fantasma fechar-gaveta', onclick: () => gaveta.classList.remove('aberta') }, 'Ver ações ✓')),
      busca,
      el('h3', {}, 'Setor'),
      el('div', { class: 'chips' }, SETORES.map((s) =>
        chip(s, f.setores.includes(s), () => { f.setores = alternar(f.setores, s); atualizar(); }, CORES_SETOR[s]))),
      el('h3', {}, 'Porte da empresa'),
      el('div', { class: 'chips' }, PORTES.map((p) =>
        chip(p, f.portes.includes(p), () => { f.portes = alternar(f.portes, p); atualizar(); }))),
      el('h3', {}, 'Dividendos'),
      el('div', { class: 'chips' },
        chip('💰 Paga bons dividendos', f.soDividendos, () => { f.soDividendos = !f.soDividendos; atualizar(); })),
      el('button', {
        class: 'botao botao-fantasma',
        onclick: () => { Object.assign(f, { setores: [], portes: [], soDividendos: false, busca: '' }); atualizar(); },
      }, 'Limpar filtros'));
  }

  function card(acao) {
    const escolhida = estado.selecionadas.includes(acao.ticker);
    const cheia = estado.selecionadas.length >= 3;
    return el('button', {
      class: `card-acao${escolhida ? ' escolhida' : ''}${!escolhida && cheia ? ' apagada' : ''}`,
      'aria-pressed': escolhida ? 'true' : 'false',
      onclick: () => { estado.selecionadas = alternarSelecao(estado.selecionadas, acao.ticker); desenharGrade(); desenharBarra(); },
    },
    seloAcao(acao),
    el('div', { class: 'card-info' },
      el('div', { class: 'card-nome' }, acao.nome),
      el('div', { class: 'card-linha' },
        el('span', { class: 'card-ticker' }, acao.ticker, acao.bonsDividendos ? ' · 💰' : ''),
        el('span', { class: 'card-preco' }, formatarReais(acao.preco))),
      el('div', { class: 'card-setor', style: `--cor-setor:${CORES_SETOR[acao.setor]}` }, acao.setor, ' · ', acao.porte)),
    escolhida ? el('span', { class: 'card-check', 'aria-hidden': 'true' }, '✓') : null);
  }

  function desenharGrade() {
    const lista = filtrarAcoes(estado.acoes, f);
    contador.textContent = `${lista.length} ações`;
    grade.replaceChildren(...(lista.length
      ? lista.map(card)
      : [el('p', { class: 'vazio' }, 'Nenhuma ação com esses filtros. Toque em Limpar filtros.')]));
  }

  function desenharBarra() {
    const escolhidas = estado.selecionadas.map((t) => estado.acoes.find((a) => a.ticker === t));
    const vagas = [0, 1, 2].map((i) => {
      const a = escolhidas[i];
      return a
        ? el('button', {
          class: 'vaga cheia',
          onclick: () => { estado.selecionadas = alternarSelecao(estado.selecionadas, a.ticker); desenharGrade(); desenharBarra(); },
          'aria-label': `Remover ${a.nome}`,
        }, seloAcao(a), el('span', {}, a.nome), el('span', { class: 'vaga-x' }, '✕'))
        : el('div', { class: 'vaga' }, `Ação ${i + 1}`);
    });
    const pronto = escolhidas.length === 3;
    barra.replaceChildren(
      el('div', { class: 'vagas' }, vagas),
      el('button', {
        class: 'botao botao-primario',
        disabled: !pronto,
        onclick: pronto ? umaVez(() => irPara('distribuicao')) : undefined,
      }, pronto ? 'Montar carteira ▶' : `Escolha mais ${3 - escolhidas.length}`));
  }

  function atualizar() {
    desenharFiltros();
    desenharGrade();
  }

  container.append(el('section', { class: 'tela-escolha' },
    el('header', { class: 'cabecalho-tela' },
      el('div', {},
        el('h1', {}, 'Escolha 3 ações'),
        el('p', { class: 'suave' }, 'Toque nos cards. Use os filtros para achar por setor, tamanho ou dividendos.')),
      el('div', { class: 'cabecalho-acoes' },
        contador,
        el('button', { class: 'botao botao-secundario abrir-gaveta', onclick: () => gaveta.classList.add('aberta') }, '☰ Filtros'))),
    el('div', { class: 'escolha-corpo' }, gaveta, grade),
    barra));
  atualizar();
  desenharBarra();
}
