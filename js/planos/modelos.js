/* planos/modelos.js
   Biblioteca de modelos cujo plano foi conferido no manual do fabricante.
   Um modelo daqui corrige o plano genérico: troca intervalos, adiciona itens
   que só ele tem e remove os que não se aplicam.

   Para acrescentar um carro, copie um bloco abaixo e preencha. O que importa:
   `fonte` deve ser "manual" apenas quando o número saiu mesmo do manual do
   fabricante. Prazo do fabricante lido em reportagem é "revista"; o resto é "perfil" ou "oficina". Prefira deixar um item de fora
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
  },

  {
    id: "chevrolet-onix-10t-2020",
    nome: "Chevrolet Onix 1.0 Turbo automático (2020 em diante)",
    detalhe: "Onix e Onix Plus de 2ª geração; matéria com o Premier 2021",
    // https://omecanico.com.br/?p=98977
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "automatico", "sincronismo": "correia"},
    remover: ["Bomba d'água"],
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 40000, "fonte": "revista", "nota": "O prazo em meses não está na matéria: é o típico."},
      {"item": "Filtro de combustível", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 100000, "meses": 0, "fonte": "revista", "nota": "Velas de irídio."},
      {"item": "Líquido de arrefecimento", "km": 150000, "meses": 60, "fonte": "revista"},
      {"item": "Fluido de freio", "km": 0, "meses": 24, "fonte": "revista"},
      {"item": "Correia de acessórios (poly-V)", "km": 120000, "meses": 60, "fonte": "revista"},
      {"item": "Kit correia dentada + tensor", "km": 240000, "meses": 180, "fonte": "revista", "nota": "Correia banhada a óleo: só dura isso com o óleo exato do manual e trocado em dia. Peça inspeção a cada revisão; óleo errado pode destruir a correia bem antes."},
      {"item": "Fluido do câmbio automático", "km": 80000, "meses": 0, "fonte": "revista"}
    ]
  },

  {
    id: "fiat-strada-13-cvt",
    nome: "Fiat Strada 1.3 Firefly CVT",
    detalhe: "Matéria com a Strada Ranch 2022",
    // https://omecanico.com.br/raio-x-fiat-strada-ranch-cvt/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "cvt", "sincronismo": "corrente"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 20000, "meses": 24, "fonte": "revista"},
      {"item": "Filtro de combustível", "km": 20000, "meses": 24, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 40000, "meses": 0, "fonte": "revista"},
      {"item": "Líquido de arrefecimento", "km": 240000, "meses": 120, "fonte": "revista"},
      {"item": "Fluido de freio", "km": 40000, "meses": 24, "fonte": "revista"},
      {"item": "Correia de acessórios (poly-V)", "km": 60000, "meses": 48, "fonte": "revista"},
      {"item": "Corrente de comando", "fonte": "semtroca", "nota": "Este motor usa corrente de comando, sem troca programada. Ruído ou folga pede oficina."},
      {"item": "Fluido do CVT", "fonte": "perfil", "nota": "A Fiat não indica troca do fluido deste CVT. O intervalo aqui é o típico, por precaução; confirme com a oficina."}
    ]
  },

  {
    id: "fiat-argo-10-firefly",
    nome: "Fiat Argo 1.0 Firefly manual",
    detalhe: "A matéria só confirma a corrente de comando; o resto é intervalo típico",
    // https://omecanico.com.br/raio-x-fiat-argo-1-0-firefly/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "manual", "sincronismo": "corrente"},
    ajustes: [
      {"item": "Corrente de comando", "fonte": "semtroca", "nota": "Este motor usa corrente de comando, sem troca programada. Ruído ou folga pede oficina."}
    ]
  },

  {
    id: "ford-ka-10-3cil",
    nome: "Ford Ka 1.0 3 cilindros manual",
    detalhe: "Matéria de 2016; anos posteriores podem ter prazos diferentes",
    // https://omecanico.com.br/262-raio-x-ford-ka/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "manual", "sincronismo": "correia"},
    remover: ["Bomba d'água"],
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 6, "sevKm": 5000, "sevMeses": 3, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 6, "sevKm": 5000, "sevMeses": 3, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 40000, "fonte": "revista", "nota": "O prazo em meses não está na matéria: é o típico."},
      {"item": "Filtro de combustível", "km": 10000, "meses": 6, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 40000, "meses": 0, "fonte": "revista"},
      {"item": "Líquido de arrefecimento", "km": 160000, "meses": 72, "fonte": "revista", "nota": "Primeira troca aos 160.000 km ou 6 anos; depois, a cada 80.000 km ou 3 anos. Depois da primeira, ajuste aqui."},
      {"item": "Fluido de freio", "km": 0, "meses": 24, "fonte": "revista"},
      {"item": "Kit correia dentada + tensor", "km": 260000, "meses": 0, "fonte": "revista", "nota": "Correia banhada a óleo: só dura isso com o óleo exato do manual e trocado em dia. Peça inspeção a cada revisão; óleo errado pode destruir a correia bem antes."}
    ]
  },

  {
    id: "honda-civic-20-2021",
    nome: "Honda Civic 2.0 CVT (2021)",
    detalhe: "Matéria com o EX 2021",
    // https://omecanico.com.br/raio-x-honda-civic-ex-2021
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "cvt", "sincronismo": "corrente"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 20000, "meses": 24, "fonte": "revista"},
      {"item": "Filtro de combustível", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Filtro do ar-condicionado (cabine)", "km": 20000, "meses": 24, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 60000, "meses": 0, "fonte": "revista"},
      {"item": "Líquido de arrefecimento", "km": 200000, "meses": 120, "fonte": "revista"},
      {"item": "Fluido de freio", "km": 0, "meses": 36, "fonte": "revista"},
      {"item": "Corrente de comando", "fonte": "semtroca", "nota": "Este motor usa corrente de comando, sem troca programada. Ruído ou folga pede oficina."},
      {"item": "Fluido do CVT", "km": 40000, "meses": 36, "fonte": "revista", "nota": "Use o fluido Honda HCF-2."}
    ]
  },

  {
    id: "honda-hrv-15",
    nome: "Honda HR-V 1.5 aspirado CVT",
    detalhe: "Injeção direta; matéria com o EXL",
    // https://omecanico.com.br/?p=107465
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "cvt"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 20000, "meses": 24, "fonte": "revista"},
      {"item": "Filtro de combustível", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 60000, "meses": 0, "fonte": "revista"},
      {"item": "Fluido de freio", "km": 0, "meses": 36, "fonte": "revista"},
      {"item": "Fluido do CVT", "km": 40000, "meses": 36, "fonte": "revista", "nota": "Use o fluido Honda HCF-2."}
    ]
  },

  {
    id: "hyundai-hb20-10",
    nome: "Hyundai HB20 1.0 aspirado manual",
    detalhe: "Matéria com o Sense 2022",
    // https://omecanico.com.br/?p=100885
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "manual", "sincronismo": "corrente"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 40000, "meses": 48, "fonte": "revista"},
      {"item": "Filtro de combustível", "km": 10000, "meses": 0, "fonte": "revista"},
      {"item": "Filtro do ar-condicionado (cabine)", "km": 20000, "meses": 24, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 160000, "meses": 0, "fonte": "revista", "nota": "Prazo longo: vale inspecionar a cada 50.000 km."},
      {"item": "Líquido de arrefecimento", "km": 100000, "meses": 120, "fonte": "revista"},
      {"item": "Corrente de comando", "fonte": "semtroca", "nota": "Este motor usa corrente de comando, sem troca programada. Ruído ou folga pede oficina."}
    ]
  },

  {
    id: "hyundai-hb20-10t",
    nome: "Hyundai HB20 1.0 TGDI automático",
    detalhe: "Turbo com injeção direta; matéria com a linha 2023",
    // https://omecanico.com.br/raio-x-hyundai-hb20-1-0/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "automatico"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 40000, "meses": 48, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 60000, "meses": 0, "fonte": "revista"},
      {"item": "Líquido de arrefecimento", "km": 100000, "meses": 60, "fonte": "revista", "nota": "Primeira troca aos 100.000 km ou 5 anos; depois, a cada 40.000 km ou 2 anos. Depois da primeira, ajuste aqui."}
    ]
  },

  {
    id: "jeep-compass-t270",
    nome: "Jeep Compass 1.3 T270 flex automático",
    detalhe: "Matéria com o Compass 2022; o mesmo motor equipa Toro e Commander",
    // https://omecanico.com.br/raio-x-jeep-compass-1-3-turbo/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "automatico", "sincronismo": "corrente"},
    ajustes: [
      {"item": "Óleo do motor", "km": 12000, "meses": 12, "sevKm": 6000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 12000, "meses": 12, "sevKm": 6000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 24000, "meses": 24, "fonte": "revista"},
      {"item": "Filtro de combustível", "km": 12000, "meses": 12, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 60000, "meses": 0, "fonte": "revista"},
      {"item": "Líquido de arrefecimento", "km": 240000, "meses": 120, "fonte": "revista"},
      {"item": "Fluido de freio", "km": 36000, "meses": 24, "fonte": "revista"},
      {"item": "Correia de acessórios (poly-V)", "km": 120000, "meses": 72, "fonte": "revista"},
      {"item": "Corrente de comando", "fonte": "semtroca", "nota": "Este motor usa corrente de comando, sem troca programada. Ruído ou folga pede oficina."},
      {"item": "Fluido do câmbio automático", "fonte": "perfil", "nota": "O manual não pede troca deste fluido. O intervalo aqui é o típico, por precaução; confirme com a oficina."}
    ]
  },

  {
    id: "nissan-kicks-16-cvt",
    nome: "Nissan Kicks 1.6 CVT",
    detalhe: "Matéria de 2018; só velas e CVT, o resto é intervalo típico",
    // https://omecanico.com.br/ed-286-raio-x-qualidade-japonesa-com-cambio-cvt/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "cvt"},
    ajustes: [
      {"item": "Velas de ignição", "km": 100000, "meses": 0, "fonte": "revista", "nota": "Velas de irídio; prazo citado pelo mecânico da matéria."},
      {"item": "Fluido do CVT", "km": 100000, "meses": 0, "fonte": "revista", "nota": "Prazo da matéria para uso não severo. Inspecionar vazamentos a cada 20.000 km."}
    ]
  },

  {
    id: "renault-kwid-10",
    nome: "Renault Kwid 1.0 SCe manual",
    detalhe: "Matéria com o Intense 2023",
    // https://omecanico.com.br/raio-x-renault-kwid-2023/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "manual", "sincronismo": "corrente"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "sevKm": 5000, "sevMeses": 6, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Filtro de combustível", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 40000, "meses": 48, "fonte": "revista"},
      {"item": "Líquido de arrefecimento", "km": 80000, "meses": 48, "fonte": "revista"},
      {"item": "Fluido de freio", "km": 80000, "meses": 48, "fonte": "revista", "nota": "Prazo da Renault. Muita oficina troca a cada 2 anos."},
      {"item": "Correia de acessórios (poly-V)", "km": 60000, "meses": 48, "fonte": "revista"},
      {"item": "Corrente de comando", "fonte": "semtroca", "nota": "Este motor usa corrente de comando, sem troca programada. Ruído ou folga pede oficina."}
    ]
  },

  {
    id: "toyota-corolla-hibrido",
    nome: "Toyota Corolla híbrido 1.8",
    detalhe: "Matéria com o Altis Hybrid, geração lançada em 2019",
    // https://omecanico.com.br/toyota-corolla-altis-hybrid-e-sofisticado-sem-complicar-a-vida-do-mecanico/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "hibrido", "cambio": "cvt"},
    ajustes: [
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 40000, "fonte": "revista", "nota": "O prazo em meses não está na matéria: é o típico."},
      {"item": "Líquido de arrefecimento", "km": 160000, "fonte": "revista", "nota": "O prazo em meses não está na matéria: é o típico."},
      {"item": "Fluido de freio", "km": 40000, "fonte": "revista", "nota": "O prazo em meses não está na matéria: é o típico."}
    ]
  },

  {
    id: "vw-polo-170tsi",
    nome: "Volkswagen Polo 170 TSI manual",
    detalhe: "Matéria de 2023; correia dentada da matéria sobre os motores EA211",
    // https://omecanico.com.br/raio-x-volkswagen-polo-tsi/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "manual", "sincronismo": "correia"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Filtro de óleo", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Filtro de ar", "km": 30000, "meses": 24, "sevKm": 15000, "sevMeses": 12, "fonte": "revista"},
      {"item": "Filtro de combustível", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Velas de ignição", "km": 40000, "meses": 48, "fonte": "revista"},
      {"item": "Fluido de freio", "km": 0, "meses": 24, "fonte": "revista"},
      {"item": "Correia de acessórios (poly-V)", "km": 60000, "meses": 60, "fonte": "revista"},
      {"item": "Kit correia dentada + tensor", "km": 120000, "meses": 54, "sevKm": 60000, "sevMeses": 30, "fonte": "revista", "nota": "Motor EA211: 120.000 km ou 4 anos e meio; em uso severo, metade. Confira no manual do seu ano."}
    ]
  },

  {
    id: "vw-tcross-10tsi",
    nome: "Volkswagen T-Cross 1.0 TSI automático",
    detalhe: "Matéria com o modelo 2025",
    // https://omecanico.com.br/?p=119485
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "cambio": "automatico", "sincronismo": "correia"},
    ajustes: [
      {"item": "Óleo do motor", "km": 10000, "meses": 12, "fonte": "revista"},
      {"item": "Kit correia dentada + tensor", "km": 120000, "meses": 54, "sevKm": 60000, "sevMeses": 30, "fonte": "revista", "nota": "Motor EA211: 120.000 km ou 4 anos e meio; em uso severo, metade. Confira no manual do seu ano."}
    ]
  },

  {
    id: "vw-ea211",
    nome: "Volkswagen com motor EA211 1.0 ou 1.6",
    detalhe: "Só a correia dentada; confira no manual se o seu motor é EA211",
    // https://omecanico.com.br/correia-dentada-dos-motores-ea211-possui-vida-util-estendida/
    fonte: "revista O Mecânico",
    perfil: {"combustivel": "flex", "sincronismo": "correia"},
    ajustes: [
      {"item": "Kit correia dentada + tensor", "km": 120000, "meses": 54, "sevKm": 60000, "sevMeses": 30, "fonte": "revista", "nota": "Motor EA211: 120.000 km ou 4 anos e meio; em uso severo, metade. Confira no manual do seu ano."}
    ]
  }
];

var MODELOS_IDX = {};
MODELOS.forEach(function(m){ MODELOS_IDX[m.id] = m; });

export { MODELOS, MODELOS_IDX };
