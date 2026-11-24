/* ui-verif.js
   "Verificado": você conferiu a peça, mas não trocou. Fica no item do plano,
   não entra no histórico de trocas nem nos gastos. */

import { veiculo, cacheLocal, notificar } from './dados.js';
import { kmAtual } from './calculos.js';
import { num, hoje, somaMeses, fmtKm, toast } from './util.js';

var dlg = document.getElementById("dlg-verif"), editando = null;
function el(id){ return document.getElementById(id); }
function achar(id){ return ((veiculo() || {}).plano || []).filter(function(p){ return p.id === id; })[0] || null; }

function abrirVerif(id){
  var p = achar(id); if (!p || !dlg) return;
  editando = id;
  var v = p.verif || {};
  el("vf-nome").textContent = p.item;
  el("vf-data").value = hoje();
  el("vf-km").value = kmAtual() || "";
  el("vf-estado").value = v.estado || "boa";
  el("vf-vida").value = v.vida || "";
  el("vf-obs").value = v.obs || "";
  el("vf-excluir").hidden = !p.verif;
  sugerir();
  dlg.showModal();
  el("vf-estado").focus();
}
/* Volta a pedir em 6 meses ou 5.000 km, o que vier antes. */
function sugerir(){
  var p = achar(editando), km = num(el("vf-km").value);
  el("vf-proxdata").value = somaMeses(el("vf-data").value || hoje(), 6);
  el("vf-proxkm").value = p && p.km && km ? km + Math.min(5000, p.km) : "";
  el("vf-prox").hidden = el("vf-estado").value === "trocar";
}

if (dlg){
  el("vf-estado").addEventListener("change", function(){ el("vf-prox").hidden = el("vf-estado").value === "trocar"; });
  ["vf-data","vf-km"].forEach(function(id){ el(id).addEventListener("change", sugerir); });
  el("form-verif").addEventListener("submit", function(e){
    e.preventDefault();
    var p = achar(editando); if (!p) return;
    var km = Math.round(num(el("vf-km").value)), data = el("vf-data").value || hoje(), atual = kmAtual();
    if (km > atual){
      toast("O odômetro está em " + fmtKm(atual) + " km. Atualize-o antes.");
      return;
    }
    var trocar = el("vf-estado").value === "trocar";
    p.verif = {
      data: data, km: km, estado: el("vf-estado").value,
      vida: Math.min(100, Math.max(0, Math.round(num(el("vf-vida").value)))),
      obs: el("vf-obs").value.trim(),
      proxKm: trocar ? 0 : Math.round(num(el("vf-proxkm").value)),
      proxData: trocar ? "" : el("vf-proxdata").value || "",
      em: new Date().toISOString()
    };
    p.mod = p.verif.em;
    var ok = cacheLocal(); notificar();
    dlg.close();
    toast(!ok ? "Este navegador não conseguiu salvar" : "Verificação anotada");
  });
  el("vf-excluir").addEventListener("click", function(){
    var p = achar(editando);
    if (!p || !confirm("Excluir a verificação de “" + p.item + "”?")) return;
    delete p.verif;
    p.mod = new Date().toISOString();
    cacheLocal(); notificar();
    dlg.close();
    toast("Verificação excluída");
  });
  el("vf-cancelar").addEventListener("click", function(){ dlg.close(); });
  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-verif]");
    if (b) abrirVerif(b.dataset.verif);
  });
}

export { abrirVerif };
