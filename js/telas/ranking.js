import { el, formatarPct, classeVariacao, pressionarLongo, umaVez } from '../ui.js';
import {
  TITULOS, normalizarNome, nomePermitido, inserirNoRanking, topN, removerEntrada, salvarRanking, dataHoje,
} from '../ranking.js';
import { atualizarRankingDoDia } from '../app.js';
import { efeitos, preferencias, ajustar } from '../som.js';

const PAINEL_PROFESSOR_MS = 45000;

function gravar(estado, lista) {
  estado.ranking = lista;
  salvarRanking(estado.storage, dataHoje(), lista);
}

function abrirPainelProfessor(estado, onMudou) {
  const lista = el('ul', { class: 'professor-lista' });
  const zerar = el('button', { class: 'botao botao-cai' }, 'Zerar ranking de hoje');
  let confirmando = false;
  let timer = null;
  const fechar = () => {
    clearTimeout(timer);
    if (!fundo.isConnected) return; // a troca de tela já fechou o painel
    fundo.remove();
    onMudou?.();
  };
  // Fecha sozinho se o professor se afastar, para nenhum aluno mexer no ranking.
  const adiar = () => { clearTimeout(timer); timer = setTimeout(fechar, PAINEL_PROFESSOR_MS); };

  function desenhar() {
    lista.replaceChildren(...(estado.ranking.length
      ? estado.ranking.map((e, i) => el('li', {},
        el('span', {}, `${i + 1}º ${e.titulo} ${e.nome} · ${formatarPct(e.retornoPct)}`),
        el('button', { class: 'botao botao-secundario', onclick: () => { gravar(estado, removerEntrada(estado.ranking, e.timestamp)); desenhar(); } }, 'Apagar')))
      : [el('li', { class: 'suave' }, 'Ranking vazio.')]));
  }

  zerar.addEventListener('click', () => {
    if (!confirmando) {
      confirmando = true;
      zerar.textContent = 'Toque de novo para confirmar';
      return;
    }
    gravar(estado, []);
    confirmando = false;
    zerar.textContent = 'Zerar ranking de hoje';
    desenhar();
  });

  const som = preferencias();
  const rotuloVolume = el('span', {}, `${Math.round(som.volume * 100)}%`);
  const volume = el('input', {
    type: 'range', min: '0', max: '100', step: '10', value: String(Math.round(som.volume * 100)), 'aria-label': 'Volume',
    oninput: (e) => { ajustar({ volume: Number(e.target.value) / 100 }); rotuloVolume.textContent = `${e.target.value}%`; },
    onchange: () => efeitos.acertoParcial(),
  });
  const musica = el('button', {
    class: 'botao botao-secundario',
    onclick: () => {
      ajustar({ musica: !preferencias().musica });
      musica.textContent = preferencias().musica ? '🎵 Música de fundo: ligada' : '🎵 Música de fundo: desligada';
    },
  }, som.musica ? '🎵 Música de fundo: ligada' : '🎵 Música de fundo: desligada');

  const fundo = el('div', { class: 'modal-fundo', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Área do professor' },
    el('div', { class: 'modal' },
      el('h2', {}, '🔒 Área do professor'),
      el('div', { class: 'professor-som' },
        el('label', { class: 'professor-volume' }, '🔊 Volume ', volume, rotuloVolume),
        musica),
      el('h3', {}, 'Ranking de hoje'),
      lista,
      el('div', { class: 'rodape-botoes' }, zerar, el('button', { class: 'botao botao-primario', onclick: fechar }, 'Fechar'))));
  fundo.addEventListener('pointerdown', adiar);
  desenhar();
  document.body.append(fundo);
  adiar();
}

export function painelRanking(estado, { destaque = null, onMudou } = {}) {
  const titulo = el('h2', { class: 'titulo-ranking' }, '🏆 Ranking de hoje');
  pressionarLongo(titulo, 3000, () => abrirPainelProfessor(estado, onMudou));
  const top = topN(estado.ranking);
  return el('aside', { class: 'painel-ranking' },
    titulo,
    top.length
      ? el('ol', { class: 'lista-ranking' }, top.map((e, i) =>
        el('li', { class: e.timestamp === destaque ? 'destaque' : '' },
          el('span', { class: 'pos' }, `${i + 1}º`),
          el('span', { class: 'quem' }, `${e.titulo} ${e.nome}`),
          el('span', { class: `ret ${classeVariacao(e.retornoPct)}` }, formatarPct(e.retornoPct)))))
      : el('p', { class: 'suave vazio' }, 'Seja o primeiro do ranking de hoje!'));
}

export function render(container, estado, irPara) {
  atualizarRankingDoDia();
  let titulo = TITULOS[0];
  const area = el('div', { class: 'ranking-area' });
  const erro = el('p', { class: 'erro-nome', 'aria-live': 'polite' });
  const nome = el('input', {
    class: 'campo-nome', type: 'text', maxlength: '12', placeholder: 'Seu primeiro nome',
    autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', 'aria-label': 'Seu primeiro nome',
  });
  const previa = el('p', { class: 'previa-nome' });
  const titulos = el('div', { class: 'chips titulos' });

  function desenharTitulos() {
    titulos.replaceChildren(...TITULOS.map((t) => el('button', {
      class: `chip${t === titulo ? ' ativo' : ''}`, 'aria-pressed': t === titulo ? 'true' : 'false',
      onclick: () => { titulo = t; desenharTitulos(); atualizarPrevia(); },
    }, t)));
  }
  function atualizarPrevia() {
    previa.textContent = `${titulo} ${normalizarNome(nome.value) || '…'}`;
    erro.textContent = '';
  }
  nome.addEventListener('input', atualizarPrevia);

  function mostrarFinal(entrada) {
    const posicao = estado.ranking.findIndex((e) => e.timestamp === entrada.timestamp) + 1;
    area.replaceChildren(
      posicao
        ? el('p', { class: 'posicao' }, `${entrada.titulo} ${entrada.nome}, você ficou em `, el('b', {}, `${posicao}º lugar`), '!')
        : el('p', { class: 'posicao' }, 'Ranking atualizado pelo professor.'),
      painelRanking(estado, { destaque: entrada.timestamp, onMudou: () => mostrarFinal(entrada) }),
      el('div', { class: 'rodape-botoes' },
        el('button', { class: 'botao botao-primario botao-enorme', onclick: umaVez(() => irPara('inicio')) }, 'Jogar de novo 🔄')));
  }

  let salvo = false;
  function salvar() {
    if (salvo) return;
    const check = nomePermitido(nome.value);
    if (!check.ok) {
      erro.textContent = check.motivo === 'palavrao' ? 'Escolha outro nome.' : 'Use só letras, até 12.';
      return;
    }
    salvo = true;
    const entrada = {
      titulo, nome: normalizarNome(nome.value), retornoPct: estado.retornoFinal ?? 0,
      acertos: estado.acertos, timestamp: Date.now(),
    };
    gravar(estado, inserirNoRanking(estado.ranking, entrada).lista);
    efeitos.conquista();
    mostrarFinal(entrada);
  }
  nome.addEventListener('keydown', (e) => { if (e.key === 'Enter') salvar(); });

  area.append(
    el('h2', {}, '1. Escolha seu título'), titulos,
    el('h2', {}, '2. Digite seu primeiro nome'), nome, previa, erro,
    el('div', { class: 'rodape-botoes' },
      el('button', { class: 'botao botao-secundario', onclick: umaVez(() => irPara('inicio')) }, 'Pular'),
      el('button', { class: 'botao botao-primario botao-enorme', onclick: salvar }, 'Salvar no ranking ✓')));

  container.append(el('section', { class: 'tela-ranking' },
    el('header', { class: 'cabecalho-tela' },
      el('h1', {}, '🏆 Entre no ranking'),
      el('p', { class: 'suave' }, `Seu retorno: ${formatarPct(estado.retornoFinal ?? 0)} · ${estado.acertos} de 15 palpites certos`)),
    area));
  desenharTitulos();
  atualizarPrevia();
}
