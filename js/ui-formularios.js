/* ui-formularios.js
   As duas janelas de registro: troca/serviço e abastecimento.
   A próxima troca é sugerida pelo plano do veículo ativo. */

import { veiculo, gravar, apagar } from './dados.js';
import { intervalo, textoIntervalo, kmAtual } from './calculos.js';
import { abrirFotos, valorFotos, fotosOcupadas, confirmarFotos, apagarFotos, verFotoDe } from './fotos.js';
import { aplicarKm, desfazerKm, saltoSuspeito, repetido, juntarServico, ordenarTrocas, duracao, durouPouco, naGarantia } from './contas.js';
import { chave, num, hoje, fmtData, fmtKm, somaMeses, dateVal, toast, uid } from './util.js';

/* Acha no plano do veículo o item com esse nome. */
function itemDoPlano(nome){
  var v = veiculo();
  if (!v || !Array.isArray(v.plano)) return null;
  var achou = null;
  v.plano.forEach(function(p){ if (chave(p.item) === chave(nome)) achou = p; });
  return achou;
}

/* Dígito a mais é o erro mais comum: pergunta antes de aceitar um salto grande. */
function kmConfirmado(km){
  var atual = kmAtual();
  return !saltoSuspeito(atual, km) ||
    confirm("O odômetro vai de " + fmtKm(atual) + " para " + fmtKm(km) + " km. Está certo?");
}
/* Registro já existente que parece ser esta mesma troca. */
function jaLancado(obj){
  var p = itemDoPlano(obj.item);
  return repetido(veiculo().manut.filter(function(m){ return chave(m.item) === chave(obj.item) && m.id !== obj.id; }),
    obj, p && p.fonte !== "semtroca" ? intervalo(p) : null);
}
function acertarKm(antigo, obj){
  if (aplicarKm(veiculo(), antigo, obj)) veiculo().atualizadoEm = hoje();
}

var outraTroca = false, dupNovo = null, dupExiste = null;
var dlgM = document.getElementById("dlg-manut"), formM = document.getElementById("form-manut"), editM = null, proxTocado = false;

/* Trocas da mesma peça, fora a que está sendo editada. */
function outrasTrocas(nome, id){
  return ordenarTrocas(veiculo().manut.filter(function(m){ return chave(m.item) === chave(nome) && m.id !== id; }));
}
function textoDuracao(d){
  var anos = Math.floor(d.dias / 365), meses = Math.floor((d.dias % 365) / 30.4), t = [];
  if (anos) t.push(anos + (anos === 1 ? " ano" : " anos"));
  if (meses) t.push(meses + (meses === 1 ? " mês" : " meses"));
  if (!t.length) t.push(d.dias + (d.dias === 1 ? " dia" : " dias"));
  return fmtKm(d.km) + " km e " + t.join(" e ");
}
/* O prazo que você marcou naquele registro vale mais que o do plano. */
function previsto(m, iv){
  var km = num(m.proxKm) - num(m.km);
  return { km: num(m.proxKm) && km > 0 ? km : iv.km, meses: iv.meses };
}
/* Duração da troca anterior à m, com o aviso de desgaste quando durou pouco. */
function anteriorDurou(m){
  var v = veiculo(); if (!v) return null;
  var l = ordenarTrocas(v.manut.filter(function(x){ return chave(x.item) === chave(m.item); })), i = -1;
  l.forEach(function(x, k){ if (x.id === m.id) i = k; });
  var ant = i >= 0 ? l[i + 1] : null, d = ant && duracao(ant, m);
  if (!d) return null;
  var p = itemDoPlano(m.item);
  return { antes: ant, texto: textoDuracao(d), garantia: naGarantia(ant, m.data),
    pouco: p && p.fonte !== "semtroca" && p.fonte !== "inspecao" ? durouPouco(d, previsto(ant, intervalo(p))) : 0 };
}
/* Lançando outra vez uma peça que ainda está na garantia. */
var naGar = null;
function avisoGarantia(){
  var box = document.getElementById("m-garantia-aviso");
  if (!box || !veiculo()) return;
  var data = document.getElementById("m-data").value || hoje();
  naGar = editM ? null : outrasTrocas(document.getElementById("m-item").value, "").filter(function(m){ return naGarantia(m, data); })[0] || null;
  box.hidden = !naGar;
  if (!naGar) return;
  document.getElementById("m-garantia-texto").textContent = "A troca de " + fmtData(naGar.data) +
    (naGar.oficina ? " em " + naGar.oficina : "") + " está na garantia até " + fmtData(naGar.garantia) + ". Vale reclamar antes de pagar outra.";
  document.getElementById("m-garantia-nota").hidden = !(naGar.fotos && naGar.fotos.length);
}

