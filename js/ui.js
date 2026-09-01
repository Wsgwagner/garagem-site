/* ui.js
   Desenho da tela principal: cartões de alerta, histórico, abastecimentos,
   abas e odômetro. Chama os outros módulos de tela para as partes deles. */

import { state, veiculo, salvarPerfil, cacheLocal } from './dados.js';
import { alertas, consumos, kmAtual, custoPorKm, textoIntervalo } from './calculos.js';
import { renderVeiculo, abrirVeiculo } from './ui-veiculos.js';
import { renderPlano } from './ui-plano.js';
import { abrirManut, abrirAbast } from './ui-formularios.js';
import { marcaArmazenamento } from './ui-dados.js';
import { esc, num, fmtData, fmtKm, fmtBRL, fmtDec, totalManut, chave, toast } from './util.js';

var tab = "alertas", manutView = "hist";

/* Atalho: o veículo ativo, ou um vazio enquanto não há nenhum cadastrado. */
function vAtivo(){ return veiculo() || { manut:[], abast:[], plano:[], perfil:{} }; }

function render(){
  var temVeiculo = !!veiculo();
  document.getElementById("boas-vindas").hidden = temVeiculo;
  document.getElementById("app").hidden = !temVeiculo;
  if (!temVeiculo) return;

  renderVeiculo();

  var km = kmAtual();
  var inp = document.getElementById("km-atual");
  if (document.activeElement !== inp) inp.value = km ? String(Math.round(km)) : "";
  document.getElementById("km-note").textContent =
    vAtivo().atualizadoEm ? "atualizado em " + fmtData(vAtivo().atualizadoEm) : "toque para atualizar";

  document.getElementById("c-manut").textContent = vAtivo().manut.length || "";
  document.getElementById("c-abast").textContent = vAtivo().abast.length || "";
  var al = alertas(), pend = al.filter(function(a){ return a.nivel === "crit" || a.nivel === "warn"; }).length;
  document.getElementById("c-alertas").textContent = pend || "";

  renderTiles(al, km);
  renderAlertas(al);
  renderManut();
  renderAbast();
  renderPlano();
  renderDatalists();
  marcaArmazenamento();
}

function renderTiles(al, km){
  var anoAtual = String(new Date().getFullYear());
  var gastoAno = vAtivo().manut.reduce(function(s,m){ return s + ((m.data||"").slice(0,4) === anoAtual ? totalManut(m) : 0); }, 0);
  var gastoTotal = vAtivo().manut.reduce(function(s,m){ return s + totalManut(m); }, 0);
  var cs = consumos();
  var media = cs.length ? cs.reduce(function(s,c){ return s + c.kmL; },0) / cs.length : null;
  var ultimo = cs.length ? cs[cs.length-1].kmL : null;
  var vencidos = al.filter(function(a){ return a.nivel === "crit"; }).length;
  var perto = al.filter(function(a){ return a.nivel === "warn"; }).length;

  var cls = vencidos ? "tile alert-crit" : (perto ? "tile alert-warn" : "tile");
  var acompanhados = al.filter(function(a){ return a.nivel !== "none"; }).length;
  var alertaValor = km ? (vencidos ? vencidos : (perto ? perto : 0)) : "—";
  var alertaNota = !km ? "informe o odômetro para calcular"
                 : vencidos ? (vencidos === 1 ? "item passou do ponto" : "itens passaram do ponto")
                 : perto ? (perto === 1 ? "item chegando na hora" : "itens chegando na hora")
                 : acompanhados + " itens acompanhados, tudo em dia";

  var html = "";
  html += '<div class="'+cls+'"><span class="label">Alertas</span><span class="value">'+alertaValor+'</span><span class="note">'+alertaNota+'</span></div>';
  html += '<div class="tile"><span class="label">Gasto em '+anoAtual+'</span><span class="value">'+fmtBRL(gastoAno)+'</span><span class="note">'+fmtBRL(gastoTotal)+' no total registrado</span></div>';
  html += '<div class="tile"><span class="label">Consumo médio</span><span class="value">'+(media ? fmtDec(media,1)+" km/l" : "—")+'</span><span class="note">'+(ultimo ? "último tanque: "+fmtDec(ultimo,1)+" km/l" : "precisa de 2 tanques cheios")+'</span></div>';
  html += '<div class="tile"><span class="label">Registros</span><span class="value">'+(vAtivo().manut.length + vAtivo().abast.length)+'</span><span class="note">'+vAtivo().manut.length+' serviços · '+vAtivo().abast.length+' abastecimentos</span></div>';
  document.getElementById("tiles").innerHTML = html;
}

