# Simulador da Bolsa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA offline em que o aluno monta uma carteira fictícia de 3 ações do IBOVESPA, distribui o dinheiro em %, passa por 5 eventos sorteados com palpite e revelação, vê o resultado e entra no ranking do dia.

**Architecture:** Site estático (HTML + CSS + módulos ES nativos) sem build. Toda a lógica de regra fica em módulos puros (`motor.js`, `carteira.js`, `ranking.js`) testados com `node --test`; a interface (`app.js`, `telas/*.js`, `ui.js`) só renderiza e chama essas funções. Dados em `data/acoes.json` e `data/eventos.json`; service worker com cache-first para uso offline.

**Tech Stack:** HTML5, CSS, JavaScript ES2022 (módulos nativos), Node.js LTS (só para testes e script de preços, sem dependências npm), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-31-simulador-bolsa-design.md`

## Global Constraints

- Sem dependências de runtime nem build; nenhum `npm install`. `package.json` existe só com `"type": "module"` e o script `"test": "node --test tests/"`.
- Todos os caminhos relativos (`./data/acoes.json`), para funcionar em `/simulador-bolsa-pwa/` no GitHub Pages.
- Textos da interface em português do Brasil. Valores em R$ formatados com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`; percentuais com vírgula e 1 casa ("+12,4%").
- Capital inicial **R$ 10.000**; percentuais em passos de **10%**, de **0 a 100**, total = **100**; padrão **40/30/30**.
- Impactos de evento em **[−12, +12]**; ruído uniforme **[−1, +1]** p.p.
- Inatividade: **60 s** volta ao Início; contagem visível nos últimos **10 s**.
- Nome do ranking: regex `^[A-Za-zÀ-ÿ ]{1,12}$` depois de normalizar espaços.
- Subida/queda sempre com ▲/▼ além da cor. Alvos de toque ≥ 64 px em telas ≥ 1024 px, ≥ 44 px abaixo disso.
- Rodapé/aviso fixo: "Simulação educativa: eventos e impactos fictícios. Preços de DD/MM/AAAA."
- Aleatoriedade sempre por parâmetro `rng = Math.random` (função que devolve [0,1)), para testes determinísticos.
- Commits com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` no final da mensagem.
- **Porte e bons dividendos** são classificados manualmente por pesquisa (valores aproximados, revisados a cada feira); o script de atualização só atualiza **preços** e `dataReferencia`.

## Review Focus

1. **Aluno toca rápido/duas vezes** em "Seguir em frente", "Subir" ou "+": não pode pular rodada, aplicar evento duas vezes nem passar de 100%. → teste em Task 2 (`ajustarPercentual` nunca ultrapassa limites) e verificação manual de duplo toque na Task 8 (botões desabilitados após o primeiro toque).
2. **Carteira com 0% em duas ações** (100% numa só): valor, revelação e lição devem funcionar; ações não investidas não contam como "afetadas". → teste em Task 1 (`aplicarEvento` com percentuais [100,0,0]).
3. **`localStorage` cheio, bloqueado ou com JSON corrompido** no monitor da feira: o jogo não pode travar. → teste em Task 3 (`carregarRanking` com storage que lança erro e com valor inválido devolve `[]`).
4. **Nome com acentos, maiúsculas e espaços extras** ("  josé  ") é aceito e salvo normalizado; nome com leetspeak de palavrão é recusado. → testes em Task 3.
5. **Filtros que não retornam nada / busca com acento ou sem acento** ("itau" acha "Itaú"). → teste em Task 2 e mensagem de lista vazia na Task 7.

---

### Task 0: Preparação do ambiente e esqueleto de testes

**Files:**
- Create: `package.json`, `.gitignore`, `tests/sanidade.test.js`

**Interfaces:**
- Produces: comando `npm test` (= `node --test tests/`) usado por todas as tasks.

- [ ] **Step 1:** Confirmar Node: `node --version` → `v22.x` ou superior. Se não houver, pedir ao professor para rodar `winget install OpenJS.NodeJS.LTS` e reabrir o terminal (não instalar sem confirmação).
- [ ] **Step 2:** Criar `package.json` (`name: "simulador-bolsa-pwa"`, `private: true`, `type: "module"`, `scripts.test`), `.gitignore` (`node_modules/`, `.DS_Store`, `Thumbs.db`) e `tests/sanidade.test.js` com `test('ambiente', () => assert.equal(1 + 1, 2))`.
- [ ] **Step 3:** `npm test` → `# pass 1`.
- [ ] **Step 4:** Commit `chore: esqueleto do projeto e testes`.

