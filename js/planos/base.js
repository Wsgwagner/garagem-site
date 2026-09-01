/* planos/base.js
   Itens genéricos de manutenção preventiva, com os intervalos típicos dos manuais
   brasileiros. É daqui que sai o plano de um veículo que não está na biblioteca
   de modelos — e é a base sobre a qual os modelos conhecidos aplicam correções.

   Cada item pode ter:
     item     nome que aparece na tela (e que casa com o registro de troca)
     cat      categoria, usada no formulário
     km       intervalo em quilômetros (0 = não vale por km, só por tempo)
     meses    intervalo em meses (0 = não vale por tempo, só por km)
     sevKm    intervalo em km quando o veículo é de uso severo
     sevMeses idem, em meses
     fonte    perfil   = intervalo típico, não é regra de um manual específico
              inspecao = o manual manda medir, não trocar
              oficina  = item de desgaste, sem prazo de fábrica
              semtroca = existe no carro mas não tem troca programada
     nota     explicação honesta do que aquele número significa
     so       condições do perfil do veículo para o item existir
*/

var ITENS_BASE = [
  /* ---------- motor e fluidos ---------- */
  { item:"Óleo do motor", cat:"Filtros e fluidos", km:10000, meses:12, sevKm:5000, sevMeses:6, fonte:"perfil",
    nota:"Intervalo típico de óleo sintético. Motores turbo e uso severo pedem antes." },

  { item:"Filtro de óleo", cat:"Filtros e fluidos", km:10000, meses:12, sevKm:5000, sevMeses:6, fonte:"perfil",
    nota:"Trocado junto com o óleo, sempre." },

  { item:"Filtro de ar", cat:"Filtros e fluidos", km:20000, meses:24, sevKm:10000, sevMeses:12, fonte:"perfil",
    so:{ combustivel:["flex","gasolina","hibrido"] } },

  { item:"Filtro de ar", cat:"Filtros e fluidos", km:15000, meses:12, sevKm:10000, sevMeses:12, fonte:"perfil",
    nota:"Motor diesel puxa mais ar e suja o filtro mais rápido.", so:{ combustivel:["diesel"] } },

  { item:"Filtro de combustível", cat:"Filtros e fluidos", km:20000, meses:24, fonte:"perfil",
    nota:"Em muitos carros novos o filtro fica dentro do tanque e é vitalício — confira no seu manual antes de programar a troca.",
    so:{ combustivel:["flex","gasolina","hibrido"] } },

  { item:"Filtro de combustível", cat:"Filtros e fluidos", km:10000, meses:12, fonte:"perfil",
    nota:"No diesel o filtro é crítico: entope antes e protege a bomba, que é cara.",
    so:{ combustivel:["diesel"] } },

  { item:"Drenar o separador de água", cat:"Filtros e fluidos", km:5000, meses:6, fonte:"perfil",
    nota:"Água no diesel destrói bico e bomba. É dreno, não troca.",
    so:{ combustivel:["diesel"] } },

  { item:"Filtro do ar-condicionado (cabine)", cat:"Ar-condicionado", km:15000, meses:12, fonte:"perfil",
    nota:"Mais por tempo do que por km: ele satura de poeira e umidade mesmo com o carro parado." },

  { item:"Velas de ignição", cat:"Motor", km:40000, meses:0, fonte:"perfil",
    nota:"Vale para velas comuns, de níquel. As de platina ou irídio, que vêm de fábrica em muitos carros, chegam a 100.000 km.",
    so:{ combustivel:["flex","gasolina","hibrido"] } },

  { item:"Líquido de arrefecimento", cat:"Arrefecimento", km:60000, meses:48, fonte:"perfil",
    nota:"Fluido de longa duração. Nunca complete com água pura — o aditivo é o que protege contra corrosão." },

  { item:"Correia de acessórios (poly-V)", cat:"Motor", km:60000, meses:48, fonte:"perfil",
    nota:"É a correia externa, do alternador e do ar. Se arrebentar, o carro para, mas não quebra o motor." },

  /* ---------- sincronismo ---------- */
  { item:"Kit correia dentada + tensor", cat:"Motor", km:60000, meses:48, fonte:"perfil",
    nota:"O intervalo varia MUITO conforme o motor: tem de 40.000 a 100.000 km. Confirme no manual do seu carro e corrija aqui. Se ela arrebentar, o motor quebra por dentro — este é o item mais caro de esquecer.",
    so:{ sincronismo:["correia","naosei"] } },

  { item:"Bomba d'água", cat:"Arrefecimento", km:60000, meses:48, fonte:"oficina",
    nota:"Não é obrigatória, mas troque junto com a correia dentada: a mão de obra é a mesma e evita abrir o motor duas vezes.",
    so:{ sincronismo:["correia"] } },

  { item:"Corrente de comando", cat:"Motor", km:0, meses:0, fonte:"semtroca",
    nota:"Motor com corrente de comando não tem troca programada. Só se mexe nela se aparecer ruído de corrente ou folga.",
    so:{ sincronismo:["corrente"] } },

  /* ---------- transmissão ---------- */
  { item:"Óleo do câmbio", cat:"Câmbio e embreagem", km:60000, meses:48, fonte:"perfil",
    nota:"Muitos manuais só mandam verificar o nível. Trocar entre 60.000 e 80.000 km é prática de oficina e não faz mal.",
    so:{ cambio:["manual"] } },

  { item:"Fluido do câmbio automático", cat:"Câmbio e embreagem", km:60000, meses:48, fonte:"perfil",
    nota:"Aqui as marcas divergem muito: algumas dizem que o fluido é vitalício, outras pedem 40.000 a 80.000 km. Em trânsito parado, troque antes — calor é o que mata câmbio automático.",
    so:{ cambio:["automatico"] } },

  { item:"Fluido do CVT", cat:"Câmbio e embreagem", km:40000, meses:24, fonte:"perfil",
    nota:"CVT é mais sensível que o automático comum, e o fluido é específico. Não aceite fluido genérico.",
    so:{ cambio:["cvt"] } },

  { item:"Óleo do câmbio automatizado", cat:"Câmbio e embreagem", km:60000, meses:48, fonte:"perfil",
    so:{ cambio:["automatizado"] } },

  /* ---------- freios, suspensão, rodas ---------- */
  { item:"Fluido de freio", cat:"Freios", km:40000, meses:24, fonte:"perfil",
    nota:"Vale mais o prazo que a quilometragem: o fluido absorve umidade do ar mesmo com o carro parado, e aí o freio falha no calor." },

  { item:"Inspeção dos freios (pastilhas, discos e lonas)", cat:"Freios", km:10000, meses:12, sevKm:5000, sevMeses:6, fonte:"inspecao",
    nota:"A troca da pastilha é pela espessura, não pelo prazo: abaixo de 3 mm de material, troca." },

  { item:"Pastilhas de freio dianteiras", cat:"Freios", km:40000, meses:0, fonte:"oficina",
    nota:"Item de desgaste, sem prazo de fábrica. Entre 30.000 e 50.000 km é o normal; em trânsito parado, bem menos." },

  { item:"Freios traseiros (pastilhas ou lonas)", cat:"Freios", km:80000, meses:0, fonte:"oficina",
    nota:"A traseira trabalha menos que a dianteira e costuma durar o dobro." },

  { item:"Alinhamento e balanceamento", cat:"Pneus e rodas", km:10000, meses:12, fonte:"perfil",
    nota:"Junto com o rodízio dos pneus. Buraco forte ou volante puxando pede antes do prazo." },

  { item:"Pneus", cat:"Pneus e rodas", km:40000, meses:60, fonte:"oficina",
    nota:"Depende do desgaste, mas a borracha envelhece em torno de 5 anos mesmo sobrando desenho." },

  { item:"Amortecedores", cat:"Suspensão e direção", km:60000, meses:0, fonte:"oficina",
    nota:"Não têm prazo de troca: vão embora aos poucos. Se o carro flutua, quica depois do buraco ou 'nada' na freada, é hora." },

  /* ---------- elétrica e cabine ---------- */
  { item:"Bateria", cat:"Elétrica", km:0, meses:36, fonte:"oficina",
    nota:"Costuma durar de 3 a 4 anos. Calor e carro parado por muitos dias encurtam." },

  { item:"Palhetas do limpador", cat:"Carroceria e interior", km:0, meses:12, fonte:"oficina",
    nota:"Trocar antes do período de chuva vale mais que esperar riscar o vidro." }
];

