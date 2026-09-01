/* ui-veiculos.js
   Barra de veículos no topo e a janela de cadastro/edição.
   É aqui que o perfil do carro vira um plano de manutenção. */

import { state, veiculo, criarVeiculo, selecionarVeiculo, excluirVeiculo, salvarVeiculo } from './dados.js';
import { PERGUNTAS_PERFIL } from './planos/base.js';
import { listaModelos, montarPlano, reconstruirPlano } from './planos/montar.js';
import { esc, num, toast } from './util.js';

var dlg = document.getElementById("dlg-veiculo");
var form = document.getElementById("form-veiculo");
var editando = null;

var ROTULO_PERFIL = {
  flex:"flex", gasolina:"gasolina", diesel:"diesel", hibrido:"híbrido",
  manual:"câmbio manual", automatico:"câmbio automático", cvt:"CVT", automatizado:"câmbio automatizado",
  corrente:"corrente de comando", correia:"correia dentada", naosei:"sincronismo a confirmar"
};

/* ---------- topo ---------- */
function renderVeiculo(){
  var v = veiculo(); if (!v) return;
  var sel = document.getElementById("sel-veiculo");
  sel.innerHTML = state.veiculos.map(function(x){
    return '<option value="'+esc(x.id)+'"'+(x.id === v.id ? " selected" : "")+'>'+esc(x.apelido)+'</option>';
  }).join("");
  sel.style.display = state.veiculos.length > 1 ? "" : "none";

  document.getElementById("veic-nome").textContent = v.apelido;
  var ficha = [v.marca, v.modelo, v.ano].filter(Boolean).join(" ");
  var perfil = [v.perfil.combustivel, v.perfil.cambio, v.perfil.sincronismo]
    .map(function(x){ return ROTULO_PERFIL[x] || ""; }).filter(Boolean).join(" · ");
  document.getElementById("veic-sub").textContent =
    [ficha, perfil, v.placa, v.perfil.usoSevero ? "uso severo" : ""].filter(Boolean).join(" · ");
}

/* ---------- janela ---------- */
function montarCamposPerfil(perfil){
  document.getElementById("v-perfil").innerHTML = PERGUNTAS_PERFIL.map(function(q){
    return '<div class="field"><label for="v-'+q.campo+'">'+esc(q.rotulo)+'</label>'+
      '<select id="v-'+q.campo+'">'+
        q.opcoes.map(function(o){
          return '<option value="'+esc(o.valor)+'"'+((perfil[q.campo]||q.padrao) === o.valor ? " selected" : "")+'>'+esc(o.texto)+'</option>';
        }).join("")+
      '</select>'+
      (q.ajuda ? '<span class="helper">'+esc(q.ajuda)+'</span>' : '')+
    '</div>';
  }).join("");
}
function lerPerfilDaTela(){
  var p = {};
  PERGUNTAS_PERFIL.forEach(function(q){
    var el = document.getElementById("v-" + q.campo);
    p[q.campo] = el ? el.value : q.padrao;
  });
  p.usoSevero = document.getElementById("v-severo").checked;
  return p;
}

function montarListaModelos(escolhido){
  var opcoes = '<option value="">Não está na lista — usar o perfil abaixo</option>';
  opcoes += listaModelos().map(function(m){
    return '<option value="'+esc(m.id)+'"'+(m.id === escolhido ? " selected" : "")+'>'+esc(m.nome)+'</option>';
  }).join("");
  document.getElementById("v-modelo-lib").innerHTML = opcoes;
  ajudaModelo();
}
function ajudaModelo(){
  var id = document.getElementById("v-modelo-lib").value;
  var m = listaModelos().filter(function(x){ return x.id === id; })[0];
  document.getElementById("v-modelo-ajuda").textContent = m
    ? m.detalhe + " — intervalos conferidos em: " + m.fonte
    : "Sem o modelo na lista, o plano é montado pelas respostas do perfil, com os intervalos típicos dos manuais. Você pode ajustar item a item depois.";
  // Um modelo conhecido já sabe parte do perfil.
  if (m && m.perfil){
    Object.keys(m.perfil).forEach(function(c){
      var el = document.getElementById("v-" + c);
      if (el) el.value = m.perfil[c];
    });
  }
}