---

### Task 1: Motor do jogo (`js/motor.js`) e setores (`js/setores.js`)

**Files:**
- Create: `js/setores.js`, `js/motor.js`, `tests/motor.test.js`

**Interfaces:**
- Produces:
  - `SETORES: string[]` — exatamente os 12 da spec, nesta ordem: Bancos e Finanças; Petróleo e Gás; Mineração e Siderurgia; Energia e Saneamento; Varejo e Consumo; Alimentos e Bebidas; Agronegócio; Saúde; Construção e Imóveis; Transporte e Logística; Tecnologia e Telecom; Indústria e Papel.
  - `CORES_SETOR: Record<string,string>` — uma cor hex por setor.
  - Tipos (JSDoc): `Acao {ticker, nome, setor, porte:'Grande'|'Média'|'Pequena', bonsDividendos:boolean, preco:number}`; `Evento {id, manchete, explicacao, impactoSetores:Record<string,number>, impactoAcoes?:Record<string,number>, motivos?:Record<string,string>, grupo?:string}`; `Posicao {acao:Acao, percentual:number, quantidade:number, preco:number}`; `Carteira {posicoes:Posicao[], valorInicial:number}`; `ResultadoAcao {ticker, precoAntes, precoDepois, pct, afetada:boolean, investida:boolean, motivo:string|null, variacaoReais:number}`.
  - `sortearEventos(eventos: Evento[], n = 5, rng = Math.random): Evento[]` — sem repetir `id` nem `grupo`; lança `Error('Eventos insuficientes')` se impossível.
  - `variacaoAcao(acao: Acao, evento: Evento, rng = Math.random): {pct:number, afetada:boolean, motivo:string|null}` — ordem ticker → setor → 0, mais ruído `(rng()*2 - 1)`; `motivo = motivos[ticker] ?? motivos[setor] ?? null`.
  - `valorCarteira(carteira: Carteira): number` — Σ quantidade × preco.
  - `aplicarEvento(carteira: Carteira, evento: Evento, rng = Math.random): {carteira:Carteira, resultados:ResultadoAcao[], valorAntes:number, valorDepois:number, algumaInvestidaAfetada:boolean}` — não muta a entrada.
  - `avaliarPalpite(palpite: 'sobe'|'cai', valorAntes: number, valorDepois: number): boolean` — diferença 0 conta como acerto.
  - `licaoFinal(carteira: Carteira, retornoPct: number): string[]` — 1 mensagem de concentração + opcional 1 de retorno.

- [ ] **Step 1: Testes que falham** (`tests/motor.test.js`), com `rng` fixo `() => 0.5` (ruído 0) salvo onde indicado:
  - `variacaoAcao` com `impactoAcoes.MGLU3 = -9` e `impactoSetores['Varejo e Consumo'] = -6` → `{pct:-9, afetada:true}`.
  - Ação de Varejo sem impacto próprio → `pct -6`, `afetada true`, motivo do setor.
  - Setor não citado → `pct 0`, `afetada false`, `motivo null`.
  - `rng = () => 0` → ruído −1 (`pct` = impacto − 1); `rng = () => 0.999999` → ≈ impacto + 1.
  - `aplicarEvento` em carteira de R$ 10.000 com percentuais [40,30,30], evento −10% no setor da 1ª ação → `valorDepois` = 9600; preços atualizados; entrada original intacta.
  - Duas rodadas seguidas de +10% no mesmo setor → preço × 1,21 (acúmulo).
  - Percentuais [100,0,0], evento que só afeta a 2ª ação → `valorDepois === valorAntes`, resultado da 2ª com `investida:false`, `algumaInvestidaAfetada:false`, mas `precoDepois` alterado.
  - `avaliarPalpite('sobe', 100, 101) === true`; `('cai', 100, 101) === false`; `('cai', 100, 100) === true`.
  - `sortearEventos` com 10 eventos sendo 2 do grupo `juros` → 5 ids únicos e no máximo 1 do grupo `juros`, em 200 sorteios com `rng` seedado (implementar LCG simples no teste).
  - `sortearEventos` com 3 eventos e `n=5` → lança `Eventos insuficientes`.
  - `licaoFinal`: [80,10,10] → 1ª mensagem "Você apostou quase tudo numa ação só: o resultado dependeu dela."; 3 ações do mesmo setor com [40,30,30] → "Carteira concentrada: tudo subiu ou caiu junto. Diversificar reduz o risco."; 2 do mesmo setor → "Diversificação parcial: duas ações dependiam das mesmas notícias."; 3 setores → "Boa diversificação: quando um setor caía, outro segurava."; [50,50,0] com as duas investidas de setores diferentes e a de 0% do mesmo setor de uma delas → "Boa diversificação…" (0% ignorada); retorno 12 → 2ª mensagem "Retorno alto também significa risco alto: ganhar muito em pouco tempo na bolsa envolve sorte."; retorno −12 → "Perdas fazem parte. Ações são investimento de longo prazo, e diversificar ajuda a amortecer quedas."; retorno 5 → só 1 mensagem.
