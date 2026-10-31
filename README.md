# Simulador da Bolsa

App educativo (PWA) para feiras escolares. O aluno recebe **R$ 10.000 fictícios**, monta uma carteira com **3 ações do IBOVESPA**, divide o dinheiro em partes de 10% e acompanha **5 notícias sorteadas**, de preferência notícias que afetam as empresas da carteira dele. A cada notícia ele diz, **para cada ação**, se ela sobe, fica neutra ou cai (até 15 acertos por partida), vê quanto cada uma mudou e lê o porquê. No fim, vê o resultado, uma lição sobre diversificação e entra no **ranking do dia**.

> Simulação educativa: os eventos e os impactos são fictícios. Os preços iniciais são reais, da data indicada no rodapé.

## Como usar na feira

1. Abra o endereço do app no **Google Chrome** do computador do monitor touch, com internet, pelo menos uma vez antes da feira. A partir daí ele funciona **sem internet**.
2. Instale o app: clique no ícone de instalar na barra de endereço do Chrome (um monitor com uma seta). Ele abre em tela cheia, sem barra do navegador.
3. Se preferir o modo quiosque (sem como sair da tela por engano), crie um atalho com:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk https://SEU-USUARIO.github.io/simulador-bolsa-pwa/
   ```
   Para sair do modo quiosque: `Alt + F4`.

Se ninguém tocar na tela por **60 segundos**, o app volta sozinho para a tela inicial.

## Área do professor (ranking)

Segure o dedo por **3 segundos** sobre o título **"🏆 Ranking de hoje"**. Abre um painel para **apagar** um nome ou **zerar** o ranking do dia. O ranking fica salvo só naquele computador e começa vazio a cada novo dia.

## Som

O app toca efeitos sonoros (sino de abertura do pregão ao confirmar a carteira, vinheta de plantão, acertos, fanfarra no resultado, um "plim" de conquista no ranking). Os sons são gerados pelo próprio navegador, sem arquivos, e funcionam offline.

- O botão **🔊/🔇** no canto superior direito liga e desliga o som.
- No **painel do professor** (segurar o título do ranking por 3 segundos) há o **volume** e a **música de fundo**, que vem desligada.
- As escolhas ficam salvas naquele computador.
- Os sons só começam depois do primeiro toque na tela (regra dos navegadores).

## Editar as notícias

As notícias ficam em [`data/eventos.json`](data/eventos.json). Dá para editar direto no site do GitHub (abra o arquivo e clique no lápis ✏️). Cada evento tem este formato:

```json
{
  "id": "selic-sobe",
  "manchete": "Banco Central sobe a taxa Selic para conter a inflação",
  "explicacao": "Texto curto explicando por que isso mexe com as ações.",
  "impactos": { "MGLU3": -9, "LREN3": -5, "ITUB4": 2 },
  "motivos": { "MGLU3": "Depende muito de vendas parceladas", "LREN3": "Vendas a prazo ficam mais caras", "ITUB4": "Ganha mais com os juros dos empréstimos" },
  "grupo": "juros"
}
```

- **impactos**: quanto (em %, de 1 a 12, para cima ou para baixo) cada **empresa** sobe ou cai, pelo código da ação. Só entram as empresas que a notícia afeta de verdade; as outras ficam paradas, e para elas a resposta certa é "neutra".
- **motivos**: frase curta mostrada ao lado de cada empresa citada em `impactos` (obrigatória para todas).
- **impactoGeral** e **motivoGeral** (opcionais): só para notícias que mexem com a economia toda (juros, PIB, crise...). Todas as empresas não citadas sobem ou caem esse tanto (de 1 a 2,5), sempre menos que as citadas. Notícias sobre uma empresa ou um setor não usam isso, e as demais ações ficam neutras.
- **grupo** (opcional): eventos do mesmo grupo nunca saem na mesma partida (ex.: "Selic sobe" e "Selic cai").
- O banco precisa ter exatamente **50** eventos, e toda empresa precisa aparecer em pelo menos 3 notícias (os testes conferem).

Depois de publicar uma alteração, o app mostra a versão nova a partir da **segunda** vez que for aberto com internet.

## Atualizar os preços

Com o [Node.js](https://nodejs.org) instalado, na pasta do projeto:

```
node scripts/atualizar-precos.mjs
```

O script busca a última cotação de cada ação e regrava `data/acoes.json`.

Os logos das empresas ficam em `logos/` (baixados de brapi.dev). Se entrar uma ação nova na lista, rode `node scripts/baixar-logos.mjs`; ela baixa só os que faltam. Ação sem logo aparece com um selo colorido com as iniciais. Os logos são marcas das empresas, usados aqui só para identificá-las num app educativo. Porte e "bons dividendos" são classificações aproximadas, feitas à mão; revise-as de tempos em tempos. A lista de ações segue a carteira teórica do IBOVESPA na B3; se ela mudar, edite `data/acoes.json`.

## Para desenvolver

```
npm test          # testes automáticos da lógica e validação dos dados
npm start         # servidor local em http://localhost:8080
node scripts/gerar-icones.mjs   # gera os ícones
```

Não há dependências para instalar. O app é HTML, CSS e JavaScript puros.

**Ao mudar código** (HTML, CSS ou JS), troque a versão em `const CACHE = 'simulador-bolsa-v1'` no [`sw.js`](sw.js) (por exemplo para `v2`). Sem isso, quem já abriu o app continua vendo a versão antiga. Mudanças só em `data/*.json` não precisam disso.
