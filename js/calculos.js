/* calculos.js
   Odômetro, alertas de próxima troca e consumo. Só conta, não desenha nada.
   Tudo aqui olha para o veículo ativo. */

import { veiculo } from './dados.js';
import { num, chave, diasAte, somaMeses, fmtKm } from './util.js';

function planoDoVeiculo(){
  var v = veiculo();
  return (v && Array.isArray(v.plano)) ? v.plano.filter(function(p){ return p.ativo !== false; }) : [];
}

/* Uso severo encurta os intervalos dos itens que preveem isso. */
function intervalo(p){
  var v = veiculo();
  var sev = !!(v && v.perfil && v.perfil.usoSevero);
  return { km: sev && p.sevKm ? p.sevKm : (p.km || 0),
           meses: sev && p.sevMeses ? p.sevMeses : (p.meses || 0) };
}
function textoIntervalo(p){
  if (p.fonte === "semtroca") return "sem troca programada";
  var iv = intervalo(p), partes = [];
  if (iv.km) partes.push(fmtKm(iv.km) + " km");
  if (iv.meses) partes.push(iv.meses >= 12 && iv.meses % 12 === 0
      ? (iv.meses/12) + (iv.meses === 12 ? " ano" : " anos")
      : iv.meses + " meses");
  return partes.join(" ou ") || "conforme desgaste";
}

function kmAtual(){
  var v = veiculo(); if (!v) return 0;
  var k = num(v.kmAtual);
  v.manut.forEach(function(m){ if (num(m.km) > k) k = num(m.km); });
  v.abast.forEach(function(a){ if (num(a.km) > k) k = num(a.km); });
  return k;
}

/* Último registro de cada peça (por km, desempatando pela data). */
function ultimoRegistro(){
  var v = veiculo(), porPeca = {};
  if (!v) return porPeca;
  v.manut.forEach(function(m){
    var k = chave(m.item), a = porPeca[k];
    if (!a || num(m.km) > num(a.km) || (num(m.km) === num(a.km) && (m.data||"") > (a.data||""))) porPeca[k] = m;
  });
  return porPeca;
}

/* Um item por peça: os itens do plano do veículo + tudo que você registrou.
   A próxima troca sai do que você definiu no registro; se não definiu, do plano;
   se nunca registrou, é estimada a partir do odômetro. */
function alertas(){
  var reg = ultimoRegistro(), km = kmAtual(), vistos = {}, out = [];

  function montar(nome, p, m){
    var iv = p ? intervalo(p) : { km:0, meses:0 };
    var proxKm = null, proxData = "", origem = "registro";
    if (m && (m.proxKm || m.proxData)){
      proxKm = m.proxKm ? num(m.proxKm) : null;
      proxData = m.proxData || "";
    } else if (m && p && p.fonte !== "semtroca"){
      proxKm = iv.km ? num(m.km) + iv.km : null;
      proxData = iv.meses ? somaMeses(m.data, iv.meses) : "";
      origem = "plano";
    } else if (!m && p && p.fonte !== "semtroca" && iv.km && km > 0){
      proxKm = Math.floor(km / iv.km) * iv.km + iv.km;
      origem = "estimado";
    } else if (!m){
      origem = "sem-registro";
    }
    var faltaKm = proxKm !== null ? proxKm - km : null;
    var faltaDias = proxData ? diasAte(proxData) : null;
    var nivel = "ok";
    if (origem === "sem-registro") nivel = "none";
    else if ((faltaKm !== null && faltaKm <= 0) || (faltaDias !== null && faltaDias <= 0)) nivel = "crit";
    else if ((faltaKm !== null && faltaKm <= 1000) || (faltaDias !== null && faltaDias <= 30)) nivel = "warn";
    var ordem = Math.min(faltaKm === null ? 1e9 : faltaKm, faltaDias === null ? 1e9 : faltaDias * 40);
    if (origem === "sem-registro") ordem = 2e9;
    return { nome:nome, p:p, m:m, proxKm:proxKm, proxData:proxData, origem:origem,
             faltaKm:faltaKm, faltaDias:faltaDias, nivel:nivel, ordem:ordem };
  }

  planoDoVeiculo().forEach(function(p){
    if (p.fonte === "semtroca") return;
    var k = chave(p.item);
    vistos[k] = true;
    out.push(montar(p.item, p, reg[k] || null));
  });
  Object.keys(reg).forEach(function(k){
    if (vistos[k]) return;
    var m = reg[k];
    if (!m.proxKm && !m.proxData) return; // peça avulsa sem próxima definida não vira alerta
    out.push(montar(m.item, null, m));
  });
  return out.sort(function(a,b){ return a.ordem - b.ordem; });
}

/* km/l entre dois abastecimentos de tanque cheio consecutivos. */
function consumos(){
  var v = veiculo(); if (!v) return [];
  var lista = v.abast.slice().sort(function(a,b){ return num(a.km) - num(b.km); });
  var out = [], ultimoCheio = null;
  lista.forEach(function(a){
    if (a.cheio && ultimoCheio && num(a.km) > num(ultimoCheio.km) && num(a.litros) > 0){
      out.push({ id:a.id, kmRodados:num(a.km) - num(ultimoCheio.km), kmL:(num(a.km) - num(ultimoCheio.km)) / num(a.litros) });
    }
    if (a.cheio) ultimoCheio = a;
  });
  return out;
}

function custoPorKm(){
  var v = veiculo(); if (!v || v.abast.length < 2) return null;
  var lista = v.abast.slice().sort(function(a,b){ return num(a.km) - num(b.km); });
  var rodados = num(lista[lista.length-1].km) - num(lista[0].km);
  if (rodados <= 0) return null;
  var gasto = 0;
  lista.slice(1).forEach(function(a){ gasto += num(a.valor); });
  return gasto ? gasto / rodados : null;
}

export { intervalo, textoIntervalo, kmAtual, ultimoRegistro, alertas, consumos, custoPorKm, planoDoVeiculo };
