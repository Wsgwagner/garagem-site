/* contas.js
   Contas puras: não conhecem tela, veículo ativo nem gravação. Têm testes. */

function n(x){ var v = parseFloat(x); return isFinite(v) ? v : 0; }

/* Soma meses a uma data AAAA-MM-DD. 31/01 + 1 mês é o último dia de fevereiro. */
function somaMeses(iso, meses){
  var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!p || !meses) return "";
  var total = Number(p[1]) * 12 + Number(p[2]) - 1 + meses;
  var ano = Math.floor(total / 12), mes = total % 12;
  var ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  function d(x){ return String(x).padStart(2, "0"); }
  return ano + "-" + d(mes + 1) + "-" + d(Math.min(Number(p[3]), ultimo));
}

/* km/l de um tanque cheio até o próximo. Os parciais do meio entram na soma de litros. */
function consumosDe(abast){
  var lista = (abast || []).slice().sort(function(a,b){
    var x = a.data || "", y = b.data || "";
    return n(a.km) - n(b.km) || (x < y ? -1 : x > y ? 1 : 0);
  });
  var out = [], cheio = null, litros = 0, falta = false, tipos = [];
  lista.forEach(function(a){
    if (n(a.litros) > 0) litros += n(a.litros); else falta = true;
    tipos.push(tipoComb(a.combustivel));
    if (!a.cheio) return;
    var rodados = cheio ? n(a.km) - n(cheio.km) : 0;
    if (rodados > 0 && !falta) out.push({ id:a.id, kmRodados:rodados, litros:litros, kmL:rodados / litros,
      tipo: tipos.every(function(t){ return t === tipos[0]; }) ? tipos[0] : "" });
    cheio = a; litros = 0; falta = false; tipos = [tipoComb(a.combustivel)];
  });
  return out;
}
function tipoComb(nome){
  return /^etanol/i.test(nome || "") ? "etanol" : /^gasolina/i.test(nome || "") ? "gasolina" : "";
}
/* Só trechos em que o tanque de antes, os parciais e o de depois são do mesmo combustível. */
function consumosPorCombustivel(abast){
  var cs = consumosDe(abast);
  function de(t){
    var l = cs.filter(function(c){ return c.tipo === t; });
    return l.length ? { kmL: mediaDe(l), trechos: l.length } : null;
  }
  return { etanol: de("etanol"), gasolina: de("gasolina") };
}
/* Preço por litro do abastecimento mais recente desse combustível. */
function ultimoPreco(abast, tipo){
  var u = null;
  (abast || []).forEach(function(a){
    if (tipoComb(a.combustivel) !== tipo || !(n(a.litros) > 0) || !(n(a.valor) > 0)) return;
    if (!u || (a.data || "") > (u.data || "") || ((a.data || "") === (u.data || "") && n(a.km) > n(u.km))) u = a;
  });
  return u ? n(u.valor) / n(u.litros) : null;
}
/* Sem medição dos dois, usa a regra geral: etanol até 70% do preço da gasolina. */
function compararFlex(c, precoE, precoG){
  var real = !!(c.etanol && c.gasolina), limite = real ? c.etanol.kmL / c.gasolina.kmL : 0.7;
  var r = { real:real, limite:limite, preco: precoE > 0 && precoG > 0, melhor:"", relacao:0, economia100:0 };
  if (!r.preco) return r;
  r.relacao = precoE / precoG;
  r.melhor = Math.abs(r.relacao / limite - 1) < 0.01 ? "igual" : r.relacao < limite ? "etanol" : "gasolina";
  if (real) r.economia100 = Math.abs(precoE / c.etanol.kmL - precoG / c.gasolina.kmL) * 100;
  return r;
}
/* Média de verdade: todos os km sobre todos os litros. */
function mediaDe(cs){
  var km = 0, l = 0;
  (cs || []).forEach(function(c){ km += c.kmRodados; l += c.litros; });
  return l ? km / l : null;
}

