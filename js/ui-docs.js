/* ui-docs.js
   Documentos e despesas do carro: IPVA, seguro, licenciamento, multa, CNH.
   Guarda só tipo, vencimento, valor e observação; nenhum número de documento. */

import { veiculo, gravarVarios, apagar } from './dados.js';
import { nivelDoc, gastoDocs, proximoDoc } from './contas.js';
import { esc, num, hoje, diasAte, fmtData, fmtBRL, toast, uid } from './util.js';

/* tipo → de quantos em quantos meses costuma repetir */
var TIPOS = { "IPVA":12, "Licenciamento":12, "Seguro":12, "CNH":0, "Multa":0, "Financiamento":1, "Outro":0 };

var dlg = document.getElementById("dlg-doc"), form = document.getElementById("form-doc"), editando = null;
function el(id){ return document.getElementById(id); }
function docs(){ return (veiculo() || {}).docs || []; }
function nome(d){ return d.tipo + (d.descricao ? " · " + d.descricao : ""); }

/* Contas em aberto vencidas ou a 30 dias do vencimento. */
function docsAlerta(){
  return docs().map(function(d){ return { d:d, nivel: nivelDoc(d, hoje()) }; })
    .filter(function(x){ return x.nivel === "crit" || x.nivel === "warn"; });
}
function gastoDocsDoAno(ano){ return gastoDocs(docs(), ano); }

function prazo(d){
  var n = diasAte(d.vencimento);
  if (n === null) return "sem vencimento";
  return n < 0 ? "venceu há " + (-n) + " dia" + (n === -1 ? "" : "s")
       : n === 0 ? "vence hoje" : "faltam " + n + " dia" + (n === 1 ? "" : "s");
}
function cartao(d){
  var nivel = nivelDoc(d, hoje());
  var rot = { pago:"Resolvido", crit:"Vencido", warn:"Vence em breve", ok:"Em dia", none:"Sem vencimento" }[nivel];
  var cls = nivel === "crit" || nivel === "warn" || nivel === "ok" ? nivel : "";
  return '<article class="card"><span class="stripe '+cls+'"></span><div class="grow">'+
      '<div class="title-row"><h3>'+esc(nome(d))+'</h3><span class="pill '+cls+'">'+rot+'</span></div>'+
      '<div class="meta">'+(d.vencimento ? '<span>Vencimento: '+fmtData(d.vencimento)+'</span>' : '')+
        '<span>'+(d.pago ? 'resolvido em '+fmtData(d.pagoEm) : prazo(d))+'</span></div>'+
      (d.obs ? '<div class="obs">'+esc(d.obs)+'</div>' : '')+
    '</div><div class="right-col"><span class="money">'+(num(d.valor) ? fmtBRL(d.valor) : "—")+'</span><div class="actions">'+
      (d.pago ? '' : '<button class="btn btn-sm" data-doc-ok="'+esc(d.id)+'">Pago / resolvido</button> ')+
      '<button class="btn btn-sm" data-doc="'+esc(d.id)+'">Editar</button></div></div></article>';
}

function renderDocs(){
  var lista = docs(), avisos = docsAlerta();
  el("c-docs").textContent = avisos.length || "";
  function ordem(a, b){ return (a.vencimento || "9") < (b.vencimento || "9") ? -1 : 1; }
  el("docs-alertas").innerHTML = avisos.length
    ? '<div class="group-head"><span>Documentos e despesas</span><span>'+avisos.length+'</span></div>'+
      avisos.map(function(x){ return x.d; }).sort(ordem).map(cartao).join("")
    : "";
  if (!lista.length){
    el("docs-list").innerHTML = '<div class="empty"><h3>Nenhum documento cadastrado</h3>'+
      '<p>Cadastre IPVA, licenciamento, seguro, multas e CNH. O app avisa 30 dias antes de vencer.</p></div>';
    return;
  }
  var abertos = lista.filter(function(d){ return !d.pago; }).sort(ordem);
  var pagos = lista.filter(function(d){ return d.pago; })
    .sort(function(a, b){ return (a.pagoEm || "") < (b.pagoEm || "") ? 1 : -1; });
  el("docs-list").innerHTML =
    (abertos.length ? '<div class="group-head"><span>Em aberto</span><span>'+abertos.length+'</span></div>' + abertos.map(cartao).join("") : "")+
    (pagos.length ? '<details class="grupo"'+(abertos.length ? '' : ' open')+'><summary><span class="lbl">Resolvidos</span><span>'+pagos.length+
      '</span></summary><div class="stack">'+pagos.map(cartao).join("")+'</div></details>' : "");
}