- [ ] **Step 2:** `npm test` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `js/setores.js` e `js/motor.js` com as assinaturas acima. `sortearEventos`: embaralhar cópia (Fisher–Yates com `rng`) e percorrer pegando eventos cujo `grupo` ainda não foi usado.
- [ ] **Step 4:** `npm test` → todos PASS.
- [ ] **Step 5:** Commit `feat: motor do jogo (sorteio, impactos, palpite, lição)`.

---

### Task 2: Escolha e distribuição da carteira (`js/carteira.js`)

**Files:**
- Create: `js/carteira.js`, `tests/carteira.test.js`

**Interfaces:**
- Consumes: tipos `Acao`, `Carteira` da Task 1.
- Produces:
  - `semAcento(texto: string): string` — minúsculas, sem diacríticos (`normalize('NFD')`).
  - `filtrarAcoes(acoes: Acao[], filtros: {setores?:string[], portes?:string[], soDividendos?:boolean, busca?:string}): Acao[]` — listas vazias/ausentes = sem filtro; busca em ticker e nome via `semAcento`.
  - `alternarSelecao(selecionadas: string[], ticker: string): string[]` — remove se presente; adiciona se houver < 3; senão devolve igual.
  - `PERCENTUAIS_PADRAO = [40, 30, 30]`.
  - `ajustarPercentual(percentuais: number[], indice: number, delta: 10|-10): number[]` — limita a [0, 100].
  - `statusDistribuicao(percentuais: number[]): {total:number, falta:number}` — `falta = 100 - total` (negativo = passou).
  - `criarCarteira(acoes: Acao[], percentuais: number[], capital = 10000): Carteira` — lança `Error('Total deve ser 100%')`; `quantidade = capital*p/100/preco`.