function autoProxima(){
  avisoGarantia();
  var p = itemDoPlano(document.getElementById("m-item").value);
  var nota = document.getElementById("m-plano-nota");
  if (!p || p.fonte === "semtroca"){
    nota.textContent = p && p.fonte === "semtroca"
      ? p.nota
      : "Peça fora do plano do manual: se quiser alerta, defina você mesmo o km ou a data da próxima troca.";
    return;
  }
  var iv = intervalo(p);
  var prefixo = p.fonte === "manual" ? "Manual do fabricante: a cada "
              : p.fonte === "voce" ? "Intervalo definido por você: a cada "
              : p.fonte === "inspecao" ? "Inspeção prevista no manual: a cada "
              : "Sem prazo de fábrica — lembrete sugerido: a cada ";
  nota.textContent = prefixo + textoIntervalo(p) +
    (p.nota ? " — " + p.nota : "") + ((veiculo()||{perfil:{}}).perfil.usoSevero && p.sevKm ? " (intervalo de uso severo)" : "");
  if (proxTocado) return;
  var kmServico = num(document.getElementById("m-km").value);
  document.getElementById("m-proxkm").value = iv.km && kmServico ? Math.round(kmServico + iv.km) : "";
  document.getElementById("m-proxdata").value = iv.meses ? somaMeses(document.getElementById("m-data").value || hoje(), iv.meses) : "";
  document.getElementById("m-cat").value = p.cat;
}

