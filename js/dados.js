/* dados.js
   Estado do app, gravação no aparelho, backup/restauração e leitura de CSV.
   Tudo fica no localStorage deste navegador e só sai daqui nos arquivos que
   você mesmo baixa. Um app, vários veículos; cada veículo tem o seu plano,
   o seu histórico e os seus abastecimentos. */

import { num, chave, hoje, fmtData, baixarArquivo, toast, uid } from './util.js';
import { montarPlano } from './planos/montar.js';

var CHAVE = "garagem-v2";
var CHAVE_ANTIGA = "garagem-livina-v1";

var state = { versao:2, veiculoAtivo:"", veiculos:[] };
var armazenamentoOk = true;

/* Quem quiser saber que os dados mudaram se inscreve aqui. */
var ouvintes = [];
function aoMudar(fn){ ouvintes.push(fn); }
function notificar(){ ouvintes.forEach(function(fn){ fn(); }); }

/* ---------- veículo ativo ---------- */
function veiculo(){
  var v = null;
  state.veiculos.forEach(function(x){ if (x.id === state.veiculoAtivo) v = x; });
  if (!v && state.veiculos.length){ v = state.veiculos[0]; state.veiculoAtivo = v.id; }
  return v;
}
function veiculoNovo(dados){
  dados = dados || {};
  var perfil = Object.assign({ combustivel:"flex", cambio:"manual", sincronismo:"naosei", usoSevero:false }, dados.perfil || {});
  return {
    id: uid(),
    apelido: dados.apelido || "Meu carro",
    marca: dados.marca || "",
    modelo: dados.modelo || "",
    ano: dados.ano || "",
    placa: dados.placa || "",
    perfil: perfil,
    modeloId: dados.modeloId || "",
    kmAtual: num(dados.kmAtual),
    atualizadoEm: hoje(),
    ultimoBackup: "",
    plano: montarPlano(perfil, dados.modeloId || ""),
    manut: [],
    abast: []
  };
}
function criarVeiculo(dados){
  var v = veiculoNovo(dados);
  state.veiculos.push(v);
  state.veiculoAtivo = v.id;
  cacheLocal(); notificar();
  return v;
}
function selecionarVeiculo(id){
  state.veiculoAtivo = id;
  cacheLocal(); notificar();
}
function excluirVeiculo(id){
  state.veiculos = state.veiculos.filter(function(v){ return v.id !== id; });
  if (state.veiculoAtivo === id) state.veiculoAtivo = state.veiculos.length ? state.veiculos[0].id : "";
  cacheLocal(); notificar();
}
function salvarVeiculo(campos){
  var v = veiculo(); if (!v) return;
  Object.assign(v, campos || {});
  v.atualizadoEm = hoje();
  cacheLocal(); notificar();
}

/* ---------- gravação ---------- */
function cacheLocal(){
  try { localStorage.setItem(CHAVE, JSON.stringify(state)); armazenamentoOk = true; }
  catch(e){ armazenamentoOk = false; }
}
function lerLocal(){
  try {
    localStorage.setItem(CHAVE + "-teste", "1");
    localStorage.removeItem(CHAVE + "-teste");
  } catch(e){ armazenamentoOk = false; }

  var bruto = null;
  try { bruto = localStorage.getItem(CHAVE); } catch(e){}
  if (bruto){
    try {
      var d = JSON.parse(bruto);
      if (d && Array.isArray(d.veiculos)){
        state.veiculos = d.veiculos;
        state.veiculoAtivo = d.veiculoAtivo || (d.veiculos[0] && d.veiculos[0].id) || "";
      }
    } catch(e){}
  }
  if (!state.veiculos.length) migrarVersaoAntiga();
  // Garante que todo veículo tem plano (arquivo antigo, ou plano apagado à mão).
  state.veiculos.forEach(function(v){
    if (!Array.isArray(v.plano) || !v.plano.length) v.plano = montarPlano(v.perfil, v.modeloId);
  });
}

/* O app antigo guardava um veículo só, numa outra chave. Traz tudo para cá. */
function migrarVersaoAntiga(){
  var bruto = null;
  try { bruto = localStorage.getItem(CHAVE_ANTIGA); } catch(e){}
  if (!bruto) return;
  try {
    var d = JSON.parse(bruto);
    var v = veiculoNovo({
      apelido: "Livina", marca:"Nissan", modelo:"Grand Livina", ano:"2013",
      modeloId: "nissan-grand-livina-2013",
      perfil: { combustivel:"flex", cambio:"manual", sincronismo:"corrente",
                usoSevero: !!(d.perfil && d.perfil.usoSevero) },
      kmAtual: d.perfil ? d.perfil.kmAtual : 0
    });
    v.manut = Array.isArray(d.manut) ? d.manut : [];
    v.abast = Array.isArray(d.abast) ? d.abast : [];
    state.veiculos.push(v);
    state.veiculoAtivo = v.id;
    cacheLocal();
  } catch(e){}
}