- [ ] **Step 1: Testes que falham:**
  - `filtrarAcoes` com `busca:'itau'` encontra `{nome:'Itaú Unibanco'}`; `busca:'PETR'` encontra PETR4; `setores:['Saúde'], portes:['Grande']` combina com E; `soDividendos:true` só traz `bonsDividendos`; filtros que não casam nada → `[]`.
  - `alternarSelecao(['A','B','C'], 'D')` → `['A','B','C']`; `(['A','B'],'A')` → `['B']`.
  - `ajustarPercentual([100,0,0], 0, 10)` → `[100,0,0]`; `([0,50,50], 0, -10)` → `[0,50,50]`; dez toques seguidos de +10 no índice 1 partindo de `[40,30,30]` → `[40,100,30]`.
  - `statusDistribuicao([40,30,40])` → `{total:110, falta:-10}`.
  - `criarCarteira` com [40,30,30] e preços 10/20/40 → quantidades 400/150/75, `valorInicial 10000`; com [40,30,20] → lança.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `js/carteira.js` com as assinaturas acima.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: filtros, seleção e distribuição da carteira`.

---

### Task 3: Ranking (`js/ranking.js`)

**Files:**
- Create: `js/ranking.js`, `tests/ranking.test.js`

**Interfaces:**
- Produces:
  - `TITULOS = ['Mestre','Investidor(a)','Administrador(a)','Dr(a).','Chefe','CEO','Magnata','Professor(a)']`.
  - `normalizarNome(texto: string): string` — trim + espaços múltiplos → 1.
  - `nomePermitido(nome: string): {ok:true} | {ok:false, motivo:'formato'|'palavrao'}` — aplica regex da Global Constraints ao nome normalizado; para palavrão: `semAcento`, troca `0→o 1→i 3→e 4→a 5→s 7→t @→a`, remove espaços, verifica se contém algum termo de `PALAVROES` (lista interna de ~40 termos ofensivos comuns em português).
  - Tipo `Entrada {titulo, nome, retornoPct:number, acertos:number, timestamp:number}`.
  - `inserirNoRanking(lista: Entrada[], entrada: Entrada): {lista:Entrada[], posicao:number}` — ordena por `retornoPct` desc, `acertos` desc, `timestamp` asc; `posicao` 1-based.
  - `topN(lista: Entrada[], n = 10): Entrada[]`.
  - `removerEntrada(lista: Entrada[], timestamp: number): Entrada[]`.
  - `CHAVE_RANKING = 'simulador-bolsa:ranking'`; `carregarRanking(storage: Storage|null, hoje: string): Entrada[]` — `hoje` = `'AAAA-MM-DD'`; formato salvo `{data, entradas}`; outro dia, JSON inválido, storage null ou exceção → `[]`.
  - `salvarRanking(storage: Storage|null, hoje: string, lista: Entrada[]): boolean` — `false` em exceção, sem lançar.
  - `dataHoje(agora = new Date()): string` — data local `AAAA-MM-DD`.

- [ ] **Step 1: Testes que falham** (storage falso = objeto com `getItem/setItem` sobre um `Map`):
  - `normalizarNome('  José   Maria ')` → `'José Maria'`; `nomePermitido('José')` ok; `'Ana123'` → formato; `'Maximiliano123'`/13 letras → formato; `''` → formato; uma variante leet de um termo da lista (ex. termo com `0` no lugar de `o`) → palavrao.
  - `inserirNoRanking`: retornos 5, 12, 12 (acertos 2 e 4) → ordem 12/4, 12/2, 5; empate total → menor timestamp primeiro; `posicao` correta para a nova entrada mesmo fora do top 10 (lista com 15).
  - `carregarRanking` com dados de `'2026-10-30'` e `hoje='2026-10-31'` → `[]`; com `'{lixo'` → `[]`; com storage cujo `getItem` lança → `[]`; com `null` → `[]`.
  - `salvarRanking` com `setItem` que lança → `false`.
  - `removerEntrada` remove só o timestamp indicado.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `js/ranking.js` (reutiliza `semAcento` de `js/carteira.js`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: ranking do dia com filtro de nomes`.

---

### Task 4: Dados das ações e script de preços

**Files:**
- Create: `data/acoes.json`, `scripts/atualizar-precos.mjs`, `tests/dados-acoes.test.js`

**Interfaces:**
- Consumes: `SETORES` (Task 1).
- Produces: `data/acoes.json` no formato `{dataReferencia:'AAAA-MM-DD', acoes: Acao[]}` lido pela interface e pelo teste de eventos.

- [ ] **Step 1: Teste de validação que falha** (`tests/dados-acoes.test.js`, lê o JSON com `fs`): `dataReferencia` casa `/^\d{4}-\d{2}-\d{2}$/`; entre 70 e 100 ações; tickers únicos casando `/^[A-Z]{4}\d{1,2}$/`; cada `setor ∈ SETORES`; `porte ∈ {Grande, Média, Pequena}`; `bonsDividendos` booleano; `preco > 0`; todo setor tem ≥ 2 ações.
- [ ] **Step 2:** `npm test` → FAIL (arquivo inexistente).
- [ ] **Step 3:** Montar a lista: obter a carteira teórica vigente do IBOVESPA na página da B3 (WebFetch); para cada ticker, definir nome popular, setor simplificado, porte (valor de mercado aproximado: > R$ 50 bi Grande; 10–50 Média; < 10 Pequena) e bons dividendos (DY 12 meses ≥ 6%). Preços iniciais = 0 por enquanto.
- [ ] **Step 4:** Escrever `scripts/atualizar-precos.mjs`: para cada ticker, `fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + ticker + '.SA?range=5d&interval=1d')`, usar `chart.result[0].meta.regularMarketPrice`, arredondar a 2 casas; `dataReferencia` = data do `regularMarketTime`; tickers que falharem mantêm o preço anterior e são listados no fim; sai com código 1 se algum preço ficar 0. Pausa de 200 ms entre requisições. Sem chave de API.
- [ ] **Step 5:** `node scripts/atualizar-precos.mjs` → "N preços atualizados", nenhum ticker com preço 0. Conferir 3 preços (PETR4, VALE3, ITUB4) contra uma fonte pública.
- [ ] **Step 6:** `npm test` → PASS.
- [ ] **Step 7:** Commit `feat: ações do IBOVESPA e script de atualização de preços`.