function achar(id){ return docs().filter(function(d){ return d.id === id; })[0] || null; }
function mostrarPago(){ el("d-campo-pago").hidden = !el("d-pago").checked; }
function abrirDoc(id){
  if (!veiculo()) return;
  editando = id ? achar(id) : null;
  var d = editando || { tipo:"IPVA", repete:TIPOS.IPVA };
  el("dlg-doc-title").textContent = editando ? "Editar documento ou despesa" : "Novo documento ou despesa";
  el("d-excluir").hidden = !editando;
  el("d-tipo").value = d.tipo;
  el("d-desc").value = d.descricao || "";
  el("d-venc").value = d.vencimento || "";
  el("d-valor").value = num(d.valor) ? d.valor : "";
  el("d-repete").value = String(d.repete || 0);
  el("d-pago").checked = !!d.pago;
  el("d-pagoem").value = d.pagoEm || hoje();
  el("d-obs").value = d.obs || "";
  mostrarPago();
  dlg.showModal();
  el("d-tipo").focus();
}
el("d-tipo").addEventListener("change", function(){ if (!editando) el("d-repete").value = String(TIPOS[el("d-tipo").value] || 0); });
el("d-pago").addEventListener("change", mostrarPago);

/* Grava o documento; se acabou de ser resolvido e repete, cria o próximo já com a data. */
function salvar(d, antes){
  var regs = [d], prox = d.pago && !(antes && antes.pago) ? proximoDoc(d, uid(), docs()) : null;
  if (prox) regs.push(prox);
  if (!gravarVarios("documentos", regs)){
    alert("ATENÇÃO: este navegador não conseguiu salvar. Use “Salvar backup” antes de fechar o app.");
    return;
  }
  toast(prox ? "Resolvido. Próximo vencimento: " + fmtData(prox.vencimento) : d.pago ? "Marcado como resolvido" : "Documento salvo");
}
form.addEventListener("submit", function(e){
  e.preventDefault();
  var pago = el("d-pago").checked;
  var d = {
    id: editando ? editando.id : uid(),
    tipo: el("d-tipo").value, descricao: el("d-desc").value.trim(),
    vencimento: el("d-venc").value || "", valor: num(el("d-valor").value),
    repete: parseInt(el("d-repete").value, 10) || 0,
    pago: pago, pagoEm: pago ? el("d-pagoem").value || hoje() : "",
    obs: el("d-obs").value.trim()
  };
  var antes = editando;
  dlg.close();
  salvar(d, antes);
});
el("d-cancelar").addEventListener("click", function(){ dlg.close(); });
el("d-excluir").addEventListener("click", function(){
  if (!editando || !confirm("Excluir “" + nome(editando) + "”?")) return;
  apagar("documentos", editando.id); dlg.close(); toast("Documento excluído");
});
el("add-doc").addEventListener("click", function(){ abrirDoc(null); });
document.addEventListener("click", function(e){
  var t = e.target.closest("[data-doc],[data-doc-ok]");
  if (!t) return;
  if (t.dataset.doc){ abrirDoc(t.dataset.doc); return; }
  var d = achar(t.dataset.docOk);
  if (d && !d.pago) salvar(Object.assign({}, d, { pago:true, pagoEm:hoje() }), d);
});

export { renderDocs, docsAlerta, gastoDocsDoAno };
