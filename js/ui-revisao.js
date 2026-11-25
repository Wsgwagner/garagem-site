/* ui-revisao.js
   Revisão completa: data, km e oficina uma vez só, vários serviços de uma vez.
   Cada serviço vira um registro normal do histórico. */

import { veiculo, gravarVarios } from './dados.js';
import { intervalo, kmAtual } from './calculos.js';
import { aplicarKm, ratear } from './contas.js';
import { itemDoPlano, kmConfirmado, jaLancado } from './ui-formularios.js';
import { esc, num, chave, hoje, fmtBRL, fmtData, fmtKm, somaMeses, toast, uid } from './util.js';

/* Serviços comuns que não têm prazo e por isso não estão no plano. */
var COMUNS = [
  ["Automático do motor de arranque (troca)", "Elétrica"],
  ["Motor de arranque (limpeza e revisão)", "Elétrica"],
  ["Ar-condicionado (manutenção)", "Ar-condicionado"],
  ["Gás do ar-condicionado", "Ar-condicionado"],
  ["Portas com barulho (reparo)", "Carroceria e interior"],
  ["Portas (lubrificação e regulagem)", "Carroceria e interior"]
];

var dlg = document.getElementById("dlg-revisao");
var form = document.getElementById("form-revisao");
var lista = document.getElementById("r-lista");
var itens = []; // { nome, cat } na ordem da tela

function el(id){ return document.getElementById(id); }

function linha(nome, marcado){
  var i = itens.length;
  var p = itemDoPlano(nome);
  var cat = p ? p.cat : (COMUNS.filter(function(c){ return c[0] === nome; })[0] || ["", "Outro"])[1];
  itens.push({ nome: nome, cat: cat });
  return '<div class="rev-item">'+
    '<div class="check"><input type="checkbox" id="r-c'+i+'" data-i="'+i+'"'+(marcado ? ' checked' : '')+'><label for="r-c'+i+'">'+esc(nome)+'</label></div>'+
    '<input type="number" id="r-v'+i+'" min="0" step="0.01" inputmode="decimal" placeholder="Peças R$" aria-label="Custo das peças: '+esc(nome)+'"'+(marcado ? '' : ' hidden')+'>'+
  '</div>';
}

function abrirRevisao(){
  var v = veiculo(); if (!v) return;
  itens = [];
  form.reset();
  el("r-data").value = hoje();
  el("r-km").value = kmAtual() || "";
  var plano = (v.plano || []).filter(function(p){ return p.ativo !== false && p.fonte !== "semtroca"; });
  lista.innerHTML = '<div class="sec-title">Itens do plano</div>' +
    plano.map(function(p){ return linha(p.item); }).join("") +
    '<div class="sec-title">Outros serviços</div>' +
    COMUNS.map(function(c){ return linha(c[0]); }).join("");
  somar();
  dlg.showModal();
  el("r-km").focus();
}

function marcados(){
  return itens.map(function(it, i){
    return el("r-c" + i).checked ? { nome: it.nome, cat: it.cat, pecas: num(el("r-v" + i).value) } : null;
  }).filter(Boolean);
}
function somar(){
  var m = marcados();
  var total = m.reduce(function(s, x){ return s + x.pecas; }, num(el("r-mo").value));
  el("r-total").textContent = m.length
    ? m.length + (m.length === 1 ? " serviço" : " serviços") + " · total " + fmtBRL(total)
    : "Marque o que foi feito";
}

lista.addEventListener("change", function(e){
  var i = e.target.dataset.i;
  if (i != null) el("r-v" + i).hidden = !e.target.checked;
  somar();
});
form.addEventListener("input", somar);

function adicionar(){
  var campo = el("r-novo"), nome = campo.value.trim();
  if (!nome) return;
  var ja = -1;
  itens.forEach(function(it, i){ if (chave(it.nome) === chave(nome)) ja = i; });
  if (ja >= 0){
    el("r-c" + ja).checked = true;
    el("r-v" + ja).hidden = false;
  } else lista.insertAdjacentHTML("beforeend", linha(nome, true));
  campo.value = "";
  campo.focus();
  somar();
}
el("r-add").addEventListener("click", adicionar);
el("r-novo").addEventListener("keydown", function(e){
  if (e.key === "Enter"){ e.preventDefault(); adicionar(); }
});

form.addEventListener("submit", function(e){
  e.preventDefault();
  adicionar(); // texto digitado e não adicionado não se perde
  var v = veiculo(), escolhidos = marcados();
  if (!v) return;
  if (!escolhidos.length){ toast("Marque ao menos um serviço"); return; }
  var data = el("r-data").value || hoje(), km = Math.round(num(el("r-km").value));
  if (!kmConfirmado({ data: data, km: km })) return;
  var repetidos = escolhidos.map(function(x){ return jaLancado({ id:"", item:x.nome, data:data, km:km }); }).filter(Boolean);
  if (repetidos.length && !confirm("Parece que já está lançado:\n\n" +
      repetidos.map(function(m){ return m.item + " — " + fmtData(m.data) + ", " + fmtKm(m.km) + " km"; }).join("\n") +
      "\n\nOK: foi outra troca, gravar mesmo assim.\nCancelar: voltar e desmarcar.")) return;

  var partes = ratear(num(el("r-mo").value), escolhidos.length);
  var registros = escolhidos.map(function(x, i){
    var p = itemDoPlano(x.nome), iv = p && p.fonte !== "semtroca" ? intervalo(p) : { km:0, meses:0 };
    var obj = {
      id: uid(), data: data, km: km, item: x.nome, categoria: x.cat,
      oficina: el("r-oficina").value.trim(),
      custoPecas: x.pecas, custoMaoObra: partes[i],
      obs: el("r-obs").value.trim(),
      proxKm: iv.km && km ? km + iv.km : 0,
      proxData: iv.meses ? somaMeses(data, iv.meses) : ""
    };
    if (aplicarKm(v, null, obj)) v.atualizadoEm = hoje();
    return obj;
  });
  var ok = gravarVarios("manutencoes", registros);
  dlg.close();
  if (!ok){
    alert("ATENÇÃO: este navegador não conseguiu salvar. Use “Salvar backup” antes de fechar o app.");
    return;
  }
  toast(registros.length === 1 ? "Serviço registrado" : registros.length + " serviços registrados");
});
el("r-cancel").addEventListener("click", function(){ dlg.close(); });
el("add-revisao").addEventListener("click", abrirRevisao);

export { abrirRevisao };
