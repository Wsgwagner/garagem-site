/* ui-flex.js
   Etanol ou gasolina: compara pelo consumo real do carro, com os preços de hoje. */

import { veiculo } from './dados.js';
import { consumosPorCombustivel, compararFlex, ultimoPreco } from './contas.js';
import { esc, num, fmtBRL, fmtDec } from './util.js';

var carro = null;
function el(id){ return document.getElementById(id); }

function atualizar(){
  var v = veiculo(); if (!v || !el("flex-resultado")) return;
  var c = consumosPorCombustivel(v.abast);
  var r = compararFlex(c, num(el("flex-etanol").value), num(el("flex-gasolina").value));
  var h = "";
  if (r.preco){
    h += '<p class="flex-resposta"><b>' + (r.melhor === "igual" ? "Tanto faz: o custo é praticamente o mesmo"
        : "Compensa " + (r.melhor === "etanol" ? "etanol" : "gasolina")) + '</b>' +
      (r.economia100 && r.melhor !== "igual" ? ' · economia de ' + fmtBRL(r.economia100) + ' a cada 100 km' : '') + '</p>' +
      '<p class="helper">O etanol está a ' + fmtDec(r.relacao * 100, 1) + '% do preço da gasolina. Para o seu carro, compensa até ' +
      fmtDec(r.limite * 100, 1) + '%' + (r.real ? "" : " (regra geral)") + '.</p>';
  } else h += '<p class="helper">Informe os dois preços do posto.</p>';

  function trecho(x, nome){
    return nome + ": " + (x ? fmtDec(x.kmL, 1) + " km/l em " + x.trechos + (x.trechos === 1 ? " trecho" : " trechos") : "ainda sem medição");
  }
  h += '<p class="helper">' + esc(trecho(c.etanol, "Etanol")) + ' · ' + esc(trecho(c.gasolina, "Gasolina")) + '.' +
    (r.real ? "" : " Para usar o consumo do seu carro, encha o tanque duas vezes seguidas com cada combustível. Até lá vale a regra geral de 70%.") + '</p>';
  el("flex-resultado").innerHTML = h;
}

function renderFlex(){
  var box = el("flex-box"), v = veiculo();
  if (!box || !v) return; // página antiga em cache: o app abre sem esta parte
  box.hidden = !v.perfil || v.perfil.combustivel !== "flex";
  if (carro !== v.id){
    carro = v.id;
    ["etanol","gasolina"].forEach(function(t){
      var p = ultimoPreco(v.abast, t);
      el("flex-" + t).value = p ? p.toFixed(2) : "";
    });
  }
  atualizar();
}
document.addEventListener("input", function(e){
  if (e.target.id === "flex-etanol" || e.target.id === "flex-gasolina") atualizar();
});

export { renderFlex };