function cardAlerta(a){
  var partes = [];
  if (a.faltaKm !== null) partes.push(a.faltaKm > 0 ? "faltam " + fmtKm(a.faltaKm) + " km" : "passou " + fmtKm(-a.faltaKm) + " km");
  if (a.faltaDias !== null) partes.push(a.faltaDias > 0 ? "faltam " + a.faltaDias + " dia" + (a.faltaDias===1?"":"s") : "venceu há " + (-a.faltaDias) + " dia" + (a.faltaDias===-1?"":"s"));
  var alvo = [];
  if (a.proxKm) alvo.push(fmtKm(a.proxKm) + " km");
  if (a.proxData) alvo.push(fmtData(a.proxData));
  var rot = a.nivel === "crit" ? "Passou do ponto" : a.nivel === "warn" ? "Chegando na hora" : a.nivel === "ok" ? "Em dia" : "Sem registro";
  var linha2 = a.m
    ? "Última troca: " + fmtData(a.m.data) + " aos " + fmtKm(a.m.km) + " km" + (a.m.oficina ? " · " + esc(a.m.oficina) : "")
    : (a.origem === "estimado"
        ? "Sem registro seu — estimativa pelo intervalo do plano a partir do odômetro"
        : "Sem registro seu — registre a última troca para o app calcular a próxima");
  return '<article class="card">'+
    '<span class="stripe '+(a.nivel === "none" ? "" : a.nivel)+'"></span>'+
    '<div class="grow">'+
      '<div class="title-row"><h3>'+esc(a.nome)+'</h3>'+
        '<span class="pill '+(a.nivel === "none" ? "" : a.nivel)+'">'+rot+'</span>'+
        (a.p ? '<span class="pill">a cada '+esc(textoIntervalo(a.p))+'</span>' : '')+
      '</div>'+
      (alvo.length ? '<div class="meta"><span>Alvo: '+esc(alvo.join(" ou "))+'</span><span>'+esc(partes.join(" · "))+'</span></div>' : '')+
      '<div class="meta"><span>'+linha2+'</span></div>'+
      (a.p && a.p.nota ? '<div class="obs">'+esc(a.p.nota)+'</div>' : '')+
    '</div>'+
    '<div class="right-col">'+
      (a.m ? '<button class="btn btn-sm" data-edit-m="'+esc(a.m.id)+'">Ver registro</button>'
           : '<button class="btn btn-sm" data-novo="'+esc(a.nome)+'">Registrar troca</button>')+
    '</div>'+
  '</article>';
}

function renderAlertas(al){
  var box = document.getElementById("alertas-list");
  document.getElementById("uso-severo").checked = !!vAtivo().perfil.usoSevero;
  if (!kmAtual()){
    box.innerHTML = '<div class="empty"><h3>Comece pelo odômetro</h3>'+
      '<p>Coloque a quilometragem que está no painel, ali em cima. Com ela o app já calcula, pelo plano do veículo, o que está próximo de vencer — mesmo antes de você registrar qualquer coisa.</p></div>';
    return;
  }
  var atencao = al.filter(function(a){ return a.nivel === "crit" || a.nivel === "warn"; });
  var emDia   = al.filter(function(a){ return a.nivel === "ok"; });
  var sem     = al.filter(function(a){ return a.nivel === "none"; });
  var html = "";
  if (atencao.length){
    html += '<div class="group-head"><span>Precisa de atenção</span><span>'+atencao.length+'</span></div>' + atencao.map(cardAlerta).join("");
  } else {
    html += '<div class="empty"><h3>Nada vencido por enquanto</h3><p>Nenhum item do plano passou do ponto com o odômetro em '+fmtKm(kmAtual())+' km.</p></div>';
  }
  if (emDia.length) html += '<details class="grupo"'+(atencao.length ? '' : ' open')+'><summary><span class="lbl">Em dia</span><span>'+emDia.length+'</span></summary><div class="stack">'+emDia.map(cardAlerta).join("")+'</div></details>';
  if (sem.length)   html += '<details class="grupo"><summary><span class="lbl">Sem data prevista</span><span>'+sem.length+'</span></summary><div class="stack">'+sem.map(cardAlerta).join("")+'</div></details>';
  box.innerHTML = html;
}

