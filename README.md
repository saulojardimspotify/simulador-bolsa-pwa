# Simulador da Bolsa

App educativo (PWA) para feiras escolares. O aluno recebe **R$ 10.000 fictícios**, monta uma carteira com **3 ações do IBOVESPA**, divide o dinheiro em partes de 10% e acompanha **5 notícias sorteadas**. As notícias são escolhidas de preferência entre as que afetam as ações da carteira dele. A cada notícia ele dá um palpite (a carteira vai subir, ficar igual, com variação menor que 0,5%, ou cair?), vê quanto cada ação mudou e lê o porquê. No fim, vê o resultado, uma lição sobre diversificação e entra no **ranking do dia**.

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

## Editar as notícias

As notícias ficam em [`data/eventos.json`](data/eventos.json). Dá para editar direto no site do GitHub (abra o arquivo e clique no lápis ✏️). Cada evento tem este formato:

```json
{
  "id": "selic-sobe",
  "manchete": "Banco Central sobe a taxa Selic para conter a inflação",
  "explicacao": "Texto curto explicando por que isso mexe com as ações.",
  "impactoSetores": { "Varejo e Consumo": -6, "Bancos e Finanças": 3 },
  "impactoAcoes": { "MGLU3": -9 },
  "motivos": { "Varejo e Consumo": "Vendas a prazo ficam mais caras" },
  "impactoMercado": -2,
  "motivoMercado": "Juros altos derrubam a bolsa toda",
  "grupo": "juros"
}
```

- **impactoSetores**: quanto (em %) cada setor sobe ou cai. Use os nomes de setor exatamente como em [`js/setores.js`](js/setores.js).
- **impactoAcoes** (opcional): impacto específico de uma ação; vale mais que o do setor.
- **motivos** (opcional): frase curta mostrada ao lado da ação, por setor ou por código.
- **impactoMercado**: quanto (em %, de ±0,5 a ±4) se mexem todas as outras ações, as que não são do setor citado. É o "humor geral da bolsa" com a notícia.
- **motivoMercado**: frase curta mostrada ao lado dessas ações.
- **grupo** (opcional): eventos do mesmo grupo nunca saem na mesma partida (ex.: "Selic sobe" e "Selic cai").
- Impactos entre **−12 e +12**, nunca 0. O banco precisa ter exatamente **50** eventos (os testes conferem).

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