---

### Task 5: Banco de 50 eventos

**Files:**
- Create: `data/eventos.json`, `tests/dados-eventos.test.js`

**Interfaces:**
- Consumes: `SETORES` (Task 1), `data/acoes.json` (Task 4), `sortearEventos` (Task 1).
- Produces: `data/eventos.json` = `Evento[]`.

- [ ] **Step 1: Teste de validação que falha:** exatamente 50 eventos; `id` únicos em kebab-case; `manchete` ≤ 90 caracteres; `explicacao` entre 120 e 600 caracteres; todo impacto inteiro ou com 1 casa em [−12, 12] e ≠ 0; toda chave de `impactoSetores` e de `motivos` (quando não é ticker) ∈ `SETORES`; toda chave de `impactoAcoes` existe em `acoes.json`; todo setor aparece em ≥ 4 eventos; ≥ 15 eventos com algum impacto positivo e ≥ 15 com algum negativo; eventos com `grupo` igual: nenhum grupo com mais de 4 eventos; `sortearEventos(eventos, 5)` funciona em 500 sorteios.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Escrever os 50 eventos seguindo a distribuição da spec §4.3 (~12 economia, ~10 commodities/exterior, ~6 agro/clima, ~12 setoriais, ~6 de uma empresa, ~4 comportamento/tecnologia). Explicações para o ensino médio: frases curtas, todo jargão explicado na primeira menção. Eventos sobre empresa específica usam `impactoAcoes` e são claramente fictícios (ex.: "Empresa anuncia…" sem acusar empresa real de crime ou fraude; usar notícias neutras ou positivas para empresas reais, e notícias negativas apenas setoriais).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: banco de 50 eventos`.

---

### Task 6: Estrutura da interface, Início e tema

**Files:**
- Create: `index.html`, `css/style.css`, `js/app.js`, `js/ui.js`, `js/telas/inicio.js`

**Interfaces:**
- Consumes: `carregarRanking`, `topN`, `dataHoje` (Task 3).
- Produces:
  - Estado global em `app.js`: `estado = {acoes, eventos, dataReferencia, selecionadas:string[], percentuais:number[], carteira, eventosPartida:Evento[], rodada:number, acertos:number, historico:[], ranking:Entrada[]}`.
  - `irPara(nomeTela: string, params?: object): void` — limpa `#app` e chama `telas[nomeTela].render(container, estado, irPara)`.
  - Contrato de tela: cada `js/telas/*.js` exporta `render(container: HTMLElement, estado, irPara): void`.
  - `ui.js`: `formatarReais(v)`, `formatarPct(v)` (com sinal, vírgula, 1 casa, ▲/▼), `el(tag, attrs, ...filhos)`, `animarNumero(elemento, de, ate, ms, formatador)`, `confete(container)`.

