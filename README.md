# Garagem

**Use de graça:** https://wsgwagner.github.io/garagem-site/

Controle de manutenção de veículos, para celular e computador. Cadastre um carro, responda
quatro perguntas, e o app monta o plano: o que trocar, de quantos em quantos quilômetros e
quando. Você registra o que já fez; ele avisa o que está chegando na hora.

- **Próximas trocas**, com a data estimada pela sua média de km. Sem registro, o app pergunta
  em vez de dizer "em dia".
- **Verificado:** anota que você conferiu a peça, sem contar como troca.
- **Revisão completa:** vários serviços de uma vez, com aviso de lançamento repetido.
- **Histórico por peça:** quanto a anterior durou, desgaste antes da hora e garantia.
- **Custos:** manutenção, combustível e documentos, por mês, por categoria e por km.
- **Etanol ou gasolina** pelo consumo real do carro.
- **Documentos e despesas** com aviso de vencimento.
- **Foto da nota** em cada serviço, **PDF**, **CSV** e backup.

JavaScript puro em módulos ES, sem framework e sem build. Página estática, abre sem internet
(PWA). Sem login, os dados ficam só no aparelho; com login Google (opcional), são copiados
para o Firebase e aparecem em todos os seus aparelhos. De fora, o app usa
só a biblioteca do Firebase, para a nuvem, e as fontes do Google Fonts.

## Estrutura

```
.
├── index.html                 telas e janelas
├── manifest.webmanifest       instalação como app no celular
├── sw.js                      service worker: abre sem internet
├── css/
│   └── style.css              tema claro/escuro por variáveis CSS
├── img/                       ícones do app instalado
├── testes/                    testes automatizados (node --test)
├── firestore.rules            regras de acesso da nuvem
└── js/
    ├── app.js                 ponto de entrada
    ├── util.js, texto.js      formatação, datas, textos comparáveis
    ├── contas.js              contas puras: consumo, custos, previsão, garantia (testadas)
    ├── calculos.js            odômetro e alertas do veículo ativo
    ├── dados.js               estado, localStorage, backup, CSV
    ├── juncao.js, sincronia.js   junta aparelho e nuvem sem perder registros
    ├── nuvem.js, nuvem-config.js login e Firestore
    ├── fotos.js               fotos das notas (IndexedDB e nuvem)
    ├── ui*.js                 telas: alertas, revisão, documentos, custos, flex, verificação…
    └── planos/
        ├── base.js            itens genéricos por perfil do veículo
        ├── modelos.js         biblioteca de modelos, com a fonte de cada prazo
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
2. `planos/modelos.js` é a biblioteca de veículos, com prazos do manual do fabricante ou de
   reportagens da revista O Mecânico (marcados como tal; confira no manual). Um modelo corrige intervalos, acrescenta itens e remove os que não se
   aplicam. Modelos podem herdar de outro (`herda`), o que permite descrever a linha
   inteira de uma marca uma vez só.
3. `planos/montar.js` junta os dois e marca a origem de cada intervalo, que aparece na
   tela: manual do fabricante, revista, intervalo típico, inspeção, recomendação de oficina ou
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

## Nuvem (opcional)

Login com Google e cópia no Firestore, para ter os mesmos dados em vários aparelhos. As
regras em `firestore.rules` só deixam cada conta ler e gravar a própria garagem e as próprias
fotos; elas precisam ser publicadas no console do Firebase. Para usar em um projeto seu,
troque `js/nuvem-config.js`; com a `apiKey` vazia a nuvem fica desligada. As fotos não entram
no arquivo de backup.

## Testes

```bash
node --test testes/*.mjs
```