function renderManut(){
  var box = document.getElementById("manut-list");
  if (!vAtivo().manut.length){
    box.innerHTML = '<div class="empty"><h3>Seu histórico começa aqui</h3>'+
      '<p>Registre cada peça trocada e cada serviço feito: data, km, custo, oficina e quando deve trocar de novo.</p>'+
      '<button class="btn btn-primary" data-add="manut">+ Registrar troca ou serviço</button></div>';
    return;
  }
  if (manutView === "hist"){
    var lista = vAtivo().manut.slice().sort(function(a,b){
      if ((b.data||"") !== (a.data||"")) return (b.data||"") < (a.data||"") ? -1 : 1;
      return num(b.km) - num(a.km);
    });
    var html = "", anoAtual = null;
    lista.forEach(function(m){
      var ano = (m.data||"----").slice(0,4);
      if (ano !== anoAtual){
        anoAtual = ano;
        var doAno = lista.filter(function(x){ return (x.data||"").slice(0,4) === ano; });
        var soma = doAno.reduce(function(s,x){ return s + totalManut(x); }, 0);
        html += '<div class="group-head"><span>'+esc(ano)+'</span><span class="mono">'+fmtBRL(soma)+'</span></div>';
      }
      html += cardManut(m);
    });
    box.innerHTML = html;
  } else {
    var grupos = {};
    vAtivo().manut.forEach(function(m){
      var k = chave(m.item);
      (grupos[k] = grupos[k] || {nome:m.item, itens:[]}).itens.push(m);
    });
    var chaves = Object.keys(grupos).sort(function(x,y){
      var ux = ultimoKm(grupos[x].itens), uy = ultimoKm(grupos[y].itens);
      return uy - ux;
    });
    box.innerHTML = chaves.map(function(k){
      var g = grupos[k];
      var itens = g.itens.slice().sort(function(a,b){ return num(b.km) - num(a.km); });
      var soma = itens.reduce(function(s,x){ return s + totalManut(x); }, 0);
      return '<div class="group-head"><span>'+esc(g.nome)+' · '+itens.length+'×</span><span class="mono">'+fmtBRL(soma)+'</span></div>' +
             itens.map(cardManut).join("");
    }).join("");
  }
}
function ultimoKm(itens){ return itens.reduce(function(k,m){ return Math.max(k, num(m.km)); }, 0); }

function cardManut(m){
  var custo = totalManut(m);
  var prox = [];
  if (m.proxKm) prox.push("próxima: " + fmtKm(m.proxKm) + " km");
  if (m.proxData) prox.push((m.proxKm ? "ou " : "próxima: ") + fmtData(m.proxData));
  return '<article class="card">'+
    '<div class="grow">'+
      '<div class="title-row"><h3>'+esc(m.item)+'</h3>'+(m.categoria ? '<span class="pill cat">'+esc(m.categoria)+'</span>' : "")+'</div>'+
      '<div class="meta"><span class="mono">'+fmtData(m.data)+'</span><span class="mono">'+fmtKm(m.km)+' km</span>'+
        (m.oficina ? '<span>'+esc(m.oficina)+'</span>' : "")+
        (prox.length ? '<span>'+esc(prox.join(" "))+'</span>' : "")+'</div>'+
      (m.obs ? '<div class="obs">'+esc(m.obs)+'</div>' : "")+
    '</div>'+
    '<div class="right-col">'+
      '<span class="money">'+(custo ? fmtBRL(custo) : "—")+'</span>'+
      '<div class="actions"><button class="btn btn-sm" data-edit-m="'+esc(m.id)+'">Editar</button></div>'+
    '</div>'+
  '</article>';
}