function salvarPerfil(){
  var v = veiculo(); if (!v) return;
  v.atualizadoEm = hoje();
  cacheLocal(); notificar();
}
function gravar(col, obj){
  var v = veiculo(); if (!v) return;
  var lista = col === "manutencoes" ? v.manut : v.abast;
  var i = -1, k;
  for (k = 0; k < lista.length; k++) if (lista[k].id === obj.id) i = k;
  if (i >= 0) lista[i] = obj; else lista.push(obj);
  cacheLocal(); notificar();
}
function apagar(col, id){
  var v = veiculo(); if (!v) return;
  var lista = col === "manutencoes" ? v.manut : v.abast;
  for (var k = lista.length - 1; k >= 0; k--) if (lista[k].id === id) lista.splice(k, 1);
  cacheLocal(); notificar();
}

/* ---------- backup ---------- */
function fazerBackup(){
  var pacote = {
    app: "garagem", versao: 2, gerado: new Date().toISOString(),
    veiculos: state.veiculos
  };
  var nome = "garagem-backup-" + hoje() + ".json";
  if (baixarArquivo(nome, JSON.stringify(pacote, null, 2), "application/json")){
    state.veiculos.forEach(function(v){ v.ultimoBackup = hoje(); });
    cacheLocal(); notificar();
    toast("Backup salvo em Downloads");
  }
}
function aplicarBackup(texto){
  var d;
  try { d = JSON.parse(texto); } catch(e){ toast("Esse arquivo não é um backup válido."); return; }

  // Backup do app antigo, de um veículo só.
  if (d && !Array.isArray(d.veiculos) && (Array.isArray(d.manut) || Array.isArray(d.abast))){
    d = { veiculos: [ Object.assign(veiculoNovo({
            apelido:"Livina", marca:"Nissan", modelo:"Grand Livina", ano:"2013",
            modeloId:"nissan-grand-livina-2013",
            perfil:{ combustivel:"flex", cambio:"manual", sincronismo:"corrente",
                     usoSevero: !!(d.perfil && d.perfil.usoSevero) },
            kmAtual: d.perfil ? d.perfil.kmAtual : 0
          }), { manut: d.manut || [], abast: d.abast || [] }) ] };
  }
  if (!d || !Array.isArray(d.veiculos)){ toast("Esse arquivo não é um backup da Garagem."); return; }

  var novos = 0, atualizados = 0, veiculosNovos = 0;
  d.veiculos.forEach(function(vb){
    if (!vb || !vb.id) return;
    var alvo = null;
    state.veiculos.forEach(function(v){ if (v.id === vb.id) alvo = v; });
    if (!alvo){
      alvo = Object.assign(veiculoNovo(vb), { id: vb.id, plano: vb.plano || montarPlano(vb.perfil, vb.modeloId), manut:[], abast:[] });
      state.veiculos.push(alvo);
      veiculosNovos++;
    }
    ["manut","abast"].forEach(function(col){
      (vb[col] || []).forEach(function(r){
        if (!r || !r.id) return;
        var achou = -1, i;
        for (i = 0; i < alvo[col].length; i++) if (alvo[col][i].id === r.id) achou = i;
        if (achou >= 0){ alvo[col][achou] = r; atualizados++; }
        else { alvo[col].push(r); novos++; }
      });
    });
    if (num(vb.kmAtual) > num(alvo.kmAtual)) alvo.kmAtual = num(vb.kmAtual);
  });
  if (!state.veiculoAtivo && state.veiculos.length) state.veiculoAtivo = state.veiculos[0].id;
  cacheLocal(); notificar();
  toast((veiculosNovos ? veiculosNovos + " veículo(s), " : "") + novos + " registro(s) novo(s), " + atualizados + " atualizado(s)");
}