/* "Amortecedores" do plano já está coberto se os dianteiros e os traseiros têm registro
   com próxima troca: cada um vira o próprio alerta. reg é indexado pela chave do item. */
function cobertoPorEixo(k, reg){
  function um(eixo){ return reg[k + " " + eixo + "os"] || reg[k + " " + eixo + "as"] || null; }
  var d = um("dianteir"), t = um("traseir"), m = reg[k];
  if (!d || !t) return false;
  return [d, t].every(function(x){ return (x.proxKm || x.proxData) && (!m || n(x.km) >= n(m.km)); });
}

/* Item sem registro: próxima troca provável e se já devia ter havido uma. Nesse caso
   não dá para afirmar que está em dia: o dono precisa confirmar. */
function estimar(iv, km, ano, anoAtual){
  if (!iv.km || km <= 0) return { proxKm:null, confirmar:true };
  var a = parseInt(ano, 10);
  var velho = !!iv.meses && a > 1900 && (anoAtual - a) * 12 >= iv.meses;
  return { proxKm: Math.floor(km / iv.km) * iv.km + iv.km, confirmar: km >= iv.km || velho };
}

/* O registro que sobe o odômetro guarda o valor de antes (kmAntes), para poder
   desfazer se ele for corrigido ou excluído. */
function desfazerKm(v, antigo){
  if (!antigo || antigo.kmAntes == null || n(antigo.km) !== n(v.kmAtual)) return false;
  v.kmAtual = n(antigo.kmAntes);
  return true;
}
function aplicarKm(v, antigo, novo){
  var antes = n(v.kmAtual);
  if (antigo && n(antigo.km) === n(novo.km)){
    if (antigo.kmAntes != null) novo.kmAntes = antigo.kmAntes;
  } else desfazerKm(v, antigo);
  if (n(novo.km) > n(v.kmAtual)){ novo.kmAntes = n(v.kmAtual); v.kmAtual = n(novo.km); }
  return n(v.kmAtual) !== antes;
}
/* ---------- previsão ---------- */
var DIA = 86400000;
function diaNum(iso){
  var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return p ? Math.round(Date.UTC(Number(p[1]), Number(p[2]) - 1, Number(p[3])) / DIA) : null;
}
function isoDe(num){ return new Date(num * DIA).toISOString().slice(0, 10); }

/* Km por dia, pelos registros do último ano (ou de todo o histórico, se o ano for pouco).
   Pede 30 dias entre o primeiro e o último: menos que isso engana. */
function ritmo(registros, hoje){
  var h = diaNum(hoje), porDia = {};
  (registros || []).forEach(function(r){
    var d = diaNum(r.data);
    if (d === null || d > h || n(r.km) <= 0) return;
    porDia[d] = Math.max(porDia[d] || 0, n(r.km));
  });
  var pontos = Object.keys(porDia).map(function(d){ return { dia:Number(d), km:porDia[d] }; })
    .sort(function(a,b){ return a.dia - b.dia; });
  function calc(l){
    if (l.length < 2) return null;
    var a = l[0], b = l[l.length - 1], dias = b.dia - a.dia, km = b.km - a.km;
    return dias >= 30 && km > 0 ? { kmDia: km / dias, km: km, primeiro: isoDe(a.dia), ultimo: isoDe(b.dia) } : null;
  }
  return calc(pontos.filter(function(p){ return p.dia >= h - 365; })) || calc(pontos);
}
/* Data provável de rodar os km que faltam, contando do dia em que o odômetro foi lido. */
function preverData(faltaKm, kmDia, lidoEm){
  var d = diaNum(lidoEm);
  if (d === null || !(kmDia > 0) || !(faltaKm > 0)) return "";
  var dias = Math.round(faltaKm / kmDia);
  return dias > 365 * 10 ? "" : isoDe(d + dias);
}

