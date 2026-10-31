import { el } from '../ui.js';
import { novaPartida, atualizarRankingDoDia } from '../app.js';
import { painelRanking } from './ranking.js';

export function render(container, estado, irPara) {
  atualizarRankingDoDia();
  const comecar = () => {
    novaPartida();
    irPara('escolha');
  };
  container.append(el('section', { class: 'tela-inicio' },
    el('div', { class: 'inicio-hero' },
      el('p', { class: 'selo-texto' }, '📈 Bolsa de Valores'),
      el('h1', { class: 'inicio-titulo' }, 'Simulador da Bolsa'),
      el('p', { class: 'inicio-sub' },
        'Você ganhou ', el('b', {}, 'R$ 10.000'), ' de mentirinha. Escolha 3 ações do IBOVESPA, ',
        'acompanhe 5 notícias e descubra como elas mexem com o seu dinheiro.'),
      el('ol', { class: 'inicio-passos' },
        el('li', {}, 'Monte sua carteira'),
        el('li', {}, 'Dê seu palpite a cada notícia'),
        el('li', {}, 'Entre no ranking do dia')),
      el('button', { class: 'botao botao-primario botao-enorme', onclick: comecar }, 'Começar ▶')),
    painelRanking(estado, { onMudou: () => irPara('inicio') })));
}