/* ---------- importar CSV ---------- */
function lerCSV(texto){
  texto = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var primeira = texto.split("\n")[0] || "";
  var sep = (primeira.split(";").length >= primeira.split(",").length) ? ";" : ",";
  var linhas = [], campo = "", linha = [], aspas = false, i, c;
  for (i = 0; i < texto.length; i++){
    c = texto[i];
    if (aspas){
      if (c === '"'){ if (texto[i+1] === '"'){ campo += '"'; i++; } else aspas = false; }
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep){ linha.push(campo); campo = ""; }
    else if (c === "\n"){ linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else campo += c;
  }
  if (campo !== "" || linha.length){ linha.push(campo); linhas.push(linha); }
  return linhas.filter(function(l){ return l.some(function(x){ return String(x).trim() !== ""; }); });
}
function normal(s){
  return String(s||"").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ").trim();
}
function numBR(s){
  s = String(s==null?"":s).replace(/[R$\s]/g,"").trim();
  if (!s) return 0;
  if (s.indexOf(",") >= 0) s = s.replace(/\./g,"").replace(",",".");
  var n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
function dataBR(s){
  s = String(s||"").trim();
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return m[3] + "-" + String(m[2]).padStart(2,"0") + "-" + String(m[1]).padStart(2,"0");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}
function importarCSV(texto){
  var v = veiculo();
  if (!v) return { erro: "Cadastre um veículo antes de importar." };
  var linhas = lerCSV(texto);
  if (linhas.length < 2) return { erro: "Arquivo vazio ou sem linhas de dados." };

  var cab = linhas[0].map(normal), col = {};
  cab.forEach(function(h, i){ col[h] = i; });
  function pega(l, nomes){
    for (var k = 0; k < nomes.length; k++){
      var idx = col[normal(nomes[k])];
      if (idx != null && l[idx] != null) return String(l[idx]).trim();
    }
    return "";
  }
  var ehAbast = col["litros"] != null;
  var novos = 0, repetidos = 0, ignorados = 0;

  linhas.slice(1).forEach(function(l){
    if (ehAbast){
      var a = {
        id: uid(),
        data: dataBR(pega(l, ["Data"])),
        km: Math.round(numBR(pega(l, ["Km","Km no painel","Quilometragem"]))),
        litros: numBR(pega(l, ["Litros"])),
        valor: numBR(pega(l, ["Valor (R$)","Valor","Valor total"])),
        combustivel: pega(l, ["Combustível","Combustivel"]) || "Gasolina",
        posto: pega(l, ["Posto"]),
        cheio: /^(sim|s|true|x|1)$/i.test(pega(l, ["Tanque cheio","Cheio"]) || "sim")
      };
      if (!a.km || !a.litros){ ignorados++; return; }
      var jaA = v.abast.some(function(x){
        return x.data === a.data && num(x.km) === a.km && Math.abs(num(x.litros) - a.litros) < 0.01;
      });
      if (jaA){ repetidos++; return; }
      v.abast.push(a); novos++;
    } else {
      var item = pega(l, ["Peça/serviço","Peca servico","Peça ou serviço","Item","Serviço","Peça"]);
      if (!item){ ignorados++; return; }
      var m = {
        id: uid(),
        data: dataBR(pega(l, ["Data"])),
        km: Math.round(numBR(pega(l, ["Km","Km no serviço","Quilometragem"]))),
        item: item,
        categoria: pega(l, ["Categoria"]) || "Outro",
        oficina: pega(l, ["Oficina"]),
        custoPecas: numBR(pega(l, ["Peças (R$)","Pecas","Peças","Custo das peças"])),
        custoMaoObra: numBR(pega(l, ["Mão de obra (R$)","Mao de obra","Mão de obra"])),
        obs: pega(l, ["Observações","Observacoes","Obs"]),
        proxKm: Math.round(numBR(pega(l, ["Próx. km","Prox km","Próxima km"]))),
        proxData: dataBR(pega(l, ["Próx. data","Prox data","Próxima data"]))
      };
      if (!m.custoPecas && !m.custoMaoObra) m.custoPecas = numBR(pega(l, ["Total (R$)","Total","Custo"]));
      var jaM = v.manut.some(function(x){
        return x.data === m.data && num(x.km) === m.km && chave(x.item) === chave(m.item);
      });
      if (jaM){ repetidos++; return; }
      v.manut.push(m); novos++;
    }
  });

  if (novos){
    var maior = 0;
    v.manut.forEach(function(x){ if (num(x.km) > maior) maior = num(x.km); });
    v.abast.forEach(function(x){ if (num(x.km) > maior) maior = num(x.km); });
    if (maior > num(v.kmAtual)) v.kmAtual = maior;
    cacheLocal();
  }
  notificar();
  return { tipo: ehAbast ? "abastecimentos" : "serviços", novos:novos, repetidos:repetidos, ignorados:ignorados };
}

export {
  state, armazenamentoOk, aoMudar, notificar, cacheLocal, lerLocal,
  veiculo, criarVeiculo, selecionarVeiculo, excluirVeiculo, salvarVeiculo,
  salvarPerfil, gravar, apagar, fazerBackup, aplicarBackup, importarCSV
};
