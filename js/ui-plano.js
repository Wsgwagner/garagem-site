/* ui-plano.js
   A aba do plano de manutenção: a tabela do que o veículo pede, de onde veio
   cada intervalo, e a janela para ajustar item a item. */

import { veiculo, cacheLocal, notificar } from './dados.js';
import { textoIntervalo, ultimoRegistro } from './calculos.js';
import { reconstruirPlano, fonteModelo, ROTULO_FONTE } from './planos/montar.js';
import { esc, num, chave, fmtData, fmtKm, toast, uid } from './util.js';

var dlg = document.getElementById("dlg-item");
var form = document.getElementById("form-item");
var editando = null;

function renderPlano(){
  var v = veiculo(); if (!v) return;
  var reg = ultimoRegistro();

  var origem = fonteModelo(v.modeloId);
  document.getElementById("plano-origem").textContent = origem
    ? "Intervalos conferidos em: " + origem + ". O que você ajustar fica marcado como seu."
    : "Plano montado pelo perfil do veículo, com os intervalos típicos dos manuais. Confira no manual do seu carro e ajuste o que estiver diferente — o app guarda a sua versão.";

  var linhas = v.plano.map(function(p){
    var m = reg[chave(p.item)];
    var inativo = p.ativo === false;
    return '<tr'+(inativo ? ' style="opacity:.5"' : '')+'>'+
      '<td>'+esc(p.item)+(inativo ? ' <span class="pill">fora do plano</span>' : '')+'</td>'+
      '<td class="num">'+esc(textoIntervalo(p))+'</td>'+
      '<td>'+esc(ROTULO_FONTE[p.fonte] || p.fonte)+'</td>'+
      '<td class="num">'+(m ? fmtData(m.data)+' · '+fmtKm(m.km)+' km' : '—')+'</td>'+
      '<td style="white-space:nowrap">'+
        '<button class="btn btn-sm" data-item-plano="'+esc(p.id)+'">Ajustar</button> '+
        (p.fonte === "semtroca" ? '' : '<button class="btn btn-sm" data-novo="'+esc(p.item)+'">Registrar</button>')+
      '</td>'+
    '</tr>' +
    (p.nota ? '<tr><td colspan="5" style="text-align:left;color:var(--muted);font-size:13px;padding-top:0;white-space:normal">'+esc(p.nota)+'</td></tr>' : '');
  }).join("");

  document.getElementById("plano-list").innerHTML =
    '<div class="table-wrap"><table><thead><tr>'+
      '<th>Item</th><th>Intervalo</th><th>Origem</th><th>Sua última troca</th><th></th>'+
    '</tr></thead><tbody>'+linhas+'</tbody></table></div>'+
    '<p class="hint" style="margin-top:12px">Marcar <strong>uso severo</strong> na aba de próximas trocas encurta os intervalos dos itens que preveem isso — óleo, filtros e inspeção de freio.</p>';
}

/* ---------- janela do item ---------- */
function abrirItem(id){
  var v = veiculo(); if (!v) return;
  editando = null;
  v.plano.forEach(function(p){ if (p.id === id) editando = p; });
  var p = editando || {};
  document.getElementById("dlg-item-title").textContent = editando ? "Ajustar item do plano" : "Novo item no plano";
  document.getElementById("i-excluir").hidden = !editando;
  document.getElementById("i-nome").value = p.item || "";
  document.getElementById("i-cat").value = p.cat || "Filtros e fluidos";
  document.getElementById("i-km").value = p.km || "";
  document.getElementById("i-meses").value = p.meses || "";
  document.getElementById("i-sevkm").value = p.sevKm || "";
  document.getElementById("i-sevmeses").value = p.sevMeses || "";
  document.getElementById("i-nota").value = p.nota || "";
  document.getElementById("i-ativo").checked = p.ativo !== false;
  dlg.showModal();
  document.getElementById("i-km").focus();
}

form.addEventListener("submit", function(e){
  e.preventDefault();
  var v = veiculo(); if (!v) return;
  var nome = document.getElementById("i-nome").value.trim();
  if (!nome) return;
  var campos = {
    item: nome,
    cat: document.getElementById("i-cat").value,
    km: Math.round(num(document.getElementById("i-km").value)),
    meses: Math.round(num(document.getElementById("i-meses").value)),
    sevKm: Math.round(num(document.getElementById("i-sevkm").value)),
    sevMeses: Math.round(num(document.getElementById("i-sevmeses").value)),
    nota: document.getElementById("i-nota").value.trim(),
    ativo: document.getElementById("i-ativo").checked,
    fonte: "voce"
  };
  if (editando) Object.assign(editando, campos);
  else v.plano.push(Object.assign({ id: uid(), criadoPorVoce: true }, campos));
  cacheLocal(); notificar();
  dlg.close();
  toast(editando ? "Item ajustado" : "Item adicionado ao plano");
});

document.getElementById("i-cancelar").addEventListener("click", function(){ dlg.close(); });
document.getElementById("i-excluir").addEventListener("click", function(){
  var v = veiculo();
  if (!v || !editando) return;
  if (confirm("Tirar “" + editando.item + "” do plano? O histórico de trocas dele continua guardado.")){
    v.plano = v.plano.filter(function(p){ return p.id !== editando.id; });
    cacheLocal(); notificar();
    dlg.close();
    toast("Item removido do plano");
  }
});

document.getElementById("add-item-plano").addEventListener("click", function(){ abrirItem(null); });
document.getElementById("refazer-plano").addEventListener("click", function(){
  var v = veiculo(); if (!v) return;
  if (!confirm("Refazer o plano a partir do modelo e do perfil? Os itens que você criou e os intervalos que você ajustou são mantidos; o resto volta ao padrão.")) return;
  v.plano = reconstruirPlano(v.plano, v.perfil, v.modeloId);
  cacheLocal(); notificar();
  toast("Plano refeito");
});

document.addEventListener("click", function(e){
  var b = e.target.closest("[data-item-plano]");
  if (b) abrirItem(b.dataset.itemPlano);
});

export { renderPlano, abrirItem };
