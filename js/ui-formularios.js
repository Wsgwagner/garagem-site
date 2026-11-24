/* ui-formularios.js
   As duas janelas de registro: troca/serviço e abastecimento.
   A próxima troca é sugerida pelo plano do veículo ativo. */

import { veiculo, gravar, apagar } from './dados.js';
import { intervalo, textoIntervalo, kmAtual } from './calculos.js';
import { abrirFotos, valorFotos, fotosOcupadas, confirmarFotos, apagarFotos } from './fotos.js';
import { aplicarKm, desfazerKm, saltoSuspeito } from './contas.js';
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
function acertarKm(antigo, obj){
  if (aplicarKm(veiculo(), antigo, obj)) veiculo().atualizadoEm = hoje();
}

var dlgM = document.getElementById("dlg-manut"), formM = document.getElementById("form-manut"), editM = null, proxTocado = false;

function autoProxima(){
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
  if (valorFotos().length) obj.fotos = valorFotos();
  if (!kmConfirmado(obj.km)) return;
  acertarKm(editM, obj);
  var ok = gravar("manutencoes", obj);
  dlgM.close();
  if (!ok) {
    alert("ATENÇÃO: este navegador não conseguiu salvar. Use “Salvar backup” antes de fechar o app.");
    return;
  }
  confirmarFotos();
  toast(editM ? "Registro atualizado" : "Serviço registrado");
});
document.getElementById("m-cancel").addEventListener("click", function(){ dlgM.close(); });
document.getElementById("m-delete").addEventListener("click", function(){
  if (!editM) return;
  if (confirm("Excluir “" + editM.item + "” de " + fmtData(editM.data) + "?")){
    desfazerKm(veiculo(), editM); apagar("manutencoes", editM.id); apagarFotos(editM.fotos); dlgM.close(); toast("Registro excluído");
  }
});
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

export { abrirManut, abrirAbast, itemDoPlano, kmConfirmado };
