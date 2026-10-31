# Simulador da Bolsa — Especificação de Design

**Data:** 31/10/2026
**Autor:** Saulo Jardim (com Claude)
**Status:** aguardando revisão

## 1. Objetivo

PWA educativo para uma feira escolar, usado por alunos do ensino médio num **monitor touch** (e também responsivo no celular). O aluno monta uma carteira fictícia com 3 ações do IBOVESPA, acompanha 5 notícias/eventos e entende **por que** e **quanto** cada notícia afetou suas ações.

**Critérios de sucesso**
- Uma partida completa leva de 3 a 5 minutos.
- O aluno entende a relação notícia → setor → preço e percebe o valor de diversificar.
- Funciona 100% offline depois do primeiro acesso.
- O professor consegue editar eventos e preços mexendo só em arquivos JSON.

**Fora do escopo:** login, servidor/back-end, cotações ao vivo, ranking compartilhado entre aparelhos, compra/venda durante a partida.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Preços iniciais | Foto real dos preços, embutida no app (`acoes.json`) |
| Ações disponíveis | Todas as da carteira atual do IBOVESPA (~85), com filtros |
| Distribuição | Aluno define % por ação em passos de 10%, total 100%, 0% permitido |
| Eventos | Banco de **50 eventos**; 5 sorteados por partida, sem contradições |
| Interação por rodada | Palpite (sobe/desce) antes da revelação + animação |
| Fim da partida | Resultado individual + Ranking do dia (top 10) |
| Apelido | Título escolhido em lista + primeiro nome digitado |
| Tecnologia | HTML + CSS + JavaScript puro, sem build |
| Hospedagem | GitHub Pages, repositório público `simulador-bolsa-pwa` |

## 3. Telas e fluxo

```
Início → Escolha das ações → Distribuição (%) → [Rodada 1..5: Manchete → Palpite → Revelação] → Resultado → Ranking → Início
```

### 3.1 Início (modo vitrine)
- Título "Simulador da Bolsa", subtítulo convidativo e botão grande **Começar**.
- Letreiro de cotações correndo no topo (ações do `acoes.json`).
- Ranking do dia (top 10) visível ao lado (monitor) ou abaixo (celular).
- Aviso discreto: "Simulação educativa: eventos e impactos fictícios. Preços de DD/MM/AAAA."

### 3.2 Escolha das ações
- Grade de cards: selo colorido com iniciais (cor do setor), ticker, nome popular, setor, porte, preço, indicador de bons dividendos.
- Filtros por botões grandes: **Setor** (múltipla escolha), **Porte** (Grande/Média/Pequena), **Bons dividendos**; mais um campo de **busca** por nome ou ticker.
- Botão "Limpar filtros". Mensagem amigável quando nenhum card corresponde aos filtros.
- Barra fixa inferior com **3 espaços**. Tocar num card adiciona ou remove a ação; com 3 escolhidas, os demais cards ficam esmaecidos.
- Botão **Montar carteira** habilitado só com exatamente 3 ações; leva à etapa de distribuição.

### 3.2.1 Distribuição do dinheiro
- Capital inicial: **R$ 10.000**.
- Para cada uma das 3 ações, o aluno define a porcentagem com botões grandes **−** e **+**, em passos de **10%**, de **0% a 100%**.
- Valor inicial: 40% / 30% / 30% (na ordem de escolha).
- O total precisa ser exatamente **100%**. A tela mostra "Falta distribuir X%" ou "Passou X% do total" e o valor em R$ de cada ação.
- **0% é permitido**: a ação continua na carteira e aparece nas rodadas, mas não afeta o valor ("Você não investiu nesta ação").
- Botões **Voltar** (para trocar ações) e **Confirmar carteira** (habilitado só com total = 100%).
- Quantidade de ações = valor alocado ÷ preço (frações permitidas).

### 3.3 Rodadas (5)
Placar fixo: valor atual da carteira e "Rodada N de 5".

1. **Manchete:** só o título da notícia, em estilo "plantão de notícias".
2. **Palpite:** "Sua carteira vai subir ou cair?" com botões **▲ Subir** e **▼ Cair**.
3. **Revelação (animada):**
   - Para cada ação: preço antigo → novo com contador animado, variação em % e R$, ▲/▼ e cor verde/vermelha, e o motivo curto (ex.: "Varejo é sensível aos juros").
   - Feedback do palpite: "Você acertou!" (com confete) ou "Não foi dessa vez".
   - Explicação completa do evento.
   - Ações com 0% aparecem com a variação de preço, mas marcadas "não investida" e sem valor em R$.
   - Se nenhuma ação com mais de 0% foi afetada pelo evento: "Seu setor passou ileso desta vez, e isso também é diversificação!"
   - Botão **Seguir em frente** (na rodada 5: **Ver resultado**).