/* ---------- documentos ---------- */
function nivelDoc(d, hoje){
  if (d.pago) return "pago";
  var v = diaNum(d.vencimento), h = diaNum(hoje);
  if (v === null) return "none";
  return v < h ? "crit" : v - h <= 30 ? "warn" : "ok";
}
/* Soma o que foi pago; com ano, só o daquele ano. */
function gastoDocs(docs, ano){
  return (docs || []).reduce(function(s, d){
    return s + (d.pago && (!ano || (d.pagoEm || "").slice(0, 4) === ano) ? n(d.valor) : 0);
  }, 0);
}
/* O próximo de um documento que repete. O valor fica em branco: muda a cada ano. */
function proximoDoc(d, id, existentes){
  var venc = d.repete ? somaMeses(d.vencimento, d.repete) : "";
  if (!venc) return null;
  var ja = (existentes || []).some(function(x){
    return x.id !== d.id && x.tipo === d.tipo && (x.descricao || "") === (d.descricao || "") && x.vencimento === venc;
  });
  return ja ? null : { id:id, tipo:d.tipo, descricao:d.descricao || "", vencimento:venc, valor:0,
    repete:d.repete, pago:false, pagoEm:"", obs:"" };
}

/* ---------- custo total ---------- */
/* Tudo o que o carro gastou nos 12 meses que terminam no mês de hoje. */
function custos(v, hoje){
  var meses = [], idx = {}, cats = {}, lanc = [], semValor = 0;
  for (var i = 11; i >= 0; i--){
    var mes = somaMeses(hoje.slice(0, 8) + "01", -i) || hoje.slice(0, 8) + "01";
    idx[mes.slice(0, 7)] = meses.length;
    meses.push({ mes: mes.slice(0, 7), manut:0, comb:0, docs:0, total:0 });
  }
  function por(tipo, cat, data, valor){
    data = data || "";
    var m = meses[idx[data.slice(0, 7)]];
    if (!m || data > hoje) return false;
    if (valor > 0){
      lanc.push({ data:data, valor:valor });
      m[tipo] += valor; m.total += valor;
      if (!cats[cat]) cats[cat] = { nome:cat, tipo:tipo, valor:0 };
      cats[cat].valor += valor;
    }
    return true;
  }
  (v.manut || []).forEach(function(m){
    var valor = n(m.custoPecas) + n(m.custoMaoObra);
    if (por("manut", m.categoria || "Outro", m.data, valor) && !valor) semValor++;
  });
  (v.abast || []).forEach(function(a){ por("comb", "Combustível", a.data, n(a.valor)); });
  (v.docs || []).forEach(function(d){ if (d.pago) por("docs", d.tipo === "Outro" ? "Outras despesas" : d.tipo, d.pagoEm, n(d.valor)); });

  var r = ritmo((v.manut || []).concat(v.abast || []).filter(function(x){
    return (x.data || "") >= meses[0].mes;
  }), hoje), porKm = null;
  // Só entra o que foi gasto enquanto esses km eram rodados.
  if (r){
    var g = lanc.reduce(function(s, l){ return s + (l.data > r.primeiro && l.data <= r.ultimo ? l.valor : 0); }, 0);
    porKm = g ? g / r.km : null;
  }
  return {
    meses: meses, semValor: semValor, porKm: porKm, km: r ? r.km : 0,
    total: meses.reduce(function(s, m){ return s + m.total; }, 0),
    categorias: Object.keys(cats).map(function(c){ return cats[c]; })
      .sort(function(a, b){ return b.valor - a.valor; })
  };
}

/* ---------- lançamento repetido ---------- */
/* Registro da mesma peça feito cedo demais para ser outra troca: menos da metade do
   intervalo. Peça sem intervalo: até 1.000 km e 30 dias. mesmos = registros da peça. */
