# Garagem

Controle de manutenção preventiva de veículos. Cadastre um carro, responda quatro
perguntas sobre ele, e o app monta o plano de manutenção: o que trocar, de quantos em
quantos quilômetros e quando. Você registra o que já fez; ele avisa o que está chegando
na hora, calcula o consumo, soma os custos e gera o histórico em PDF.

Página estática, sem servidor, sem conta e sem dependências. Os dados ficam no
`localStorage` do aparelho e só saem nos arquivos que o próprio usuário baixa.

## Estrutura

```
.
├── index.html                 telas e janelas (nenhuma lógica aqui)
├── manifest.webmanifest       instalação como app no celular
├── sw.js                      service worker: abre sem internet
├── css/
│   └── style.css              tema claro/escuro por variáveis CSS
├── img/                       ícones do app instalado
└── js/
    ├── app.js                 ponto de entrada
    ├── util.js                formatação, datas, números, download
    ├── dados.js               estado, localStorage, backup, CSV
    ├── calculos.js            odômetro, alertas, consumo
    ├── ui.js                  tela principal, abas, odômetro
    ├── ui-veiculos.js         seletor e cadastro de veículos
    ├── ui-plano.js            aba do plano e edição de item
    ├── ui-formularios.js      janelas de troca e abastecimento
    ├── ui-dados.js            PDF, backup, CSV, instalação
    └── planos/
        ├── base.js            itens genéricos por perfil do veículo
        ├── modelos.js         modelos com plano conferido no manual
        └── montar.js          junta perfil + modelo e monta o plano
```

Módulos ES nativos, sem build. Por isso precisa ser servido por HTTP: abrir o
`index.html` por duplo clique (`file://`) não funciona.

## Rodar

Com a extensão **Live Server** do VS Code: botão direito no `index.html` →
_Open with Live Server_. Ou, dentro da pasta:

```bash
python -m http.server 8000   # abra http://localhost:8000
```

## Publicar

Serve qualquer hospedagem estática. No GitHub Pages: suba a pasta na raiz do
repositório e ligue em **Settings → Pages → Deploy from a branch → main / (root)**.

## Como o plano é montado

1. `planos/base.js` tem os itens genéricos, cada um com o intervalo típico dos manuais
   e uma condição opcional `so` — só entra no plano se o perfil do veículo casar
   (motor diesel, câmbio CVT, correia dentada, e assim por diante).
2. `planos/modelos.js` é a biblioteca de veículos cujo plano foi conferido no manual do
   fabricante. Um modelo corrige intervalos, acrescenta itens e remove os que não se
   aplicam. Modelos podem herdar de outro (`herda`), o que permite descrever a linha
   inteira de uma marca uma vez só.
3. `planos/montar.js` junta os dois e marca a origem de cada intervalo, que aparece na
   tela: manual do fabricante, intervalo típico, inspeção, recomendação de oficina ou
   ajuste do próprio usuário.

O que o usuário editar fica marcado como dele e sobrevive a um "refazer pelo modelo".

### Acrescentar um veículo à biblioteca

Copie um bloco em `planos/modelos.js` e preencha. Uma regra: `fonte: "manual"` só quando
o número saiu mesmo do manual do fabricante. Na dúvida, deixe o item de fora e o plano
genérico cuida dele — é melhor um intervalo declaradamente típico do que um número
inventado com cara de oficial.

## Dados

- **Salvar backup** gera um `.json` com todos os veículos e registros.
- **Restaurar backup** junta com o que já existe, sem duplicar (a união é por `id`).
- **Importar CSV** lê planilhas com colunas Data, Km, Peça/serviço, Oficina e custos —
  aceita `;` ou `,` como separador e reconhece as colunas pelo cabeçalho.
- **Gerar PDF do histórico** usa a impressão do navegador com uma folha `@media print`,
  sem biblioteca externa.