### 3.4 Resultado
- Valor inicial, valor final e retorno total em % (com ▲/▼ e cor).
- Desempenho de cada ação na partida.
- Palpites certos: N de 5.
- Lição personalizada, escolhida por regra, considerando só as ações com mais de 0%:
  - Uma ação com 70% ou mais → "Você apostou quase tudo numa ação só: o resultado dependeu dela."
  - Todas no mesmo setor → "Carteira concentrada: tudo subiu ou caiu junto. Diversificar reduz o risco."
  - Duas no mesmo setor → "Diversificação parcial: duas ações dependiam das mesmas notícias."
  - Setores todos diferentes → "Boa diversificação: quando um setor caía, outro segurava."
  - Retorno > +10% ou < −10% → comentário extra sobre risco e sorte.
  - Vale a primeira regra de concentração que se aplicar; o comentário sobre retorno é somado a ela.
- Botão **Entrar no ranking**.

### 3.5 Ranking
- Escolha do **título** por botões: Mestre, Investidor(a), Administrador(a), Dr(a)., Chefe, CEO, Magnata, Professor(a).
- **Primeiro nome** digitado: só letras (com acentos) e espaço, até 12 caracteres; passa por filtro básico de palavrões em português (lista no código, comparação sem acentos, sem diferenciar maiúsculas e tolerando trocas como 0→o, 4→a, 1→i, 3→e). Nome bloqueado gera a mensagem "Escolha outro nome".
- Exibição: "Mestre Ana — +12,4%". O top 10 é ordenado pelo retorno; no empate, vale quem acertou mais palpites e depois quem jogou antes.
- Se o aluno não entrou no top 10, a tela mostra a posição dele mesmo assim.
- Botão **Jogar de novo**.

### 3.6 Comportamentos globais
- **Inatividade:** 60 s sem toque em qualquer tela que não seja o Início fazem o app voltar ao Início. Uma contagem regressiva visível aparece nos últimos 10 s e qualquer toque cancela.
- **Área do professor:** segurar o título "Ranking" por 3 s abre um painel com: apagar uma entrada, zerar o ranking do dia.
- **Ranking do dia:** salvo no `localStorage` do aparelho com a data; entradas de outro dia são descartadas automaticamente.

## 4. Mecânica dos eventos

### 4.1 Formato (`data/eventos.json`)
```json
{
  "id": "selic-sobe",
  "manchete": "Banco Central sobe a taxa Selic para conter a inflação",
  "explicacao": "Com juros mais altos, o crédito fica caro...",
  "impactoSetores": { "Varejo e Consumo": -6, "Construção e Imóveis": -7, "Bancos e Finanças": 3 },
  "impactoAcoes": { "MGLU3": -9 },
  "motivos": { "Varejo e Consumo": "Varejo é sensível aos juros" },
  "grupo": "juros"
}
```
- `impactoAcoes` e `motivos` são opcionais. `grupo` é opcional; eventos com o mesmo grupo nunca saem na mesma partida.
- Impactos em % entre **−12 e +12**.

### 4.2 Cálculo por ação, em cada rodada
1. Se o ticker está em `impactoAcoes`, usa esse valor.
2. Senão, se o setor está em `impactoSetores`, usa esse valor.
3. Senão, 0.
4. Soma ruído aleatório uniforme em [−1, +1] pontos percentuais.
5. `novoPreco = preco × (1 + variação/100)`. Efeitos se acumulam entre rodadas.

Uma ação conta como "afetada" quando entra pelos passos 1 ou 2. O palpite está correto quando o sinal da variação do valor total da carteira bate com a escolha do aluno. Se a variação total for exatamente 0, a rodada conta como acerto.

A aleatoriedade (sorteio e ruído) vem de uma função injetável, para que os testes sejam determinísticos.

### 4.3 Banco de 50 eventos
| Tipo | Qtde |
|---|---|
| Economia (juros, inflação, dólar, PIB, emprego) | ~12 |
| Commodities e exterior | ~10 |
| Agro e clima | ~6 |
| Setores específicos (regulação, infraestrutura) | ~12 |
| Notícias de uma empresa | ~6 |
| Comportamento e tecnologia | ~4 |

Regras: há eventos bons, ruins e mistos; cada setor aparece em pelo menos 4 eventos; a explicação é escrita para alunos do ensino médio (frases curtas, sem jargão ou com o jargão explicado).

