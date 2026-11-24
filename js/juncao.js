/* juncao.js
   Junta duas versões dos mesmos dados (duas janelas, ou o aparelho e a nuvem).
   Só conta: não conhece tela, localStorage nem rede. */

import { chave } from './texto.js';

function porId(lista){
  var m = {};
  (Array.isArray(lista) ? lista : []).forEach(function(x){ if (x && x.id) m[x.id] = x; });
  return m;
}

/* Texto que não muda com a ordem dos campos nem com a ordem dos itens. */
function canonico(x){
  function ordenar(v){
    if (Array.isArray(v)){
      var l = v.map(ordenar);
      return l.every(function(i){ return i && i.id; })
        ? l.sort(function(a,b){ return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }) : l;
    }
    if (v && typeof v === "object"){
      var o = {};
      Object.keys(v).sort().forEach(function(k){ o[k] = ordenar(v[k]); });
      return o;
    }
    return v;
  }
  return JSON.stringify(ordenar(x));
}
function igual(a, b){ return canonico(a) === canonico(b); }

/* Três versões de uma lista: como era (antes), a minha e a outra. */
function juntarLista(antes, minha, outra, juntarItem){
  var a = porId(antes), m = porId(minha), o = porId(outra), out = [];
  (minha || []).forEach(function(x){
    if (!x) return;
    if (!o[x.id]){
      // Excluído do outro lado: sai, a não ser que tenha sido criado ou mudado aqui.
      if (!a[x.id] || !igual(a[x.id], x)) out.push(x);
    } else out.push(juntarItem(a[x.id], x, o[x.id]));
  });
  (outra || []).forEach(function(x){
    if (!x || m[x.id]) return;
    if (!a[x.id] || !igual(a[x.id], x)) out.push(x);
  });
  return out;
}

/* Vale quem mudou desde "antes". Se os dois mudaram, o registro mais novo; no empate, o meu. */
function escolher(antes, meu, outro){
  if (antes !== undefined && igual(antes, meu)) return outro;
  if (antes !== undefined && igual(antes, outro)) return meu;
  if (antes === undefined && meu && outro && meu.fonte !== outro.fonte){
    if (outro.fonte === "voce") return outro;
    if (meu.fonte === "voce") return meu;
  }
  if (meu && outro && (outro.mod || "") > (meu.mod || "")) return outro;
  return meu;
}
function juntarVeiculo(antes, meu, outro){
  var semAntes = !antes;
  antes = antes || {};
  var v = {};
  Object.keys(Object.assign({}, outro, meu)).forEach(function(c){
    v[c] = (c === "manut" || c === "abast" || c === "plano")
      ? juntarLista(antes[c], meu[c], outro[c], escolher)
      : escolher(antes[c], meu[c], outro[c]);
  });
  if (semAntes) v.kmAtual = Math.max(Number(meu.kmAtual) || 0, Number(outro.kmAtual) || 0);
  return v;
}
function juntarVeiculos(antes, meus, outros){ return juntarLista(antes, meus, outros, juntarVeiculo); }

/* ---------- mesmo carro cadastrado em dois aparelhos ---------- */
function placa(v){ return String(v.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function pareceMesmo(a, b){
  if (placa(a) && placa(b)) return placa(a) === placa(b);
  function txt(v){ return chave([v.marca, v.modelo, v.ano].join(" ")); }
  if (a.modelo && b.modelo && txt(a) === txt(b)) return true;
  if (a.modeloId && a.modeloId === b.modeloId) return true;
  return !!chave(a.apelido) && chave(a.apelido) === chave(b.apelido);
}
/* Pares [daqui, da nuvem] que parecem o mesmo carro com identificações diferentes. */
function paresParecidos(locais, remotos){
  var l = porId(locais), r = porId(remotos), usados = {}, out = [];
  locais.forEach(function(a){
    if (r[a.id]) return;
    var b = remotos.filter(function(x){ return !l[x.id] && !usados[x.id] && pareceMesmo(a, x); })[0];
    if (b){ usados[b.id] = true; out.push([a, b]); }
  });
  return out;
}
/* Dá ao carro daqui, e aos registros repetidos, a identificação que já está na nuvem. */
function adotar(local, remoto){
  function trocar(lista, outra, mesma){
    var usados = {}, o = porId(outra);
    (lista || []).forEach(function(x){ if (o[x.id]) usados[x.id] = true; });
    return (lista || []).map(function(x){
      if (o[x.id]) return x;
      var r = (outra || []).filter(function(y){ return !usados[y.id] && mesma(x, y); })[0];
      if (!r) return x;
      usados[r.id] = true;
      return Object.assign({}, x, { id: r.id });
    });
  }
  function n(x){ return Number(x) || 0; }
  return Object.assign({}, local, {
    id: remoto.id,
    manut: trocar(local.manut, remoto.manut, function(x, y){
      return x.data === y.data && n(x.km) === n(y.km) && chave(x.item) === chave(y.item); }),
    abast: trocar(local.abast, remoto.abast, function(x, y){
      return x.data === y.data && n(x.km) === n(y.km) && Math.abs(n(x.litros) - n(y.litros)) < 0.01; }),
    plano: trocar(local.plano, remoto.plano, function(x, y){ return chave(x.item) === chave(y.item); })
  });
}

export { canonico, igual, juntarVeiculos, paresParecidos, adotar };