function abrirManut(id, itemSugerido){
  editM = null;
  proxTocado = false;
  var lista = (veiculo()||{manut:[]}).manut;
  if (id) for (var i=0;i<lista.length;i++) if (lista[i].id === id) editM = lista[i];
  document.getElementById("dlg-manut-title").textContent = editM ? "Editar registro" : "Registrar troca ou serviço";
  document.getElementById("m-delete").hidden = !editM;
  var m = editM || {};
  document.getElementById("m-data").value = m.data || hoje();
  document.getElementById("m-km").value = m.km != null ? m.km : (kmAtual() || "");
  document.getElementById("m-item").value = m.item || itemSugerido || "";
  document.getElementById("m-cat").value = m.categoria || "Filtros e fluidos";
  document.getElementById("m-oficina").value = m.oficina || "";
  document.getElementById("m-pecas").value = m.custoPecas != null ? m.custoPecas : "";
  document.getElementById("m-mo").value = m.custoMaoObra != null ? m.custoMaoObra : "";
  document.getElementById("m-obs").value = m.obs || "";
  document.getElementById("m-proxkm").value = m.proxKm ? m.proxKm : "";
  document.getElementById("m-proxdata").value = m.proxData || "";
  if (editM) proxTocado = true;
  if (document.getElementById("m-garantia")) document.getElementById("m-garantia").value = m.garantia || "";
  abrirFotos(m.fotos);
  autoProxima();
  dlgM.showModal();
  document.getElementById(itemSugerido || editM ? "m-km" : "m-item").focus();
}
["m-item","m-km","m-data"].forEach(function(id){
  var el = document.getElementById(id);
  el.addEventListener("change", autoProxima);
  if (id === "m-item") el.addEventListener("input", autoProxima);
});
["m-proxkm","m-proxdata"].forEach(function(id){
  document.getElementById(id).addEventListener("input", function(){ proxTocado = true; });
});
formM.addEventListener("submit", function(e){
  e.preventDefault();
  var item = document.getElementById("m-item").value.trim();
  if (!item) return;
  if (fotosOcupadas()){ toast("Espere a foto terminar de carregar"); return; }
  var obj = {
    id: editM ? editM.id : uid(),
    data: document.getElementById("m-data").value || hoje(),
    km: Math.round(num(document.getElementById("m-km").value)),
    item: item,
    categoria: document.getElementById("m-cat").value,
    oficina: document.getElementById("m-oficina").value.trim(),
    custoPecas: num(document.getElementById("m-pecas").value),
    custoMaoObra: num(document.getElementById("m-mo").value),
    obs: document.getElementById("m-obs").value.trim(),
    proxKm: document.getElementById("m-proxkm").value ? Math.round(num(document.getElementById("m-proxkm").value)) : 0,
    proxData: document.getElementById("m-proxdata").value || ""
  };
  var campoGar = document.getElementById("m-garantia"); // página antiga em cache não tem o campo
  var gar = campoGar ? campoGar.value : editM ? editM.garantia : "";
  if (gar) obj.garantia = gar;
  if (valorFotos().length) obj.fotos = valorFotos();
  if (!editM && !outraTroca){
    var igual = jaLancado(obj), aviso = document.getElementById("dlg-dup");
    if (igual && !aviso){
      if (!confirm("“" + igual.item + "” já está lançado em " + fmtData(igual.data) + ", aos " + fmtKm(igual.km) + " km. Gravar outro?")) return;
    } else if (igual){
      dupNovo = obj; dupExiste = igual;
      document.getElementById("dup-texto").textContent = "“" + igual.item + "” já está lançado em " + fmtData(igual.data) +
        ", aos " + fmtKm(igual.km) + " km" + (igual.oficina ? ", em " + igual.oficina : "") + ". É a mesma troca?";
      aviso.showModal();
      return;
    }
  }
  if (!kmConfirmado(obj.km)) return;
  acertarKm(editM, obj);
  var ok = gravar("manutencoes", obj);
  dlgM.close();
  if (!ok) {
    alert("ATENÇÃO: este navegador não conseguiu salvar. Use “Salvar backup” antes de fechar o app.");
    return;
  }
  confirmarFotos();
  var dur = editM ? null : anteriorDurou(obj);
  toast(editM ? "Registro atualizado" : dur ? "Registrado. A anterior durou " + dur.texto : "Serviço registrado");
});
/* ---------- aviso de lançamento repetido ---------- */
if (document.getElementById("dlg-dup")){
  var dlgDup = document.getElementById("dlg-dup");
  document.getElementById("dup-voltar").addEventListener("click", function(){ dlgDup.close(); });
  document.getElementById("dup-outra").addEventListener("click", function(){
    dlgDup.close();
    outraTroca = true;
    formM.requestSubmit();
    outraTroca = false;
  });
  document.getElementById("dup-juntar").addEventListener("click", function(){
    dlgDup.close();
    var atual = veiculo().manut.filter(function(m){ return m.id === dupExiste.id; })[0];
    if (!atual){ toast("O registro anterior não existe mais"); return; }
    var junto = juntarServico(atual, dupNovo);
    if ((junto.fotos || []).length > 3){ toast("Cada serviço aceita até 3 fotos. Remova alguma."); return; }
    var ok = gravar("manutencoes", junto);
    dlgM.close();
    if (!ok){ alert("ATENÇÃO: este navegador não conseguiu salvar. Use “Salvar backup” antes de fechar o app."); return; }
    confirmarFotos();
    toast("Juntado ao registro de " + fmtData(atual.data));
  });
}
document.getElementById("m-cancel").addEventListener("click", function(){ dlgM.close(); });
document.getElementById("m-delete").addEventListener("click", function(){
  if (!editM) return;
  if (confirm("Excluir “" + editM.item + "” de " + fmtData(editM.data) + "?")){
    desfazerKm(veiculo(), editM); apagar("manutencoes", editM.id); apagarFotos(editM.fotos); dlgM.close(); toast("Registro excluído");
  }
});
if (document.getElementById("m-garantia-aviso")){
  document.getElementById("m-garantia-nota").addEventListener("click", function(){ if (naGar) verFotoDe(naGar); });
  document.getElementById("quick-garantia").addEventListener("click", function(e){
    var b = e.target.closest("button[data-months]"); if (!b) return;
    document.getElementById("m-garantia").value = somaMeses(document.getElementById("m-data").value || hoje(), parseInt(b.dataset.months, 10));
  });
}
document.getElementById("quick-km").addEventListener("click", function(e){
  var b = e.target.closest("button[data-add]"); if (!b) return;
  proxTocado = true;
  var base = num(document.getElementById("m-km").value) || kmAtual();
  document.getElementById("m-proxkm").value = Math.round(base + num(b.dataset.add));
});
document.getElementById("quick-data").addEventListener("click", function(e){
  var b = e.target.closest("button[data-months]"); if (!b) return;
  proxTocado = true;
  var base = document.getElementById("m-data").value || hoje();
  document.getElementById("m-proxdata").value = somaMeses(base, parseInt(b.dataset.months,10));
});