- [ ] **Step 1:** `index.html` com `<main id="app">`, letreiro `#ticker`, rodapé com o aviso, `<script type="module" src="./js/app.js">`, meta viewport com `user-scalable=no`.
- [ ] **Step 2:** `css/style.css`: tokens de cor (fundo escuro, verde, vermelho, destaque), tipografia grande, layout em colunas ≥ 1024 px e coluna única abaixo, alvos de toque conforme Global Constraints, `touch-action: manipulation`, `user-select: none`, `-webkit-touch-callout: none`, animação do letreiro.
- [ ] **Step 3:** `app.js`: carregar os dois JSON com `fetch`; em falha, tela "Não foi possível carregar os dados" com botão "Tentar de novo"; bloquear `contextmenu`; render do letreiro; `irPara('inicio')`.
- [ ] **Step 4:** `telas/inicio.js`: título "Simulador da Bolsa", subtítulo, botão "Começar" (→ `escolha`, zerando o estado da partida), top 10 do ranking ou "Seja o primeiro do ranking de hoje!".
- [ ] **Step 5:** Verificar no navegador embutido (servidor estático local, ex. `npx --yes http-server -p 8080` ou `python -m http.server 8080`): Início aparece em 1920×1080 e 375×812, letreiro roda, sem erros no console.
- [ ] **Step 6:** Commit `feat: estrutura da interface e tela inicial`.

---

### Task 7: Telas de escolha e distribuição

**Files:**
- Create: `js/telas/escolha.js`, `js/telas/distribuicao.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `filtrarAcoes`, `alternarSelecao`, `PERCENTUAIS_PADRAO`, `ajustarPercentual`, `statusDistribuicao`, `criarCarteira` (Task 2); `SETORES`, `CORES_SETOR`, `sortearEventos` (Task 1).

- [ ] **Step 1:** `escolha.js`: filtros (chips de setor múltiplos, chips de porte, chip "Bons dividendos", busca, "Limpar filtros"); grade de cards (selo com iniciais na cor do setor, ticker, nome, setor, porte, preço, 💰 se bons dividendos); cards selecionados destacados, os demais esmaecidos com 3 escolhidas; barra inferior fixa com 3 espaços; botão "Montar carteira" só com 3. Lista vazia → "Nenhuma ação com esses filtros. Toque em Limpar filtros." No celular, filtros numa gaveta aberta por botão "Filtros".
- [ ] **Step 2:** `distribuicao.js`: uma linha por ação com − / % / + e valor em R$; status "Falta distribuir X%" / "Passou X% do total" / "Tudo distribuído!"; "Voltar" (→ escolha, mantendo seleção); "Confirmar carteira" habilitado só com total 100 → `criarCarteira`, `sortearEventos(estado.eventos, 5)`, `rodada = 0`, → `rodada`.
- [ ] **Step 3:** Verificar no navegador: busca "itau" acha Itaú; filtros combinados; escolher 3; distribuir [100,0,0] e [40,30,30]; botão desabilitado com 90% e 110%; duplo toque rápido em + não passa de 100.
- [ ] **Step 4:** Commit `feat: escolha de ações e distribuição em %`.

---

### Task 8: Rodadas e resultado

**Files:**
- Create: `js/telas/rodada.js`, `js/telas/resultado.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `aplicarEvento`, `avaliarPalpite`, `valorCarteira`, `licaoFinal` (Task 1); `animarNumero`, `confete`, `formatarPct`, `formatarReais` (Task 6).

- [ ] **Step 1:** `rodada.js`, três fases na mesma tela: (a) placar "Rodada N de 5" + valor da carteira + manchete em estilo plantão; (b) "Sua carteira vai subir ou cair?" com "▲ Subir" / "▼ Cair"; (c) ao tocar: desabilitar os dois botões, chamar `aplicarEvento` uma única vez, animar preços e valor (~1,2 s), mostrar "Você acertou!" + confete ou "Não foi dessa vez", lista de resultados (ações não investidas marcadas "não investida", sem R$), mensagem "Seu setor passou ileso desta vez, e isso também é diversificação!" quando `!algumaInvestidaAfetada`, explicação, botão "Seguir em frente" (rodada 5: "Ver resultado"), desabilitado após o primeiro toque. Guardar em `estado.historico` o retorno de cada ação.
- [ ] **Step 2:** `resultado.js`: valor inicial/final, retorno % com ▲/▼, desempenho de cada ação na partida, "Palpites certos: N de 5", mensagens de `licaoFinal`, botão "Entrar no ranking".
- [ ] **Step 3:** Verificar no navegador: partida completa em 1920×1080 e 375×812; duplo toque em "Subir" e em "Seguir em frente" não pula rodada nem aplica evento duas vezes; carteira [100,0,0] mostra "não investida".
- [ ] **Step 4:** Commit `feat: rodadas com palpite e tela de resultado`.

---

### Task 9: Tela de ranking, painel do professor e inatividade

