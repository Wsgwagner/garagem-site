/* planos/modelos.js
   Biblioteca de modelos cujo plano foi conferido no manual do fabricante.
   Um modelo daqui corrige o plano genérico: troca intervalos, adiciona itens
   que só ele tem e remove os que não se aplicam.

   Para acrescentar um carro, copie um bloco abaixo e preencha. O que importa:
   `fonte` deve ser "manual" apenas quando o número saiu mesmo do manual do
   fabricante — o resto é "perfil" ou "oficina". Prefira deixar um item de fora
   a chutar um intervalo.

     id        identificador único, usado no cadastro do veículo
     nome      como aparece na lista
     detalhe   motorização e anos que o plano cobre
     fonte     de onde vieram os números (aparece na tela do plano)
     perfil    respostas que o app assume ao escolher este modelo
     ajustes   [{ item, km, meses, sevKm, sevMeses, fonte, nota }] — casa pelo nome do item
     extras    itens que só existem neste modelo
     remover   nomes de itens do plano genérico que não se aplicam
*/

var MODELOS = [
  {
    id: "nissan-flex-2010-2016",
    nome: "Nissan flex (linha 2010–2016)",
    detalhe: "March, Versa, Tiida, Livina, Grand Livina e Sentra com motor flex",
    fonte: "Manual de Garantia e Manutenção Nissan — veículos flex, uso normal",
    perfil: { combustivel:"flex" },
    ajustes: [
      { item:"Óleo do motor", km:10000, meses:12, sevKm:5000, sevMeses:6, fonte:"manual" },
      { item:"Filtro de óleo", km:10000, meses:12, sevKm:5000, sevMeses:6, fonte:"manual" },
      { item:"Filtro de ar", km:20000, meses:24, sevKm:10000, sevMeses:12, fonte:"manual",
        nota:"Em uso severo o manual manda limpar a cada 5.000 km." },
      { item:"Filtro de combustível", km:10000, meses:12, fonte:"manual",
        nota:"O manual da Nissan pede a cada revisão. Muita oficina faz a cada 20.000 km — se você seguir assim, ajuste o intervalo aqui." },
      { item:"Filtro do ar-condicionado (cabine)", km:20000, meses:24, fonte:"manual" },
      { item:"Velas de ignição", km:100000, meses:0, fonte:"manual",
        nota:"Vale para as velas de platina ou irídio, que são as originais. Com vela comum de níquel, o intervalo cai para 40.000 km." },
      { item:"Líquido de arrefecimento", km:80000, meses:48, fonte:"manual" },
      { item:"Fluido de freio", km:40000, meses:24, fonte:"manual",
        nota:"O manual manda inspecionar a cada 20.000 km ou 12 meses e trocar a cada 24 meses." },
      { item:"Correia de acessórios (poly-V)", km:80000, meses:48, fonte:"manual",
        nota:"Inspecionar a cada 40.000 km ou 24 meses." },
      { item:"Alinhamento e balanceamento", km:10000, meses:12, fonte:"manual",
        nota:"O manual pede alinhamento a cada revisão, com rodízio e balanceamento se necessário." },
      { item:"Óleo do câmbio", km:80000, meses:48, fonte:"oficina",
        nota:"O manual só manda verificar nível e vazamento. Oficinas costumam trocar entre 60.000 e 80.000 km." }
    ]
  },

  {
    id: "nissan-grand-livina-2013",
    nome: "Nissan Grand Livina 2013–2014",
    detalhe: "1.8 16V flex (motor MR18DE), 5 ou 7 lugares",
    fonte: "Manual de Garantia e Manutenção Nissan + ficha técnica do modelo",
    herda: "nissan-flex-2010-2016",
    perfil: { combustivel:"flex", sincronismo:"corrente" },
    remover: ["Kit correia dentada + tensor", "Bomba d'água"],
    ajustes: [
      { item:"Corrente de comando", fonte:"semtroca",
        nota:"O 1.8 (MR18DE) usa corrente de comando, não correia dentada. Não tem troca programada — só se mexe se aparecer ruído ou folga." },
      { item:"Pastilhas de freio dianteiras", km:40000, meses:0, fonte:"oficina",
        nota:"Sem intervalo de fábrica. Na Livina, que é pesada e tem freio a disco só na frente, o normal fica entre 30.000 e 50.000 km; em trânsito parado cai para uns 25.000." },
      { item:"Freios traseiros (pastilhas ou lonas)", km:80000, meses:0, fonte:"oficina",
        nota:"A traseira é freio a tambor, com lonas. Trabalham bem menos que a frente e costumam durar o dobro ou mais." }
    ]
  }
];

var MODELOS_IDX = {};
MODELOS.forEach(function(m){ MODELOS_IDX[m.id] = m; });

export { MODELOS, MODELOS_IDX };