/* As perguntas do cadastro de veículo. A ordem aqui é a ordem que aparece na tela. */
var PERGUNTAS_PERFIL = [
  { campo:"combustivel", rotulo:"Combustível", padrao:"flex", opcoes:[
      { valor:"flex", texto:"Flex (álcool e gasolina)" },
      { valor:"gasolina", texto:"Só gasolina" },
      { valor:"diesel", texto:"Diesel" },
      { valor:"hibrido", texto:"Híbrido" }
  ]},
  { campo:"cambio", rotulo:"Câmbio", padrao:"manual", opcoes:[
      { valor:"manual", texto:"Manual" },
      { valor:"automatico", texto:"Automático" },
      { valor:"cvt", texto:"CVT" },
      { valor:"automatizado", texto:"Automatizado / dupla embreagem" }
  ]},
  { campo:"sincronismo", rotulo:"Sincronismo do motor", padrao:"naosei", opcoes:[
      { valor:"corrente", texto:"Corrente de comando" },
      { valor:"correia", texto:"Correia dentada" },
      { valor:"naosei", texto:"Não sei" }
  ], ajuda:"Se não souber, deixe em “não sei”: o app inclui a correia dentada no plano por segurança, porque esquecer dela quebra o motor." }
];

export { ITENS_BASE, PERGUNTAS_PERFIL };