function repetido(mesmos, novo, iv){
  iv = iv || {};
  var semPrazo = !iv.km && !iv.meses, limKm = iv.km ? iv.km / 2 : 1000;
  var limDias = iv.meses ? iv.meses * 365 / 24 : 30, achou = null, menor = Infinity;
  (mesmos || []).forEach(function(m){
    var dk = Math.abs(n(m.km) - n(novo.km)), a = diaNum(m.data), b = diaNum(novo.data);
    var dd = a === null || b === null ? 0 : Math.abs(a - b);
    if (iv.km || semPrazo){ if (dk >= limKm) return; }
    if (iv.meses || semPrazo){ if (dd >= limDias) return; }
    if (dk + dd < menor){ menor = dk + dd; achou = m; }
  });
  return achou;
}
/* Completa o que já existe com o que veio no novo; nada que já estava é trocado. */
function juntarServico(m, novo){
  var fotos = (m.fotos || []).concat((novo.fotos || []).filter(function(f){ return (m.fotos || []).indexOf(f) < 0; }));
  var r = Object.assign({}, m, {
    oficina: m.oficina || novo.oficina || "",
    garantia: m.garantia || novo.garantia || "",
    custoPecas: n(m.custoPecas) || n(novo.custoPecas),
    custoMaoObra: n(m.custoMaoObra) || n(novo.custoMaoObra),
    obs: !novo.obs || novo.obs === m.obs ? m.obs || "" : m.obs ? m.obs + " · " + novo.obs : novo.obs
  });
  if (fotos.length) r.fotos = fotos;
  return r;
}

/* ---------- histórico da peça ---------- */
/* Da troca mais recente para a mais antiga, na mesma regra dos alertas. */
function ordenarTrocas(lista){
  return (lista || []).slice().sort(function(a, b){
    return n(b.km) - n(a.km) || ((a.data || "") < (b.data || "") ? 1 : (a.data || "") > (b.data || "") ? -1 : 0);
  });
}
/* Quanto a peça anterior durou até a nova. null se os dados não permitem dizer. */
function duracao(antiga, nova){
  var a = diaNum(antiga.data), b = diaNum(nova.data), km = n(nova.km) - n(antiga.km);
  if (a === null || b === null || b < a || km < 0 || !n(antiga.km) || !n(nova.km) || (b === a && !km)) return null;
  return { km: km, dias: b - a };
}
/* Durou menos de 70% do previsto, em km e em tempo (o que vencer primeiro já vale como normal). */
function durouPouco(d, iv){
  if (!d || !iv || (!iv.km && !iv.meses)) return 0;
  var partes = [];
  if (iv.km) partes.push(d.km / iv.km);
  if (iv.meses) partes.push(d.dias / (iv.meses * 365 / 12));
  var p = Math.max.apply(null, partes);
  return p < 0.7 ? Math.max(1, Math.round(p * 100)) : 0;
}
/* A peça ainda está na garantia nessa data? Data anterior ao serviço não conta. */
function naGarantia(m, data){
  return !!(m && m.garantia && data && data <= m.garantia && data >= (m.data || ""));
}

/* Divide um valor em n partes iguais em centavos; a sobra vai para as primeiras. */
function ratear(valor, partes){
  var cent = Math.round(n(valor) * 100), base = Math.floor(cent / partes), sobra = cent - base * partes, out = [];
  for (var i = 0; i < partes; i++) out.push((base + (i < sobra ? 1 : 0)) / 100);
  return out;
}
/* Salto grande demais costuma ser um dígito a mais. */
function saltoSuspeito(atual, novo){ return atual > 0 && novo - atual > 20000; }

export { somaMeses, consumosDe, consumosPorCombustivel, ultimoPreco, compararFlex, mediaDe, estimar, desfazerKm, aplicarKm, ratear, ordenarTrocas, duracao, durouPouco, naGarantia, repetido, juntarServico, cobertoPorEixo, custos, nivelDoc, gastoDocs, proximoDoc, ritmo, preverData, saltoSuspeito };