## 5. Dados das ações (`data/acoes.json`)
```json
{
  "dataReferencia": "2026-10-30",
  "acoes": [
    { "ticker": "PETR4", "nome": "Petrobras", "setor": "Petróleo e Gás", "porte": "Grande", "bonsDividendos": true, "preco": 37.85 }
  ]
}
```
- **Universo:** carteira teórica vigente do IBOVESPA (B3).
- **Setores simplificados (12):** Bancos e Finanças; Petróleo e Gás; Mineração e Siderurgia; Energia e Saneamento; Varejo e Consumo; Alimentos e Bebidas; Agronegócio; Saúde; Construção e Imóveis; Transporte e Logística; Tecnologia e Telecom; Indústria e Papel.
- **Porte:** valor de mercado > R$ 50 bi = Grande; R$ 10–50 bi = Média; < R$ 10 bi = Pequena.
- **Bons dividendos:** dividend yield dos últimos 12 meses ≥ 6%.
- Sem logos de empresas: selo com iniciais na cor do setor.
- **Script `scripts/atualizar-precos.mjs`** (Node): busca os **preços** numa fonte pública sem chave de API (Yahoo Finance) e regrava `acoes.json`, preservando os demais campos. Porte e bons dividendos são classificados manualmente por pesquisa (valores aproximados, revisados a cada feira).

## 6. Arquitetura

```
index.html            estrutura das telas
css/style.css         tema, layout responsivo, animações
js/app.js             roteamento entre telas, estado da partida, inatividade
js/motor.js           lógica pura: sorteio, cálculo de impactos, palpite, resultado, lição
js/carteira.js        seleção e filtros de ações (lógica pura + render)
js/ranking.js         ranking no localStorage, filtro de nomes, painel do professor
js/ui.js              helpers de render e animação (contadores, confete)
data/acoes.json
data/eventos.json
manifest.webmanifest
sw.js                 service worker (cache de todos os arquivos)
icons/                ícones do PWA
scripts/atualizar-precos.mjs
tests/                testes da lógica pura e validação dos JSON
```
- Módulos ES nativos (`<script type="module">`), sem dependências em tempo de execução.
- `motor.js`, a parte lógica de `carteira.js` e `ranking.js` não tocam no DOM, para poderem ser testados.
- O service worker usa cache-first com versão no nome do cache; trocar a versão força a atualização.

## 7. Visual e uso na feira
- Tema escuro estilo "telão da bolsa"; verde/vermelho sempre acompanhados de ▲/▼.
- Texto legível a 2 m no monitor; alvos de toque ≥ 64 px no monitor e ≥ 44 px no celular.
- Layout: monitor (≥ 1024 px) em colunas (filtros + grade, manchete + carteira); celular em coluna única, com filtros numa gaveta.
- Quiosque: `touch-action` sem zoom por pinça, `user-select: none`, sem menu de contexto em toque longo.
- `README.md` com instruções: como abrir em tela cheia no Chrome, como editar eventos e preços e como atualizar os preços.

## 8. Tratamento de erros
- Falha ao carregar os JSON: tela "Não foi possível carregar os dados" com botão Tentar de novo.
- `localStorage` indisponível: o ranking funciona só na memória durante a sessão, sem quebrar o jogo.
- Evento com setor desconhecido é detectado pelo teste de validação, não em tempo de execução.

## 9. Testes
- **Lógica (Node, `node --test`):** distribuição em passos de 10% (limites 0–100%, total = 100%, ação com 0% não altera o valor), cálculo de impacto (ação > setor > zero + ruído), acúmulo entre rodadas, palpite correto e incorreto, sorteio de 5 sem repetição e sem grupo duplicado, regras da lição final, ordenação e desempate do ranking, filtro de nomes, filtros da escolha de ações.
- **Validação dos dados:** 50 eventos, ids únicos, setores existentes, tickers em `impactoAcoes` presentes em `acoes.json`, impactos em [−12, 12], cada setor em ≥ 4 eventos; ações com todos os campos e setores válidos.
- **Teste visual:** partida completa no navegador em 375×812 (celular) e 1920×1080 (monitor), conferindo o funcionamento offline e a volta automática por inatividade.

## 10. Publicação
- Repositório público `saulojardimspotify/simulador-bolsa-pwa` no GitHub; cópia local em `Downloads\simulador-bolsa-pwa`.
- GitHub Pages servindo a branch `main` na raiz: `https://saulojardimspotify.github.io/simulador-bolsa-pwa/`.
- Caminhos relativos em todo o app, para funcionar no subcaminho do Pages.