**Files:**
- Create: `js/telas/ranking.js`, `js/inatividade.js`
- Modify: `js/app.js`, `js/telas/inicio.js`, `css/style.css`

**Interfaces:**
- Consumes: Task 3 inteira.
- Produces: `iniciarInatividade({limiteMs = 60000, avisoMs = 10000, aoExpirar, aoAvisar(segundosRestantes), aoCancelar}): {reiniciar(), parar()}` em `js/inatividade.js`, ouvindo `pointerdown` e `keydown` no `document`.

- [ ] **Step 1:** `telas/ranking.js`: botões dos `TITULOS`; campo de nome com `maxlength=12`; "Salvar" valida com `nomePermitido` (mensagens: formato → "Use só letras, até 12."; palavrao → "Escolha outro nome."); `inserirNoRanking` + `salvarRanking` (se `false`, manter só em memória); mostrar top 10 com a entrada nova destacada e "Você ficou em Nº lugar" mesmo fora do top 10; botão "Jogar de novo" (→ inicio).
- [ ] **Step 2:** Painel do professor: segurar o título "Ranking" (no Início e na tela de ranking) por 3 s abre lista com "Apagar" por entrada e "Zerar ranking de hoje" (com confirmação na tela).
- [ ] **Step 3:** `inatividade.js` + ligação em `app.js`: ativo em todas as telas exceto `inicio`; aviso visível "Voltando ao início em N…" nos últimos 10 s; qualquer toque cancela; ao expirar, `irPara('inicio')`.
- [ ] **Step 4:** Verificar no navegador: salvar "Mestre Ana", ver no Início; nome "Ana123" recusado; painel do professor apaga e zera; ficar 60 s parado na escolha volta ao início, tocar aos 55 s cancela; recarregar a página mantém o ranking.
- [ ] **Step 5:** Commit `feat: ranking, painel do professor e volta por inatividade`.

---

### Task 10: PWA offline, ícones e README

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `README.md`
- Modify: `index.html`, `js/app.js`

- [ ] **Step 1:** `manifest.webmanifest`: `name` "Simulador da Bolsa", `short_name` "Bolsa", `start_url` e `scope` `"./"`, `display` `"fullscreen"`, cores do tema, ícones. Gerar os PNGs a partir de um SVG (gráfico de velas ▲ em verde sobre fundo escuro) com script local.
- [ ] **Step 2:** `sw.js`: `CACHE = 'simulador-bolsa-v1'`; `install` faz `addAll` de todos os arquivos do app (lista explícita); `activate` apaga caches antigos; `fetch` cache-first com fallback para rede. Registrar em `app.js` com `navigator.serviceWorker.register('./sw.js')`.
- [ ] **Step 3:** `README.md`: o que é; como jogar; como abrir em tela cheia na feira (Chrome: instalar o app pelo ícone na barra de endereço, ou `chrome --kiosk URL`); como editar `data/eventos.json` pelo site do GitHub (com o formato de um evento); como atualizar preços (`node scripts/atualizar-precos.mjs` e trocar a versão em `sw.js`); como zerar o ranking (segurar o título "Ranking").
- [ ] **Step 4:** Verificar no navegador: aba Application sem erros no manifest; com o servidor parado, recarregar e jogar uma partida inteira offline.
- [ ] **Step 5:** `npm test` → PASS. Commit `feat: PWA offline, ícones e README`.

---

### Task 11: Publicação no GitHub

- [ ] **Step 1:** Confirmar com o professor antes de qualquer ação externa: criar repositório **público** `saulojardimspotify/simulador-bolsa-pwa`.
- [ ] **Step 2:** `gh repo create simulador-bolsa-pwa --public --source . --push --description "Simulador educativo da bolsa para feira escolar (PWA)"`.
- [ ] **Step 3:** Ativar Pages: `gh api -X POST repos/saulojardimspotify/simulador-bolsa-pwa/pages -f "source[branch]=main" -f "source[path]=/"`.
- [ ] **Step 4:** Aguardar o deploy e abrir `https://saulojardimspotify.github.io/simulador-bolsa-pwa/` no navegador embutido: jogo carrega, sem erros 404 no console, app instalável.
- [ ] **Step 5:** Informar o link ao professor.