function renderAbast(){
  var box = document.getElementById("abast-list");
  if (!vAtivo().abast.length){
    box.innerHTML = '<div class="empty"><h3>Nenhum abastecimento registrado</h3>'+
      '<p>Anote km, litros e valor a cada tanque cheio. Com dois registros o app já mostra o km/l e o custo por quilômetro.</p>'+
      '<button class="btn btn-primary" data-add="abast">+ Registrar abastecimento</button></div>';
    return;
  }
  var cons = {}; consumos().forEach(function(c){ cons[c.id] = c; });
  var lista = vAtivo().abast.slice().sort(function(a,b){ return num(b.km) - num(a.km); });
  var totalL = 0, totalR = 0;
  vAtivo().abast.forEach(function(a){ totalL += num(a.litros); totalR += num(a.valor); });

  var linhas = lista.map(function(a){
    var c = cons[a.id];
    var precoL = num(a.litros) > 0 && num(a.valor) > 0 ? num(a.valor)/num(a.litros) : null;
    return '<tr>'+
      '<td class="num">'+fmtData(a.data)+'</td>'+
      '<td class="num">'+fmtKm(a.km)+'</td>'+
      '<td class="num">'+fmtDec(a.litros,2)+'</td>'+
      '<td class="num">'+(num(a.valor) ? fmtBRL(a.valor) : "—")+'</td>'+
      '<td class="num">'+(precoL ? fmtBRL(precoL) : "—")+'</td>'+
      '<td class="num">'+(c ? '<strong>'+fmtDec(c.kmL,1)+'</strong>' : (a.cheio ? "—" : "parcial"))+'</td>'+
      '<td>'+esc(a.combustivel||"")+(a.posto ? " · " + esc(a.posto) : "")+'</td>'+
      '<td><button class="btn btn-sm" data-edit-a="'+esc(a.id)+'">Editar</button></td>'+
    '</tr>';
  }).join("");

  box.innerHTML =
    '<div class="table-wrap"><table><thead><tr>'+
      '<th>Data</th><th>Km</th><th>Litros</th><th>Valor</th><th>R$/l</th><th>km/l</th><th>Combustível</th><th></th>'+
    '</tr></thead><tbody>'+linhas+'</tbody></table></div>'+
    '<div class="foot" style="margin-top:12px;border-top:0;padding-top:0">'+
      '<span>'+fmtDec(totalL,1)+' litros · '+fmtBRL(totalR)+' em combustível'+
      (custoPorKm() ? ' · custo por km: ' + fmtBRL(custoPorKm()) : '')+'</span></div>';
}
function renderDatalists(){
  function preencher(el, valores){
    var uniq = [];
    valores.forEach(function(v){ v = (v||"").trim(); if (v && uniq.indexOf(v) < 0) uniq.push(v); });
    el.innerHTML = uniq.map(function(v){ return '<option value="'+esc(v)+'"></option>'; }).join("");
  }
  var v = vAtivo();
  preencher(document.getElementById("pecas-comuns"),
    (v.plano || []).map(function(p){ return p.item; }).concat(v.manut.map(function(m){ return m.item; })));
  preencher(document.getElementById("oficinas"), v.manut.map(function(m){ return m.oficina; }));
  preencher(document.getElementById("postos"), v.abast.map(function(a){ return a.posto; }));
}

/* ---------- abas ---------- */
function irPara(t){
  tab = t;
  ["alertas","manut","abast","plano"].forEach(function(k){
    document.getElementById("tab-"+k).setAttribute("aria-selected", String(k === t));
    document.getElementById("panel-"+k).hidden = (k !== t);
  });
}
Array.prototype.forEach.call(document.querySelectorAll(".tab"), function(b){
  b.addEventListener("click", function(){ irPara(b.dataset.tab); });
});
document.getElementById("view-hist").addEventListener("click", function(){ setView("hist"); });
document.getElementById("view-peca").addEventListener("click", function(){ setView("peca"); });
function setView(v){
  manutView = v;
  document.getElementById("view-hist").setAttribute("aria-pressed", String(v === "hist"));
  document.getElementById("view-peca").setAttribute("aria-pressed", String(v === "peca"));
  renderManut();
}

/* ---------- odômetro e uso severo ---------- */
var kmInput = document.getElementById("km-atual");
function commitKm(){
  var v = veiculo(); if (!v) return;
  var novo = Math.max(0, Math.round(num(kmInput.value)));
  if (novo !== num(v.kmAtual)){ v.kmAtual = novo; cacheLocal(); salvarPerfil(); }
}
kmInput.addEventListener("change", commitKm);
kmInput.addEventListener("blur", commitKm);
kmInput.addEventListener("keydown", function(e){ if (e.key === "Enter") kmInput.blur(); });

document.getElementById("uso-severo").addEventListener("change", function(e){
  var v = veiculo(); if (!v) return;
  v.perfil.usoSevero = e.target.checked;
  cacheLocal(); salvarPerfil();
  toast(e.target.checked ? "Intervalos encurtados para uso severo" : "Intervalos de uso normal");
});

/* ---------- cliques que valem em qualquer lugar ---------- */
document.getElementById("add-manut").addEventListener("click", function(){ abrirManut(null); });
document.getElementById("add-abast").addEventListener("click", function(){ abrirAbast(null); });
document.addEventListener("click", function(e){
  var t = e.target.closest("[data-edit-m],[data-edit-a],[data-add],[data-go],[data-novo]");
  if (!t) return;
  if (t.dataset.novo) abrirManut(null, t.dataset.novo);
  else if (t.dataset.editM) { irPara("manut"); abrirManut(t.dataset.editM); }
  else if (t.dataset.editA) abrirAbast(t.dataset.editA);
  else if (t.dataset.add === "manut") abrirManut(null);
  else if (t.dataset.add === "abast") abrirAbast(null);
  else if (t.dataset.go) irPara(t.dataset.go);
});

export { render, irPara };