var dlgA = document.getElementById("dlg-abast"), formA = document.getElementById("form-abast"), editA = null;
function abrirAbast(id){
  editA = null;
  var lista = (veiculo()||{abast:[]}).abast;
  if (id) for (var i=0;i<lista.length;i++) if (lista[i].id === id) editA = lista[i];
  document.getElementById("dlg-abast-title").textContent = editA ? "Editar abastecimento" : "Registrar abastecimento";
  document.getElementById("a-delete").hidden = !editA;
  var a = editA || {};
  document.getElementById("a-data").value = a.data || hoje();
  document.getElementById("a-km").value = a.km != null ? a.km : (kmAtual() || "");
  document.getElementById("a-litros").value = a.litros != null ? a.litros : "";
  document.getElementById("a-valor").value = a.valor != null ? a.valor : "";
  document.getElementById("a-comb").value = a.combustivel || "Gasolina";
  document.getElementById("a-posto").value = a.posto || "";
  document.getElementById("a-cheio").checked = a.cheio !== false;
  dlgA.showModal();
  document.getElementById("a-litros").focus();
}
formA.addEventListener("submit", function(e){
  e.preventDefault();
  var obj = {
    id: editA ? editA.id : uid(),
    data: document.getElementById("a-data").value || hoje(),
    km: Math.round(num(document.getElementById("a-km").value)),
    litros: num(document.getElementById("a-litros").value),
    valor: num(document.getElementById("a-valor").value),
    combustivel: document.getElementById("a-comb").value,
    posto: document.getElementById("a-posto").value.trim(),
    cheio: document.getElementById("a-cheio").checked
  };
  if (!kmConfirmado(obj.km)) return;
  acertarKm(editA, obj);
  var ok = gravar("abastecimentos", obj);
  dlgA.close();
  if (!ok) {
    alert("ATENÇÃO: este navegador não conseguiu salvar. Use “Salvar backup” antes de fechar o app.");
    return;
  }
  toast(editA ? "Abastecimento atualizado" : "Abastecimento registrado");
});
document.getElementById("a-cancel").addEventListener("click", function(){ dlgA.close(); });
document.getElementById("a-delete").addEventListener("click", function(){
  if (!editA) return;
  if (confirm("Excluir o abastecimento de " + fmtData(editA.data) + "?")){
    desfazerKm(veiculo(), editA); apagar("abastecimentos", editA.id); dlgA.close(); toast("Abastecimento excluído");
  }
});

export { abrirManut, abrirAbast, itemDoPlano, kmConfirmado, jaLancado, anteriorDurou };