function abrirVeiculo(id){
  editando = null;
  state.veiculos.forEach(function(v){ if (v.id === id) editando = v; });
  var v = editando || {};
  document.getElementById("dlg-veiculo-title").textContent = editando ? "Editar veículo" : "Cadastrar veículo";
  document.getElementById("v-excluir").hidden = !editando || state.veiculos.length < 2;
  document.getElementById("v-apelido").value = v.apelido || "";
  document.getElementById("v-marca").value = v.marca || "";
  document.getElementById("v-modelo").value = v.modelo || "";
  document.getElementById("v-ano").value = v.ano || "";
  document.getElementById("v-placa").value = v.placa || "";
  document.getElementById("v-km").value = v.kmAtual != null ? v.kmAtual : "";
  document.getElementById("v-severo").checked = !!(v.perfil && v.perfil.usoSevero);
  montarCamposPerfil(v.perfil || {});
  montarListaModelos(v.modeloId || "");
  dlg.showModal();
  document.getElementById("v-apelido").focus();
}

document.getElementById("v-modelo-lib").addEventListener("change", function(){
  ajudaModelo();
  var m = listaModelos().filter(function(x){ return x.id === document.getElementById("v-modelo-lib").value; })[0];
  if (m && !document.getElementById("v-apelido").value){
    var partes = m.nome.split(" ");
    document.getElementById("v-marca").value = partes[0] || "";
  }
});

form.addEventListener("submit", function(e){
  e.preventDefault();
  var apelido = document.getElementById("v-apelido").value.trim();
  if (!apelido) return;
  var dados = {
    apelido: apelido,
    marca: document.getElementById("v-marca").value.trim(),
    modelo: document.getElementById("v-modelo").value.trim(),
    ano: document.getElementById("v-ano").value.trim(),
    placa: document.getElementById("v-placa").value.trim().toUpperCase(),
    kmAtual: Math.round(num(document.getElementById("v-km").value)),
    modeloId: document.getElementById("v-modelo-lib").value,
    perfil: lerPerfilDaTela()
  };

  if (!editando){
    criarVeiculo(dados);
    toast("Veículo cadastrado — o plano de manutenção já está montado");
  } else {
    var mudouPlano = editando.modeloId !== dados.modeloId ||
      PERGUNTAS_PERFIL.some(function(q){ return editando.perfil[q.campo] !== dados.perfil[q.campo]; });
    var plano = mudouPlano ? reconstruirPlano(editando.plano, dados.perfil, dados.modeloId) : editando.plano;
    salvarVeiculo(Object.assign(dados, { plano: plano }));
    toast(mudouPlano ? "Veículo salvo e plano refeito pelo novo perfil" : "Veículo salvo");
  }
  dlg.close();
});

document.getElementById("v-cancelar").addEventListener("click", function(){ dlg.close(); });
document.getElementById("v-excluir").addEventListener("click", function(){
  if (!editando) return;
  var n = editando.manut.length + editando.abast.length;
  if (confirm("Excluir “" + editando.apelido + "” e os " + n + " registro(s) dele? Isso não tem volta — salve um backup antes se tiver dúvida.")){
    excluirVeiculo(editando.id);
    dlg.close();
    toast("Veículo excluído");
  }
});

document.getElementById("sel-veiculo").addEventListener("change", function(e){ selecionarVeiculo(e.target.value); });
document.getElementById("btn-editar-veiculo").addEventListener("click", function(){ abrirVeiculo(state.veiculoAtivo); });
document.getElementById("btn-novo-veiculo").addEventListener("click", function(){ abrirVeiculo(null); });
document.getElementById("primeiro-veiculo").addEventListener("click", function(){ abrirVeiculo(null); });

export { renderVeiculo, abrirVeiculo };
